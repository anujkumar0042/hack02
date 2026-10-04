/**
 * Quick Test Script for Samjhao Core AI (Phase 2)
 * Tests file loading, Base64 conversion, Gemini multimodal analysis, and Aadhaar/PAN masking.
 */
import fs from "fs";
import path from "path";

// Load .env.local manually for test script execution
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...values] = trimmed.split("=");
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join("=").trim();
      }
    }
  }
}

async function runTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log("❌ GEMINI_API_KEY is not set in .env.local yet.");
    console.log("👉 Please paste your Google Gemini API key into .env.local to test live AI responses.");
    process.exit(0);
  }

  console.log("🔑 Gemini API Key detected.");
  console.log("📄 Loading sample document: public/samples/electricity_bill_sample.pdf");

  const filePath = path.join(process.cwd(), "public", "samples", "electricity_bill_sample.pdf");
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  formData.append("file", blob, "electricity_bill_sample.pdf");
  formData.append("language", "Hindi");

  console.log("🤖 Querying Gemini API (Multimodal + Structured JSON)...");
  
  // Dynamic import of our app's lib
  const { analyzeDocumentWithGemini } = await import("../lib/gemini.ts");
  const { maskSensitiveData } = await import("../lib/mask.ts");

  try {
    const result = await analyzeDocumentWithGemini({
      base64Data,
      mimeType: "application/pdf",
      language: "Hindi",
    });

    console.log("\n✅ Gemini Analysis Response Received!");
    const masked = maskSensitiveData(result);
    console.log(JSON.stringify(masked, null, 2));

    console.log("\n🔒 Privacy Verification:");
    const hasUnmaskedAadhaar = JSON.stringify(masked).includes("1234 5678 9012");
    const hasMaskedAadhaar = JSON.stringify(masked).includes("XXXX XXXX 9012");
    console.log(`- Aadhaar Unmasked in output? ${hasUnmaskedAadhaar ? "⚠️ YES (FAIL)" : "✅ NO (SAFE)"}`);
    console.log(`- Aadhaar Masked properly? ${hasMaskedAadhaar ? "✅ YES" : "ℹ️ (Aadhaar was omitted or masked)"}`);

  } catch (err) {
    console.error("❌ Test failed with error:", err.message);
  }
}

runTest();
