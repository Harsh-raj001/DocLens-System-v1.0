import * as dotenv from "dotenv";
import { performance } from "perf_hooks";

dotenv.config({ path: ".env.local" });

// Helper to generate a dummy 10-page PDF buffer
function generateDummy10PagePDF(): Buffer {
  let pagesObj = "";
  let contents = "";
  let kids = "";
  
  for (let i = 1; i <= 10; i++) {
    const pageId = i * 2 + 1; // 3, 5, 7...
    const contentId = i * 2 + 2; // 4, 6, 8...
    
    // Create a realistic block of text (approx 1000 chars per page)
    const textChunk = "This is a sample sentence to fill up space. ".repeat(30);
    
    kids += `${pageId} 0 R `;
    
    pagesObj += `
${pageId} 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents ${contentId} 0 R>>endobj
${contentId} 0 obj<</Length ${textChunk.length + 30}>>stream
BT /F1 12 Tf (${textChunk}) Tj ET
endstream
endobj
`;
  }

  const pdfStr = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 10/Kids[${kids}]>>endobj
${pagesObj}
xref
0 1
0000000000 65535 f
trailer<</Size 1/Root 1 0 R>>
startxref
100
%%EOF`;

  return Buffer.from(pdfStr);
}

async function runProfile() {
  const { extractTextFromPdf } = await import("../src/lib/pdf-parser");
  const { generateEmbeddingsBatch, generateSummary, generateTopics } = await import("../src/lib/ai");
  const { supabase } = await import("../src/lib/supabase");

  console.log("📊 Starting Pipeline Profiling (10-Page PDF Simulation)\n");

  const timings: Record<string, number> = {};
  const tStart = performance.now();

  // 1. PDF Extraction & Chunking
  const tExtractionStart = performance.now();
  console.log("... Extracting PDF and chunking ...");
  const buffer = generateDummy10PagePDF();
  let chunks: any[] = [];
  try {
    chunks = await extractTextFromPdf(buffer);
    if (chunks.length === 0) throw new Error("0 chunks generated");
  } catch (e: any) {
    // If our dummy PDF is too hacky for pdf-parse, we'll mock the chunks
    console.log("    (Using simulated chunks due to dummy PDF parser error)");
    chunks = [];
    for (let i = 1; i <= 10; i++) {
      chunks.push({ pageNumber: i, text: "This is a sample sentence to fill up space. ".repeat(30) });
    }
  }
  timings["Extraction & Chunking"] = performance.now() - tExtractionStart;

  // 2. Database Insert (Document)
  const tDbDocStart = performance.now();
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .insert({ name: "Profile_Test.pdf", status: "processing" })
    .select("id")
    .single();
  
  if (docError) throw new Error("DB Error: " + docError.message);
  const documentId = docData.id;
  timings["DB: Insert Document"] = performance.now() - tDbDocStart;

  // 3. Embedding Generation (Batched)
  const tEmbedStart = performance.now();
  console.log(`... Generating embeddings for ${chunks.length} chunks via Batch API ...`);
  const fullTextTexts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddingsBatch(fullTextTexts);
  timings["LLM: Generate Embeddings (Batched)"] = performance.now() - tEmbedStart;

  // 4. Database Insert (Batched)
  const tDbChunksStart = performance.now();
  console.log("... Inserting chunks into Supabase sequentially (now batched) ...");
  const insertData = chunks.map((chunk, i) => ({
    document_id: documentId,
    page_number: chunk.pageNumber,
    chunk_text: chunk.text,
    embedding: embeddings[i]
  }));
  await supabase.from("chunks").insert(insertData);
  timings["DB: Insert Chunks (Batched)"] = performance.now() - tDbChunksStart;

  // 5. Summary & Topics (Parallelized)
  const tSummaryStart = performance.now();
  console.log("... Generating Summary and Topics from condensed document ...");
  const condensedText = chunks.slice(0, 3).map(c => c.text).join("\n");
  
  await Promise.all([
    generateSummary(condensedText),
    generateTopics(condensedText)
  ]);
  timings["LLM: Summary & Topics (Parallel)"] = performance.now() - tSummaryStart;

  // Cleanup DB
  await supabase.from("documents").delete().eq("id", documentId);

  const tTotal = performance.now() - tStart;

  // Output Report
  console.log("\n==================================================");
  console.log("📈 PERFORMANCE REPORT: 10-Page PDF Pipeline");
  console.log("==================================================");
  
  for (const [stage, duration] of Object.entries(timings)) {
    const percentage = ((duration / tTotal) * 100).toFixed(1);
    console.log(`${stage.padEnd(40)} | ${(duration / 1000).toFixed(2)}s\t(${percentage}%)`);
  }
  
  console.log("--------------------------------------------------");
  console.log(`TOTAL TIME                               | ${(tTotal / 1000).toFixed(2)}s\t(100.0%)`);
  console.log("==================================================\n");
}

runProfile().catch(console.error);
