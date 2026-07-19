import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { supabase } from "@/lib/supabase";
import { extractTextFromPdf } from "@/lib/pdf-parser";
import { generateEmbeddingsBatch, generateSummary, generateTopics } from "@/lib/ai";

export const processPdf = inngest.createFunction(
  { id: "process-pdf", triggers: [{ event: "pdf.uploaded" }] },
  async ({ event, step }) => {
    const { documentId, storagePath } = event.data;

    // Step 1: Download & Parse
    const chunks = await step.run("download-and-parse", async () => {
      // update status
      await supabase.from("documents").update({ 
        processing_stage: "Extracting text...", 
        progress: 25 
      }).eq("id", documentId);

      const { data, error } = await supabase.storage.from("pdfs").download(storagePath);
      if (error || !data) throw new Error("Failed to download PDF from storage: " + error?.message);

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const parsedChunks = await extractTextFromPdf(buffer);
      if (parsedChunks.length === 0) throw new Error("No text extracted");
      return parsedChunks;
    });

    // Step 2: Generate Embeddings
    await step.run("generate-embeddings", async () => {
      await supabase.from("documents").update({ 
        processing_stage: "Generating vector embeddings...", 
        progress: 55 
      }).eq("id", documentId);

      const fullTextTexts = chunks.map(c => c.text);
      
      // The generateEmbeddingsBatch returns undefined on error so we must handle that
      try {
        const embeddings = await generateEmbeddingsBatch(fullTextTexts);
        if (!embeddings) throw new Error("Embeddings generation failed.");

        const insertData = chunks.map((chunk, i) => ({
          document_id: documentId,
          page_number: chunk.pageNumber,
          chunk_text: chunk.text,
          embedding: embeddings[i]
        }));

        const { error: insertError } = await supabase.from("chunks").insert(insertData);
        if (insertError) throw new Error(`Chunk insert failed: ${insertError.message}`);
      } catch (error: any) {
        let errorMsg = error.message || "An unexpected error occurred during AI processing.";
        if (error.code === "QUOTA_EXCEEDED") {
          errorMsg = "Gemini API daily limit (1000 requests) has been exhausted.";
        } else if (error.code === "UNKNOWN" || error.message?.includes("API key")) {
          errorMsg = "The AI service encountered an error or the API key is invalid/exhausted. Please check your quota and try again after a day.";
        }

        await supabase.from("documents").update({ 
          status: "failed", 
          error_message: errorMsg 
        }).eq("id", documentId);
        
        throw new NonRetriableError(errorMsg);
      }
    });

    // Step 3: Summary & Topics
    await step.run("generate-summary-and-topics", async () => {
      await supabase.from("documents").update({ 
        processing_stage: "Creating executive summary...", 
        progress: 80 
      }).eq("id", documentId);

      const summaryChunks = [...chunks.slice(0, 3)];
      if (chunks.length > 3) summaryChunks.push(chunks[chunks.length - 1]);
      const condensedText = summaryChunks.map(c => c.text).join("\n\n");

      const [summary, topics] = await Promise.all([
        generateSummary(condensedText),
        generateTopics(condensedText)
      ]);

      await supabase.from("documents").update({ 
        status: "completed",
        processing_stage: "Ready", 
        progress: 100,
        summary: summary || "",
        topics: topics || []
      }).eq("id", documentId);
    });

    return { success: true };
  }
);
