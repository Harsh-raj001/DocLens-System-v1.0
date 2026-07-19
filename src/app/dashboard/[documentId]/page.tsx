"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, FileText, CheckCircle2, Loader2, Send, Sparkles, Layers, Server, BrainCircuit, FileSearch, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SummaryData {
  summary: string;
  topics: { title: string; description: string }[];
}

interface DocStatus {
  status: string;
  processing_stage: string;
  progress: number;
  error_message: string;
}

const springConfig = { type: "spring" as const, stiffness: 220, damping: 24 };

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springConfig }
};

export default function DashboardPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params);
  
  const [docStatus, setDocStatus] = useState<DocStatus | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string; citations?: number[] }[]>([]);
  const [chatting, setChatting] = useState(false);

  const getErrorMessage = (errorCode?: string, fallback = "An error occurred.") => {
    switch (errorCode) {
      case "MODEL_NOT_FOUND": return "The AI service configuration is temporarily unavailable.";
      case "QUOTA_EXCEEDED": return "The AI service is currently busy. Please try again shortly.";
      case "NETWORK_ERROR": return "We're having trouble connecting to the AI service.";
      case "EMPTY_RETRIEVAL": return "We couldn't find enough information in this document to answer that question.";
      default: return fallback;
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isCompleted = false;
    
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/document/${documentId}/summary`);
        if (res.ok) {
          const data = await res.json();
          setSummaryData(data);
        } else {
          const errData = await res.json();
          setSummaryData({ 
            summary: getErrorMessage(errData.code, "Failed to load summary."), 
            topics: [] 
          });
        }
      } catch (e) {
        setSummaryData({ summary: "We're having trouble connecting to the service.", topics: [] });
      } finally {
        setLoadingSummary(false);
      }
    }

    async function checkStatus() {
      if (isCompleted) return;
      try {
        const res = await fetch(`/api/document/${documentId}/status`);
        if (res.ok) {
          const data = await res.json();
          setDocStatus(data);
          
          if (data.status === "completed") {
            isCompleted = true;
            clearInterval(interval);
            fetchSummary();
          } else if (data.status === "failed") {
            isCompleted = true;
            clearInterval(interval);
            setLoadingSummary(false);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Initial check
    checkStatus();
    
    // Poll every 2 seconds
    interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [documentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatting) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: userMessage }]);
    setChatting(true);

    try {
      const res = await fetch(`/api/document/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      if (res.ok) {
        setChatHistory((prev) => [
          ...prev, 
          { role: "ai", text: data.answer, citations: data.citations }
        ]);
      } else {
        const friendlyError = getErrorMessage(data.code, data.error || "Sorry, an error occurred while fetching the answer.");
        setChatHistory((prev) => [...prev, { role: "ai", text: friendlyError }]);
      }
    } catch (e) {
      setChatHistory((prev) => [...prev, { role: "ai", text: "We're having trouble connecting to the AI service." }]);
    } finally {
      setChatting(false);
    }
  };

  const isProcessing = docStatus && docStatus.status !== "completed" && docStatus.status !== "failed";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-8 overflow-hidden relative">
      <div className="absolute top-0 left-1/4 w-[50%] h-[300px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="max-w-7xl w-full mx-auto space-y-8 relative z-10"
      >
        
        {/* Header / Top Navigation */}
        <motion.div variants={fadeUp} className="flex items-center gap-4 border-b border-white/5 pb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-secondary text-muted-foreground hover:text-white rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
                DocLens Analysis
              </h1>
            </div>
            {!isProcessing && docStatus?.status === "completed" && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-success font-medium">Synced & Structured</span>
              </div>
            )}
          </div>
        </motion.div>

        {isProcessing && (
          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-20">
            <Card className="w-full max-w-2xl bg-secondary/30 border-white/5 shadow-2xl backdrop-blur-xl overflow-hidden relative p-8">
               <div className="absolute top-0 left-0 w-full h-1 bg-secondary overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-brand to-purple-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${docStatus.progress || 5}%` }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                  />
                </div>
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-8 h-8 text-brand animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Processing Document</h2>
                    <p className="text-muted-foreground">
                      {docStatus.processing_stage || "Initializing workflow..."}
                    </p>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-3 mt-8 overflow-hidden border border-white/5">
                    <motion.div 
                      className="bg-brand h-full rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${docStatus.progress || 5}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-sm font-mono text-muted-foreground text-right">{docStatus.progress || 0}%</p>
                </div>
            </Card>
          </motion.div>
        )}

        {docStatus?.status === "failed" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={springConfig}
              className="bg-secondary/90 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-3">Limit Reached</h2>
              <p className="text-muted-foreground text-center mb-8 text-[15px] leading-relaxed">
                {docStatus.error_message?.includes("quota") || docStatus.error_message?.includes("limit") 
                  ? "The Gemini API daily limit has been exhausted. The problem is not in the code, but today's API quota is finished. Please try again after a day." 
                  : (docStatus.error_message || "An unexpected error occurred during AI processing.")}
              </p>
              <div className="flex justify-center">
                <Link href="/" className="w-full">
                  <Button className="bg-white text-black hover:bg-white/90 w-full h-12 text-base rounded-xl font-medium">
                    Return Home
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}

        {!isProcessing && docStatus?.status === "completed" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Intelligence Dashboard */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-8">
              <motion.div variants={fadeUp}>
                <Card className="bg-secondary/30 border-white/5 shadow-2xl backdrop-blur-xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand to-purple-500 opacity-50" />
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-brand" />
                      AI Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSummary ? (
                      <div className="space-y-3">
                        <div className="h-4 bg-white/5 rounded-md w-full animate-pulse" />
                        <div className="h-4 bg-white/5 rounded-md w-[90%] animate-pulse" />
                        <div className="h-4 bg-white/5 rounded-md w-[75%] animate-pulse" />
                      </div>
                    ) : (
                      <p className="text-muted-foreground leading-relaxed text-[16px] md:text-[17px] tracking-wide">
                        {summaryData?.summary || "No summary available."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium text-white">Extracted Topics</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingSummary ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="bg-secondary/20 border-white/5 h-[120px] animate-pulse" />
                    ))
                  ) : (
                    summaryData?.topics?.map((topic: any, i) => {
                      const isString = typeof topic === "string";
                      const title = isString ? topic : topic.title;
                      const desc = isString ? "" : topic.description;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05, ...springConfig }}
                        >
                          <Card className="bg-secondary/20 border-white/5 hover:border-brand/30 hover:bg-secondary/40 transition-colors h-full">
                            <CardContent className="p-5">
                              <h4 className="font-semibold text-white text-base mb-2">{title}</h4>
                              {desc && <p className="text-[15px] text-muted-foreground line-clamp-3">{desc}</p>}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                  {(!summaryData?.topics || summaryData.topics.length === 0) && !loadingSummary && (
                    <p className="text-sm text-muted-foreground col-span-full">No structured topics found.</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column: Chat Interface */}
            <motion.div variants={fadeUp} className="lg:col-span-5 xl:col-span-4 flex flex-col h-[600px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-8">
              <Card className="flex-1 flex flex-col bg-secondary/30 border-white/5 shadow-2xl backdrop-blur-xl overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4 bg-secondary/20">
                  <CardTitle className="text-lg">Ask DocLens</CardTitle>
                  <CardDescription className="text-xs">Get answers backed by direct citations.</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col overflow-hidden p-0 relative">
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {chatHistory.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground max-w-[200px]">
                          Ask a question to intelligently search this document.
                        </p>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {chatHistory.map((msg, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={springConfig}
                          className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                        >
                          <div className={`px-5 py-3.5 rounded-[20px] max-w-[85%] text-[15px] leading-relaxed shadow-sm
                            ${msg.role === "user" 
                              ? "bg-brand text-white rounded-tr-sm" 
                              : "bg-secondary border border-white/5 text-foreground rounded-tl-sm"
                            }`}
                          >
                            {msg.text}
                          </div>
                          
                          {msg.role === "ai" && msg.citations && msg.citations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 ml-1">
                              {msg.citations.map(p => (
                                <motion.span 
                                  whileHover={{ scale: 1.05, backgroundColor: "var(--color-brand)" }}
                                  key={p} 
                                  className="text-[11px] bg-brand/10 border border-brand/20 text-brand px-2 py-1 rounded-full font-mono cursor-default transition-colors"
                                >
                                  Pg {p}
                                </motion.span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      
                      {chatting && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start"
                        >
                          <div className="px-4 py-3 rounded-[20px] rounded-tl-sm bg-secondary border border-white/5 text-muted-foreground text-sm flex items-center gap-3">
                            <Loader2 className="h-4 w-4 animate-spin text-brand"/>
                            Analyzing context...
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="p-4 bg-secondary/20 border-t border-white/5">
                    <form onSubmit={handleSendMessage} className="relative flex items-center">
                      <Input 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="e.g. What are the key risks?" 
                        disabled={chatting}
                        className="pr-12 bg-black/20 border-white/10 focus-visible:ring-brand h-12 rounded-[14px]"
                      />
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit" 
                        disabled={!chatInput.trim() || chatting}
                        className="absolute right-1 w-10 h-10 flex items-center justify-center bg-brand text-white rounded-[10px] disabled:opacity-50 disabled:bg-secondary disabled:text-muted-foreground transition-colors"
                      >
                        <Send className="h-4 w-4" />
                      </motion.button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
