/**
 * ElderCare OS — Extraction Validation & Prompt Injection Defense Engine
 */

import type { ClassificationResult, ExtractedFieldsMap, OcrResult } from './types';

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /disregard\s+(?:all\s+)?(?:system|prior|above)\s+instructions/i,
  /system\s*prompt\s*:/i,
  /approve\s+(?:this\s+document\s+)?automatically/i,
  /bypass\s+(?:human\s+)?review/i,
  /override\s+(?:role|permission|security)/i,
  /execute\s+sql/i,
];

export interface ValidationOutcome {
  promptInjectionDetected: boolean;
  requiresManualReview: boolean;
  warnings: string[];
}

export function validateExtractionResult(params: {
  ocr: OcrResult;
  classification: ClassificationResult;
  fields: ExtractedFieldsMap;
}): ValidationOutcome {
  const warnings: string[] = [...params.ocr.warnings];
  let promptInjectionDetected = false;

  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(params.ocr.fullText)) {
      promptInjectionDetected = true;
      warnings.push(
        'Potential prompt-injection pattern detected in document text. Treated strictly as untrusted data; manual review enforced.'
      );
      break;
    }
  }

  if (!params.ocr.readable) {
    warnings.push('Document text could not be automatically read; manual review required.');
  }

  if (params.classification.lowConfidence) {
    warnings.push(
      `Low classification confidence (${Math.round(params.classification.confidence * 100)}%); manual classification confirmation required.`
    );
  }

  // Validate phone format if extracted
  const phoneField = params.fields.contactPhone;
  if (phoneField?.value && typeof phoneField.value === 'string') {
    const digits = phoneField.value.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      warnings.push('Extracted contactPhone format looks unusual; verify before saving.');
    }
  }

  return {
    promptInjectionDetected,
    requiresManualReview: true, // Always requires human sign-off before becoming an official record
    warnings,
  };
}
