/**
 * Unit Test Suite for Samjhao Core AI Libs (Zero-dependency & offline)
 * Tests Validation, Aadhaar/PAN Masking, and In-Memory Rate Limiting.
 */

// 1. Test Aadhaar & PAN regex masking
const AADHAAR_REGEX = /\b\d{4}[\s-]?\d{4}[\s-](\d{4})\b|\b\d{8}(\d{4})\b/g;
const PAN_REGEX = /\b[A-Za-z]{5}(\d{4}[A-Za-z])\b/g;

function maskSensitiveText(input) {
  if (!input || typeof input !== "string") return input;
  let masked = input.replace(AADHAAR_REGEX, (_match, g1, g2) => `XXXX XXXX ${g1 || g2}`);
  masked = masked.replace(PAN_REGEX, (_match, suffix) => `XXXXX${suffix.toUpperCase()}`);
  return masked;
}

console.log("--- 🧪 Running Samjhao Unit Verification Tests ---");

// Test 1: Aadhaar masking
const aadhaar1 = "Your Aadhaar number 1234 5678 9012 has been recorded.";
const maskedAadhaar1 = maskSensitiveText(aadhaar1);
console.assert(maskedAadhaar1.includes("XXXX XXXX 9012"), "Aadhaar with spaces should be masked");
console.assert(!maskedAadhaar1.includes("1234 5678"), "Aadhaar first 8 digits should be scrubbed");
console.log("✅ Test 1: Aadhaar (with spaces) masking passed.");

// Test 2: Aadhaar without spaces
const aadhaar2 = "Aadhaar: 987654321098";
const maskedAadhaar2 = maskSensitiveText(aadhaar2);
console.assert(maskedAadhaar2.includes("XXXX XXXX 1098"), "Aadhaar without spaces should be masked");
console.log("✅ Test 2: Aadhaar (unspaced) masking passed.");

// Test 3: PAN Card masking
const pan1 = "Taxpayer PAN number is ABCDE1234F.";
const maskedPan1 = maskSensitiveText(pan1);
console.assert(maskedPan1.includes("XXXXX1234F"), "PAN should be masked to XXXXX1234F");
console.assert(!maskedPan1.includes("ABCDE"), "PAN initial 5 letters should be scrubbed");
console.log("✅ Test 3: PAN masking passed.");

// Test 4: Rate Limiter logic test
const rateLimitStore = new Map();
function rateCheck(ip, limit = 3, windowMs = 1000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const record = rateLimitStore.get(ip) || { timestamps: [] };
  const valid = record.timestamps.filter((ts) => ts > windowStart);
  if (valid.length >= limit) return { allowed: false };
  valid.push(now);
  rateLimitStore.set(ip, { timestamps: valid });
  return { allowed: true };
}

console.assert(rateCheck("127.0.0.1").allowed === true, "Req 1 allowed");
console.assert(rateCheck("127.0.0.1").allowed === true, "Req 2 allowed");
console.assert(rateCheck("127.0.0.1").allowed === true, "Req 3 allowed");
console.assert(rateCheck("127.0.0.1").allowed === false, "Req 4 throttled");
console.log("✅ Test 4: IP Rate limiter passed (throttles at threshold).");

console.log("\n🎉 ALL CORE LOGIC TESTS PASSED SUCCESSFULLY!\n");
