import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listModels() {
  const response = await fetch("https://integrate.api.nvidia.com/v1/models", {
    headers: {
      "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
    }
  });
  const data = await response.json();
  if (data.data) {
    console.log("Available NVIDIA Models:");
    data.data.forEach((m: any) => console.log(m.id));
  } else {
    console.error(data);
  }
}
listModels();
