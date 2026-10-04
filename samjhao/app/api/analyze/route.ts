import { NextRequest, NextResponse } from "next/server";
import { validateDocumentFile } from "@/lib/validate";
import { analyzeDocumentWithGemini } from "@/lib/gemini";
import { maskSensitiveData } from "@/lib/mask";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. IP-based rate limiting (15 requests/minute)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp, 15, 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit reached. Please wait ${rateCheck.resetSeconds} seconds before analyzing another document.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetSeconds.toString(),
          },
        }
      );
    }

    // 2. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "Hindi";

    if (!file) {
      return NextResponse.json(
        { error: "No document file was provided. Please choose a photo or PDF to upload." },
        { status: 400 }
      );
    }

    // 3. Strict server-side file validation (size & MIME type)
    const fileValidation = validateDocumentFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // 4. Convert file to Base64 in-memory (never persisted to disk)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // 5. Send to Gemini for multimodal structured analysis
    const analysisRaw = await analyzeDocumentWithGemini({
      base64Data,
      mimeType: file.type,
      language,
    });

    // 6. Security pass: mask any Aadhaar and PAN numbers in all extracted text
    const sanitizedAnalysis = maskSensitiveData(analysisRaw);

    // 7. Return clean, masked structured JSON
    return NextResponse.json({
      success: true,
      data: sanitizedAnalysis,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected server error occurred.";

    // Never log raw file contents or sensitive documents
    console.error("[/api/analyze] Processing error occurred:", errorMessage);

    return NextResponse.json(
      {
        error: errorMessage.includes("GEMINI_API_KEY")
          ? "Server configuration issue: GEMINI_API_KEY is not configured in .env.local."
          : errorMessage,
      },
      { status: 500 }
    );
  }
}
