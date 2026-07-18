import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateEmbedding, generateChatAnswer, AIError } from "@/lib/ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!documentId || !message) {
      return NextResponse.json({ error: "Document ID and message are required", code: "BAD_REQUEST" }, { status: 400 });
    }

    // 1. Generate an embedding for the user's question
    const queryEmbedding = await generateEmbedding(message);

    // 2. Perform a similarity search in pgvector using an RPC call.
    const { data: chunks, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      doc_id: documentId
    });

    if (error) {
       console.error("Vector search failed, falling back to basic chunk retrieval. Error:", error);
    }

    // Fallback if RPC fails or isn't created: just grab the first 5 chunks of the document
    let retrievedChunks = chunks;
    if (!retrievedChunks || retrievedChunks.length === 0) {
       const { data: fallbackChunks } = await supabase
        .from("chunks")
        .select("page_number, chunk_text")
        .eq("document_id", documentId)
        .limit(5);
       retrievedChunks = fallbackChunks || [];
    }
    
    if (retrievedChunks.length === 0) {
      return NextResponse.json({ 
        error: "We couldn't find enough information in this document to answer that question.",
        code: "EMPTY_RETRIEVAL"
      }, { status: 404 });
    }

    // 3. Construct the prompt with retrieved context
    const contextText = retrievedChunks
      .map((c: any) => `[Page ${c.page_number}]: ${c.chunk_text}`)
      .join("\n\n");

    // 4. Generate Answer
    const answer = await generateChatAnswer(contextText, message);
    
    // Extract unique page numbers from the retrieved chunks to show as sources
    const citations = Array.from(new Set(retrievedChunks.map((c: any) => c.page_number)));

    return NextResponse.json({
      answer: answer,
      citations: citations
    });

  } catch (error: any) {
    if (error instanceof AIError) {
      const statusMap = {
        "MODEL_NOT_FOUND": 503,
        "QUOTA_EXCEEDED": 429,
        "NETWORK_ERROR": 504,
        "UNKNOWN": 500
      };
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] || 500 }
      );
    }

    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Failed to generate answer", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
