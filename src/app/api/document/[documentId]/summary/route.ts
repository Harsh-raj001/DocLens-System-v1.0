import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const { data: document, error } = await supabase
      .from("documents")
      .select("summary, topics")
      .eq("id", documentId)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: "Document not found.", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      summary: document.summary,
      topics: document.topics
    });

  } catch (error: any) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
