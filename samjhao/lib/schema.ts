import { z } from "zod";
import { Type } from "@google/genai";

/**
 * Zod validation schema for Gemini's structured JSON analysis output.
 * Ensures strict runtime type-safety before data is handled or displayed.
 */
export const DocumentTypeEnum = z.enum([
  "electricity_bill",
  "bank_notice",
  "legal_notice",
  "insurance",
  "government_form",
  "scam_suspected",
  "other",
]);

export const RiskLevelEnum = z.enum(["low", "medium", "high"]);
export const ConfidenceEnum = z.enum(["high", "medium", "low"]);

export const DocumentAnalysisSchema = z.object({
  document_type: DocumentTypeEnum,
  document_title: z.string(),
  issuer: z.string(),
  summary: z.string(),
  amount_due: z.object({
    value: z.number().nullable(),
    currency: z.literal("INR"),
  }),
  due_date: z.string().nullable(),
  risk_level: RiskLevelEnum,
  risk_reason: z.string(),
  scam_check: z.object({
    suspicious: z.boolean(),
    reasons: z.array(z.string()),
  }),
  key_terms: z.array(
    z.object({
      term: z.string(),
      meaning: z.string(),
    })
  ),
  next_steps: z.array(z.string()),
  confidence: ConfidenceEnum,
  needs_human_review: z.boolean(),
});

export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;

/**
 * Gemini responseSchema definition using the official @google/genai SDK Type system.
 * Enforces exact JSON structure directly from the Gemini model.
 */
export const geminiAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    document_type: {
      type: Type.STRING,
      enum: [
        "electricity_bill",
        "bank_notice",
        "legal_notice",
        "insurance",
        "government_form",
        "scam_suspected",
        "other",
      ],
      description: "Classified category of the document",
    },
    document_title: {
      type: Type.STRING,
      description: "Short, clean title or heading of the document",
    },
    issuer: {
      type: Type.STRING,
      description: "Name of the issuing department, utility, bank, or court",
    },
    summary: {
      type: Type.STRING,
      description:
        "2-3 simple sentences in the requested language explaining what this document is and what it demands in plain words",
    },
    amount_due: {
      type: Type.OBJECT,
      properties: {
        value: {
          type: Type.NUMBER,
          description: "Numeric amount due in INR if explicitly stated, otherwise null",
          nullable: true,
        },
        currency: {
          type: Type.STRING,
          enum: ["INR"],
          description: "Currency code, fixed to INR",
        },
      },
      required: ["value", "currency"],
    },
    due_date: {
      type: Type.STRING,
      description: "ISO formatted date (YYYY-MM-DD) if explicitly present, otherwise null",
      nullable: true,
    },
    risk_level: {
      type: Type.STRING,
      enum: ["low", "medium", "high"],
      description: "Overall risk severity level",
    },
    risk_reason: {
      type: Type.STRING,
      description: "Clear explanation in the chosen language of why this risk level was assigned",
    },
    scam_check: {
      type: Type.OBJECT,
      properties: {
        suspicious: {
          type: Type.BOOLEAN,
          description:
            "True if suspicious signs, urgency threats, personal UPI links, or fake authority signs are detected",
        },
        reasons: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of specific scam flags detected, or empty list if genuine",
        },
      },
      required: ["suspicious", "reasons"],
    },
    key_terms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: {
            type: Type.STRING,
            description: "Technical or legal term found in the document",
          },
          meaning: {
            type: Type.STRING,
            description: "Plain language explanation in the requested language",
          },
        },
        required: ["term", "meaning"],
      },
      description: "Up to 5 key terms explained simply",
    },
    next_steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 5 clear, sequential action steps in the requested language",
    },
    confidence: {
      type: Type.STRING,
      enum: ["high", "medium", "low"],
      description: "Confidence in reading and interpreting the document",
    },
    needs_human_review: {
      type: Type.BOOLEAN,
      description:
        "True if the document is blurry, cropped, incomplete, or requires official legal/financial consultation",
    },
  },
  required: [
    "document_type",
    "document_title",
    "issuer",
    "summary",
    "amount_due",
    "due_date",
    "risk_level",
    "risk_reason",
    "scam_check",
    "key_terms",
    "next_steps",
    "confidence",
    "needs_human_review",
  ],
};
