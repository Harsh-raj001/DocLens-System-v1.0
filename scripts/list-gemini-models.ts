import * as dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config({ path: ".env.local" });

async function listGeminiModels() {
  const geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = await geminiAi.models.list();
  for await (const model of models) {
    if (model.name.includes("embed")) {
      console.log(model.name);
    }
  }
}
listGeminiModels();
