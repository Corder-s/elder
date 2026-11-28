/**
 * ElderCare OS — Document Classification Engine
 * Supports English & Hindi document classification with confidence scoring and source references.
 */

import type { ClassificationResult, DocumentCategory, OcrPageResult } from './types';

interface CategoryRule {
  category: DocumentCategory;
  patterns: RegExp[];
  baseWeight: number;
}

const RULES: CategoryRule[] = [
  {
    category: 'aadhaar_identity',
    patterns: [/\baadhaar\b/i, /\buidai\b/i, /\bunique identification\b/i, /आधार/],
    baseWeight: 0.35,
  },
  {
    category: 'medical_prescription',
    patterns: [/\bprescription\b/i, /\brx\b/i, /\bdosage\b/i, /\btab\.?\b/i, /\bmg\b/i, /\bphysician\b/i],
    baseWeight: 0.3,
  },
  {
    category: 'discharge_summary',
    patterns: [/\bdischarge summary\b/i, /\bdate of discharge\b/i, /\bward\b/i, /\badmission date\b/i],
    baseWeight: 0.32,
  },
  {
    category: 'medical_report',
    patterns: [/\bmedical report\b/i, /\bdiagnosis\b/i, /\bpathology\b/i, /\bvitals\b/i, /\bhospital\b/i, /\bclinic\b/i, /\bfollow[- ]?up\b/i],
    baseWeight: 0.25,
  },
  {
    category: 'admission_application',
    patterns: [/\badmission application\b/i, /\badmission form\b/i, /\bapplicant\b/i, /\bemergency contact\b/i, /\badmission reason\b/i],
    baseWeight: 0.3,
  },
  {
    category: 'rescue_case_report',
    patterns: [/\brescue\b/i, /\bcase\s*(?:ref|reference|number|#)\b/i, /\breported location\b/i, /\bcircumstances\b/i],
    baseWeight: 0.3,
  },
  {
    category: 'guardian_info',
    patterns: [/\bguardian\b/i, /\brelationship\b/i, /\bnext of kin\b/i, /\bfamily member\b/i],
    baseWeight: 0.28,
  },
  {
    category: 'consent_form',
    patterns: [/\bconsent\b/i, /\bdeclaration\b/i, /\bi hereby authorize\b/i, /\bsignature\b/i],
    baseWeight: 0.28,
  },
  {
    category: 'address_proof',
    patterns: [/\baddress proof\b/i, /\belectricity bill\b/i, /\bration card\b/i, /\bpin\s*code\b/i, /पता/],
    baseWeight: 0.25,
  },
  {
    category: 'other_identity',
    patterns: [/\bvoter\s*id\b/i, /\bpassport\b/i, /\bpan\s*card\b/i, /\bdriving\s*licen[cs]e\b/i],
    baseWeight: 0.3,
  },
  {
    category: 'financial_document',
    patterns: [/\bincome\b/i, /\bpension\b/i, /\bbank statement\b/i, /\breceipt\b/i, /\b₹|inr\b/i],
    baseWeight: 0.25,
  },
];

export function classifyDocument(pages: OcrPageResult[]): ClassificationResult {
  const scores: Array<{
    category: DocumentCategory;
    score: number;
    refs: Array<{ pageNumber: number; snippet: string }>;
  }> = [];

  for (const rule of RULES) {
    let score = 0;
    const refs: Array<{ pageNumber: number; snippet: string }> = [];

    for (const page of pages) {
      for (const pat of rule.patterns) {
        const m = page.text.match(pat);
        if (m) {
          score += rule.baseWeight;
          const idx = Math.max(0, (m.index || 0) - 20);
          const snippet = page.text.slice(idx, idx + 100).replace(/\s+/g, ' ').trim();
          if (refs.length < 3) {
            refs.push({ pageNumber: page.pageNumber, snippet });
          }
        }
      }
    }

    if (score > 0) {
      scores.push({ category: rule.category, score: Math.min(0.98, Number(score.toFixed(4))), refs });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      predictedCategory: 'other',
      confidence: 0.25,
      supportingReferences: [],
      alternativeCategories: [],
      lowConfidence: true,
    };
  }

  const top = scores[0];
  const alternatives = scores.slice(1, 3).map((s) => ({
    category: s.category,
    confidence: s.score,
  }));

  return {
    predictedCategory: top.category,
    confidence: top.score,
    supportingReferences: top.refs,
    alternativeCategories: alternatives,
    lowConfidence: top.score < 0.7,
  };
}
