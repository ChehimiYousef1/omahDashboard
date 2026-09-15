import {
  normalizeWhatsAppNumber,
} from "./ApplicantCommunicationsPanel";


function assertEqual(
  actual: unknown,
  expected: unknown,
  message: string
) {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${String(expected)}, received ${String(actual)}`
    );
  }
}


assertEqual(
  normalizeWhatsAppNumber(
    "+961 70 123 456"
  ),
  "96170123456",
  "E.164-style number should normalize"
);


assertEqual(
  normalizeWhatsAppNumber(
    "00961 70 123 456"
  ),
  "96170123456",
  "00 international prefix should normalize"
);


assertEqual(
  normalizeWhatsAppNumber(
    "70 123 456"
  ),
  null,
  "Local number must not receive a guessed country code"
);


assertEqual(
  normalizeWhatsAppNumber(
    ""
  ),
  null,
  "Empty number must remain invalid"
);


console.log(
  "✅ Applicant WhatsApp number normalization"
);
