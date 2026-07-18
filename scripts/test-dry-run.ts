import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function runDryRun() {
  const { generateEmbedding, generateSummaryAndTopics, generateChatAnswer } = await import("../src/lib/ai");
  console.log("🚀 Starting Full Pipeline Dry Run (HYBRID ARCHITECTURE)\n");

  const sampleText = `
  The NVIDIA Nemotron model family is highly optimized for enterprise workflows. 
  It is incredibly efficient at RAG (Retrieval-Augmented Generation).
  Google Gemini text-embedding-004 provides exact 768-dimensional outputs.
  `;

  try {
    // 1. Test Embeddings (Gemini)
    console.log("⏳ 1. Testing Embeddings (Google Gemini - gemini-embedding-001)...");
    const embedding = await generateEmbedding(sampleText);
    console.log(`✅ Embedding generated successfully! Length: ${embedding.length} dimensions (Expected 768)`);
    if (embedding.length !== 768) {
      console.warn("⚠️ WARNING: Dimension mismatch! Supabase expects 768.");
    }

    // 2. Test Summarization (Nvidia)
    console.log("\n⏳ 2. Testing Summarization & Topic Extraction (NVIDIA Nemotron 70B)...");
    const summaryData = await generateSummaryAndTopics(sampleText);
    console.log(`✅ Summary & Topics generated successfully!`);
    console.log(`   - Summary: ${summaryData.summary}`);
    console.log(`   - Topics: ${summaryData.topics.join(", ")}`);

    // 3. Test Chat (Nvidia)
    console.log("\n⏳ 3. Testing Context-Aware Chat (NVIDIA Nemotron 70B)...");
    const chatAnswer = await generateChatAnswer(sampleText, "What are NOMIC embeddings used for?");
    console.log(`✅ Chat answered successfully!`);
    console.log(`   - Answer: ${chatAnswer.trim()}`);

    console.log("\n🎉 DRY RUN COMPLETE! The hybrid AI pipeline is fully functional.");

  } catch (error: any) {
    console.error(`\n❌ DRY RUN FAILED: ${error.message}`);
  }
}

runDryRun();
