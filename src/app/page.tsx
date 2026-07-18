"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, Server, BrainCircuit, FileSearch } from "lucide-react";
import { toast } from "sonner";

// Spring physics for all animations matching design system
const springConfig = { type: "spring" as const, stiffness: 220, damping: 24 };

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    
    if (selectedFile.type !== "application/pdf") {
      toast.error("Invalid file type. Please upload a PDF.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File is too large. Please upload a PDF under 20MB.");
      return;
    }

    setFile(selectedFile);
    setStatus("idle");
    setErrorMessage("");
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process document");
      }

      const data = await response.json();
      
      // Redirect immediately to the dashboard to show real-time progress
      router.push(`/dashboard/${data.documentId}`);

    } catch (error: any) {
      console.error("Upload error:", error);
      setStatus("failed");
      setErrorMessage(error.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Subtle Background Glows (Glassmorphism environment) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl relative z-10 flex flex-col items-center"
      >
        
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, ...springConfig }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-white/5 text-xs font-medium text-brand mb-4 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>DocLens System v1.0</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Understand complex PDFs <br />
            <span className="text-muted-foreground">in seconds, not hours.</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
            Transform long documents into structured understanding through a calm, trustworthy, AI-native experience.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="w-full relative">
          <AnimatePresence mode="wait">
            {(status === "idle" || status === "failed") && (
              <motion.div
                key="upload-zone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                transition={springConfig}
                className="w-full"
              >
                <motion.div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) handleFileChange(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  animate={{ 
                    scale: isDragging ? 1.02 : 1,
                    borderColor: isDragging ? "var(--color-brand)" : "rgba(255,255,255,0.1)",
                    backgroundColor: isDragging ? "rgba(79, 125, 255, 0.05)" : "var(--color-card)"
                  }}
                  transition={springConfig}
                  className="w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group shadow-lg"
                  style={{ boxShadow: isDragging ? "0 0 40px rgba(79, 125, 255, 0.2)" : "0 8px 24px rgba(0,0,0,0.5)" }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files?.length) handleFileChange(e.target.files[0]);
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <motion.div 
                    animate={{ y: isDragging ? -5 : 0 }}
                    className="relative z-10 flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center border border-white/5 shadow-inner">
                      <UploadCloud className={`w-8 h-8 transition-colors duration-300 ${isDragging ? "text-brand" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-white mb-1">
                        {file ? file.name : "Drop your PDF here"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Or click to browse (Max 20MB)"}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Free Tier Reality Check */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, ...springConfig }}
                  className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200/90 space-y-2 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 font-medium text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Free Tier Reality Check 💸</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 ml-1 text-xs leading-relaxed opacity-80">
                    <li><strong>The 5-Page Rule:</strong> We only process the first 5 pages of your PDF (our AI has a short attention span).</li>
                    <li><strong>The 60-Second Timeout:</strong> 15 requests per minute limit. If you see an error, stare out a window for 60 seconds.</li>
                    <li><strong>Text-Based Only:</strong> If your PDF is scanned images, the AI will confidently read absolutely nothing.</li>
                  </ul>
                </motion.div>

                {status === "failed" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-red-400 flex items-center gap-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </motion.div>
                )}

                {/* Action Button */}
                  <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!file || status === "uploading"}
                  onClick={handleUpload}
                  className={`w-full mt-6 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg
                    ${file && status !== "uploading"
                      ? "bg-brand text-white shadow-brand/25 hover:shadow-brand/40" 
                      : "bg-secondary text-muted-foreground cursor-not-allowed border border-white/5"
                    }`}
                >
                  {status === "uploading" ? "Uploading..." : "Analyze Document"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
