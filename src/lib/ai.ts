import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// 1. NVIDIA Client (For Heavy LLM Tasks)
const nvidiaApiKey = process.env.NVIDIA_API_KEY;
export const nvidiaAi = new OpenAI({
  apiKey: nvidiaApiKey || "dummy",
  baseURL: "https://integrate.api.nvidia.com/v1",
});
const SUMMARY_MODEL = "meta/llama-3.1-70b-instruct";
const TOPICS_MODEL = "meta/llama-3.1-8b-instruct";
const CHAT_MODEL = "meta/llama-3.1-70b-instruct";

// 2. Gemini Client (For Embeddings ONLY - 768 dims)
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiAi = new GoogleGenAI({ apiKey: geminiApiKey || "dummy" });
const EMBEDDING_MODEL = "gemini-embedding-001";

export class AIError extends Error {
  code: "MODEL_NOT_FOUND" | "QUOTA_EXCEEDED" | "NETWORK_ERROR" | "UNKNOWN";
  
  constructor(code: "MODEL_NOT_FOUND" | "QUOTA_EXCEEDED" | "NETWORK_ERROR" | "UNKNOWN", message: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
  }
}

/**
 * Normalizes OpenAI/NVIDIA and Gemini API errors into standard application errors
 */
export function handleAIError(error: any): never {
  console.error("[AI SERVICE ERROR]", error);

  if (error instanceof OpenAI.APIError) {
    if (error.status === 404) {
      throw new AIError("MODEL_NOT_FOUND", "The requested AI model is currently unavailable or deprecated.");
    }
    if (error.status === 429) {
      throw new AIError("QUOTA_EXCEEDED", "The AI service rate limit has been exceeded. Please wait a moment and try again.");
    }
    if (error.status >= 500) {
      throw new AIError("NETWORK_ERROR", "The AI service is currently experiencing downtime. Please try again later.");
    }
  }
  
  const errorMsg = error?.message || error?.toString() || "";
  if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
    throw new AIError("QUOTA_EXCEEDED", "The Embedding API rate limit was exceeded.");
  }

  throw new AIError("UNKNOWN", errorMsg || "An unknown error occurred during AI generation.");
}

/**
 * Validates the API keys for both providers.
 */
export async function testAIConnection(): Promise<boolean> {
  try {
    await nvidiaAi.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: "OK" }],
      max_tokens: 5,
    });
    
    await geminiAi.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: "OK",
      config: { outputDimensionality: 768 }
    });
    
    return true;
  } catch (error) {
    handleAIError(error);
  }
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    if (texts.length === 0) return [];
    
    // Process sequentially to avoid rate limits
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);
      // Small delay between requests to be safe
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return embeddings;
  } catch (error) {
    handleAIError(error);
  }
}

/**
 * Generates a single embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await geminiAi.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: { outputDimensionality: 768 }
    });
    
    if (!response.embeddings || !response.embeddings[0].values) {
      throw new Error("No embedding values returned from Gemini");
    }
    return response.embeddings[0].values;
  } catch (error) {
    handleAIError(error);
  }
}

/**
 * Generates ONLY the summary using the larger 70B model
 */
export async function generateSummary(text: string): Promise<string> {
  try {
    const prompt = `You are an expert document analyst. Analyze the following text and provide a comprehensive 2-3 paragraph executive summary. Do not include markdown formatting or extra text, just the summary paragraphs.

Document Text:
${text.substring(0, 30000)}`;

    const response = await nvidiaAi.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    return response.choices[0].message.content || "Failed to generate structured summary.";
  } catch (error) {
    handleAIError(error);
  }
}

/**
 * Generates ONLY the topics using the faster 8B model
 */
export async function generateTopics(text: string): Promise<{title: string, description: string}[]> {
  try {
    const prompt = `You are an expert document analyst. Analyze the following text and provide a list of 4-6 key topics.
Return ONLY a valid JSON object exactly matching this structure:
{
  "topics": [
    { "title": "Topic Title", "description": "A brief 2-3 sentence description of the topic." }
  ]
}

Document Text:
${text.substring(0, 20000)}`;

    const response = await nvidiaAi.chat.completions.create({
      model: TOPICS_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseText = response.choices[0].message.content || '{"topics": []}';
    try {
      const data = JSON.parse(responseText);
      return data.topics || [];
    } catch (e) {
      return [];
    }
  } catch (error) {
    handleAIError(error);
  }
}

/**
 * Generates an answer to a user's question based on the provided context using NVIDIA NIM.
 */
export async function generateChatAnswer(context: string, question: string) {
  try {
    const prompt = `You are a helpful, professional AI assistant for DocLens. Answer the user's question using ONLY the provided document context below.
If the answer is not contained in the context, politely state that you cannot answer based on the provided document.

Context Information:
---------------------
${context}
---------------------

User Question: ${question}
`;

    const response = await nvidiaAi.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Sorry, I could not generate an answer.";
  } catch (error) {
    handleAIError(error);
  }
}
