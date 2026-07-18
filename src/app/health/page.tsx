import { supabase } from "@/lib/supabase";
import { testAIConnection } from "@/lib/ai";
import { extractTextFromPdf } from "@/lib/pdf-parser";
import { CheckCircle2, XCircle } from "lucide-react";

// Opt out of caching so we always test real connections
export const dynamic = 'force-dynamic';

export default async function HealthCheckPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <h1>404 - Not Found</h1>
      </div>
    );
  }

  const results = {
    env: false,
    supabase: false,
    pdfParser: false,
    aiConnection: false,
  };

  const logs: string[] = [];

  // 1. Check ENV
  results.env = !!process.env.NVIDIA_API_KEY && !!process.env.GEMINI_API_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (results.env) {
    logs.push("Environment variables loaded correctly.");
  } else {
    logs.push("Missing required environment variables!");
  }

  // 2. Check Supabase
  try {
    const { data, error } = await supabase.from("documents").select("id").limit(1);
    if (!error) {
      results.supabase = true;
      logs.push("Supabase connection successful.");
    } else {
      logs.push(`Supabase error: ${error.message}`);
    }
  } catch (e: any) {
    logs.push(`Supabase crash: ${e.message}`);
  }

  // 3. Check PDF Parser (dummy buffer)
  try {
    const dummyPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 21>>stream\nBT /F1 12 Tf (Test) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000192 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n262\n%%EOF"
    );
    const text = await extractTextFromPdf(dummyPdf);
    if (text) {
      results.pdfParser = true;
      logs.push("PDF Parser initialized successfully.");
    }
  } catch (e: any) {
    logs.push(`PDF Parser error: ${e.message}`);
  }

  // 4. Check AI API
  try {
    const isConnected = await testAIConnection();
    if (isConnected) {
      results.aiConnection = true;
      logs.push("AI API connection successful.");
    } else {
      logs.push("AI API responded, but connection failed.");
    }
  } catch (e: any) {
    logs.push(`AI API Error: ${e.message}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-mono">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4">
          🔧 System Health Check (Dev Only)
        </h1>

        <div className="space-y-4">
          <HealthItem label="Environment Variables" status={results.env} />
          <HealthItem label="Supabase Storage & DB" status={results.supabase} />
          <HealthItem label="PDF Extraction Engine" status={results.pdfParser} />
          <HealthItem label="NVIDIA AI Connection" status={results.aiConnection} />
        </div>

        <div className="mt-8 p-4 bg-black/50 border border-white/10 rounded-lg">
          <h2 className="text-sm text-brand mb-4 uppercase tracking-wider font-semibold">Diagnostic Logs</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            {logs.map((log, i) => (
              <li key={i}>{">"} {log}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-white/5">
      {status ? (
        <CheckCircle2 className="h-6 w-6 text-success" />
      ) : (
        <XCircle className="h-6 w-6 text-destructive" />
      )}
      <span className="text-lg text-white font-medium">{label}</span>
    </div>
  );
}
