import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;

    const { data, error } = await supabase
      .from("documents")
      .select("status, processing_stage, progress, error_message")
      .eq("id", documentId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
