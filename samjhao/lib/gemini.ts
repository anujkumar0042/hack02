import { GoogleGenAI } from "@google/genai";
import {
  geminiAnalysisSchema,
  DocumentAnalysisSchema,
  type DocumentAnalysis,
} from "./schema";
import { ANALYSIS_SYSTEM_PROMPT } from "./prompts";

/**
 * Initializes and returns the official Google Gen AI SDK client.
 * Strictly server-side; ensures GEMINI_API_KEY is configured.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY is missing. Please add your Google Gemini API key to .env.local."
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Retrieves the configured Gemini model name, defaulting to "gemini-flash-latest".
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
}

export interface AnalyzeDocumentParams {
  base64Data: string;
  mimeType: string;
  language: string;
}

/**
 * Analyzes an uploaded document (image or PDF) using Gemini's multimodal capabilities
 * and structured JSON output. Automatically retries once if JSON validation fails.
 */
export async function analyzeDocumentWithGemini(
  params: AnalyzeDocumentParams
): Promise<DocumentAnalysis> {
  const ai = getGeminiClient();
  const modelName = getGeminiModel();

  const userPrompt = `Please analyze the attached document. Explain all details in ${params.language}. Ensure all dates are in ISO format (YYYY-MM-DD) if present, and accurately report any amounts due in INR.`;

  const contents = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.base64Data,
          },
        },
        {
          text: userPrompt,
        },
      ],
    },
  ];

  const config = {
    systemInstruction: ANALYSIS_SYSTEM_PROMPT,
    responseMimeType: "application/json",
    responseSchema: geminiAnalysisSchema,
    temperature: 0.1, // Near-deterministic for factual consistency
  };

  // Helper to execute and validate Gemini response
  const callAndValidate = async (): Promise<DocumentAnalysis> => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Received empty response from Gemini model.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      throw new Error("Gemini response was not valid JSON.");
    }

    const validation = DocumentAnalysisSchema.safeParse(parsedJson);
    if (!validation.success) {
      throw new Error(`Schema validation error: ${validation.error.message}`);
    }

    return validation.data;
  };

  // Try initial call; if parsing or validation fails, retry once
  try {
    return await callAndValidate();
  } catch (firstError) {
    // Retry once before throwing
    try {
      return await callAndValidate();
    } catch {
      // Re-throw initial or friendly failure
      const message =
        firstError instanceof Error
          ? firstError.message
          : "Failed to parse document information.";
      throw new Error(
        `Document analysis failed: ${message}. Please ensure the document is clear and readable.`
      );
    }
  }
}
