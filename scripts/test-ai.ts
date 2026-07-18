import * as dotenv from "dotenv";

// Load environment variables from .env.local BEFORE importing AI service
dotenv.config({ path: ".env.local" });

const apiKey = process.env.NVIDIA_API_KEY as string;
if (!apiKey) {
  console.error("❌ ERROR: NVIDIA_API_KEY is not set in .env.local");
  process.exit(1);
}

async function runTest() {
  const { testAIConnection } = await import("../src/lib/ai");
  
  console.log(`🔍 Testing NVIDIA NIM API Configuration...`);
  console.log(`- API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
  
  const success = await testAIConnection();
  if (success) {
    console.log(`\n✅ SUCCESS! Connection verified.`);
    console.log(`- Your NVIDIA NIM API key is fully functional.`);
  } else {
    console.log(`\n❌ FAILED! Configuration or Quota Error.`);
  }
}

runTest();
