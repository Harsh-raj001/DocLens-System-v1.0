import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { inngest } from "@/inngest/client";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    console.log(`\n--- [API PROCESS ROUTE] ---`);
    console.log(`[API] Received file: ${file.name}, size: ${file.size} bytes`);
    
    if (file.size === 0) {
      throw new Error("[API ERROR] File size is exactly 0 bytes.");
    }

    // 1. Create a unique storage path for the file
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const storagePath = `${fileName}`;

    // 2. Upload to Supabase Storage (pdfs bucket)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`[API ERROR] Failed to upload PDF to storage: ${uploadError.message}`);
    }

    // 3. Create the document record in Supabase database
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({ 
        name: file.name, 
        status: "processing",
        processing_stage: "Upload",
        progress: 0
      })
      .select("id")
      .single();

    if (docError || !docData) {
      throw new Error(`[API ERROR] Failed to create document record: ${docError?.message}`);
    }
    const documentId = docData.id;

    // 4. Trigger the Inngest background job
    await inngest.send({
      name: "pdf.uploaded",
      data: {
        documentId,
        storagePath
      }
    });
    
    // 5. Return immediately to unblock the UI
    console.log(`[API] Returning 202 Accepted. Inngest background worker triggered.`);
    return NextResponse.json({ 
      success: true, 
      documentId: documentId,
      message: "Processing started in background"
    }, { status: 202 });
    
  } catch (error: any) {
    console.error("Error in /api/process:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during processing" },
      { status: 500 }
    );
  }
}
