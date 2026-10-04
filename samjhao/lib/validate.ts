/**
 * File validation utility for Samjhao.
 * Ensures uploaded documents meet size and MIME type safety requirements.
 */

// Maximum permitted file upload size: 8 MB (8 * 1024 * 1024 bytes)
export const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Allowed MIME types for Gemini multimodal document processing
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file's MIME type and size.
 * Returns { valid: true } if compliant, or a friendly error message if rejected.
 */
export function validateDocumentFile(file: File | Blob): ValidationResult {
  if (!file) {
    return { valid: false, error: "Please select or upload a document to analyze." };
  }

  // Check file size (max 8MB)
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB} MB). Please upload a document smaller than 8 MB.`,
    };
  }

  // Check MIME type
  const mimeType = file.type;
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error:
        "Unsupported file format. Please upload a clear image (JPG, PNG, WEBP) or a PDF document.",
    };
  }

  return { valid: true };
}
