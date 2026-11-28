/**
 * ElderCare OS — Stage 3B-8 Document Intelligence & Form Generation Types
 */

export const AI_SAFETY_NOTICE =
  'AI-extracted information may contain errors. Verify all information against the original document before saving it to an official resident record.';

export type DocumentCategory =
  | 'aadhaar_identity'
  | 'other_identity'
  | 'address_proof'
  | 'medical_prescription'
  | 'medical_report'
  | 'discharge_summary'
  | 'admission_application'
  | 'consent_form'
  | 'rescue_case_report'
  | 'guardian_info'
  | 'financial_document'
  | 'other';

export const MEDICAL_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'medical_prescription',
  'medical_report',
  'discharge_summary',
];

export type ProcessingStatus =
  | 'queued'
  | 'processing'
  | 'extracted'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'failed';

export type FormType =
  | 'resident_admission'
  | 'resident_profile'
  | 'guardian_family'
  | 'emergency_contact'
  | 'rescue_registration'
  | 'document_verification'
  | 'medical_summary_review';

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  language: 'en' | 'hi' | 'mixed' | 'unknown';
  tablesDetected: number;
}

export interface OcrResult {
  providerName: string;
  readable: boolean;
  pageCount: number;
  detectedLanguage: 'en' | 'hi' | 'mixed' | 'unknown';
  fullText: string;
  pages: OcrPageResult[];
  warnings: string[];
}

export interface ClassificationResult {
  predictedCategory: DocumentCategory;
  confidence: number;
  supportingReferences: Array<{ pageNumber: number; snippet: string }>;
  alternativeCategories: Array<{ category: DocumentCategory; confidence: number }>;
  lowConfidence: boolean;
}

export interface ExtractedFieldValue {
  value: string | number | boolean | null;
  sourceText: string | null;
  pageNumber: number | null;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
  confidence: number;
  origin: 'extracted' | 'manual';
  verified: boolean;
}

export type ExtractedFieldsMap = Record<string, ExtractedFieldValue>;

export interface FormSchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'phone';
  required: boolean;
  options?: string[];
  conditionalOn?: { field: string; equals: string | boolean };
  maxLength?: number;
}

export interface FormSchemaDefinition {
  formType: FormType;
  version: string;
  title: string;
  description: string;
  requiresClinicalReview: boolean;
  fields: FormSchemaField[];
}
