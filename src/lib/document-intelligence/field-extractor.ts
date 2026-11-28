/**
 * ElderCare OS — Structured Field Extraction Engine
 * Extracts only explicit values present in source text; returns null when absent.
 * Never infers missing values or invents medical observations.
 */

import { CATEGORY_EXTRACTION_KEYS } from './schemas';
import type { DocumentCategory, ExtractedFieldsMap, ExtractedFieldValue, OcrPageResult } from './types';

function emptyField(): ExtractedFieldValue {
  return {
    value: null,
    sourceText: null,
    pageNumber: null,
    boundingBox: null,
    confidence: 0,
    origin: 'extracted',
    verified: false,
  };
}

function findPattern(pages: OcrPageResult[], regexes: RegExp[]): { value: string; sourceText: string; pageNumber: number } | null {
  for (const page of pages) {
    for (const rx of regexes) {
      const m = page.text.match(rx);
      if (m && m[1] && m[1].trim().length > 0) {
        return {
          value: m[1].trim(),
          sourceText: m[0].trim(),
          pageNumber: page.pageNumber,
        };
      }
    }
  }
  return null;
}

function maskIdNumber(raw: string): string {
  const digits = raw.replace(/\s+/g, '');
  if (digits.length >= 8) {
    return `${'X'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
  }
  return digits;
}

const FIELD_PATTERNS: Record<string, RegExp[]> = {
  personName: [
    /(?:^|\n)\s*(?:Name|Person Name|Full Name|Applicant Name|नाम)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  residentName: [
    /(?:^|\n)\s*(?:Resident Name|Patient Name|Name of Resident)\s*[:\-]\s*([^\n\r]{2,120})/i,
    /(?:^|\n)\s*(?:Name)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  residentReference: [
    /(?:^|\n)\s*(?:Resident|Patient Name|Patient|Resident Ref(?:erence)?)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  applicantName: [
    /(?:^|\n)\s*(?:Applicant Name|Applicant)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  personIdentifier: [
    /(?:^|\n)\s*(?:Person|Name|Identifier)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  dateOfBirth: [
    /(?:^|\n)\s*(?:DOB|Date of Birth|Birth Date|जन्म तिथि)\s*[:\-]\s*([0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
  ],
  ageOrDob: [
    /(?:^|\n)\s*(?:Age|DOB|Date of Birth)\s*[:\-]\s*([^\n\r]{1,40})/i,
  ],
  approximateAge: [
    /(?:^|\n)\s*(?:Approximate Age|Approx\.?\s*Age|Age)\s*[:\-]\s*([0-9]{1,3})/i,
  ],
  gender: [
    /(?:^|\n)\s*(?:Gender|Sex|लिंग)\s*[:\-]\s*(Male|Female|Other|पुरुष|महिला)/i,
  ],
  address: [
    /(?:^|\n)\s*(?:Address|Permanent Address|Residence|पता)\s*[:\-]\s*([^\n\r]{4,240})/i,
  ],
  documentNumberMasked: [
    /(?:^|\n)\s*(?:Aadhaar|UID|ID Number|Document No\.?|Card No\.?)\s*[:\-]\s*([A-Z0-9\-\s]{6,24})/i,
  ],
  issuingAuthority: [
    /(?:^|\n)\s*(?:Issuing Authority|Issued By|Authority)\s*[:\-]\s*([^\n\r]{2,120})/i,
    /(Unique Identification Authority of India|UIDAI)/i,
  ],
  reportDate: [
    /(?:^|\n)\s*(?:Report Date|Date|Issued Date|Date of Issue)\s*[:\-]\s*([0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
  ],
  hospitalOrClinic: [
    /(?:^|\n)\s*(?:Hospital|Clinic|Medical Center|Health Center)\s*[:\-]\s*([^\n\r]{2,150})/i,
  ],
  doctorName: [
    /(?:^|\n)\s*(?:Doctor|Dr\.?|Physician|Clinician)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  observationsListed: [
    /(?:^|\n)\s*(?:Observations?|Clinical Notes?|Findings?|Diagnosis)\s*[:\-]\s*([^\n\r]{3,300})/i,
  ],
  medicationsListed: [
    /(?:^|\n)\s*(?:Medications?|Prescribed|Medicines?|Rx)\s*[:\-]\s*([^\n\r]{3,300})/i,
  ],
  followUpDate: [
    /(?:^|\n)\s*(?:Follow[- ]?up Date|Next Visit)\s*[:\-]\s*([0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
  ],
  contactPhone: [
    /(?:^|\n)\s*(?:Phone|Mobile|Contact|Contact Phone|Tel)\s*[:\-]\s*([+0-9\-\s]{7,20})/i,
  ],
  guardianName: [
    /(?:^|\n)\s*(?:Guardian|Guardian Name|Next of Kin|Caregiver)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  emergencyContact: [
    /(?:^|\n)\s*(?:Emergency Contact|Emergency Phone)\s*[:\-]\s*([^\n\r]{2,120})/i,
  ],
  admissionReason: [
    /(?:^|\n)\s*(?:Admission Reason|Reason for Admission|Reason)\s*[:\-]\s*([^\n\r]{3,240})/i,
  ],
  caseReference: [
    /(?:^|\n)\s*(?:Case Reference|Case Ref|Case No\.?|Case Number)\s*[:\-]\s*([^\n\r]{2,60})/i,
  ],
  reportedLocation: [
    /(?:^|\n)\s*(?:Reported Location|Location|Rescue Location|Found At)\s*[:\-]\s*([^\n\r]{3,200})/i,
  ],
  reportedDateTime: [
    /(?:^|\n)\s*(?:Reported Date|Date & Time|DateTime|Time)\s*[:\-]\s*([^\n\r]{4,80})/i,
  ],
  initialDescription: [
    /(?:^|\n)\s*(?:Description|Initial Description|Circumstances|Notes)\s*[:\-]\s*([^\n\r]{4,300})/i,
  ],
  relationship: [
    /(?:^|\n)\s*(?:Relationship|Relation)\s*[:\-]\s*([^\n\r]{2,60})/i,
  ],
  declarationSigned: [
    /(?:^|\n)\s*(?:Declaration|Signed|Consent)\s*[:\-]\s*(Yes|No|Signed|Agreed)/i,
  ],
  declaredAmount: [
    /(?:^|\n)\s*(?:Amount|Income|Total)\s*[:\-]\s*([₹INR0-9,.\s]{2,40})/i,
  ],
  notes: [
    /(?:^|\n)\s*(?:Notes|Summary|Remarks)\s*[:\-]\s*([^\n\r]{3,250})/i,
  ],
};

export function extractStructuredFields(
  category: DocumentCategory,
  pages: OcrPageResult[]
): { fields: ExtractedFieldsMap; fieldConfidence: Record<string, number> } {
  const keys = CATEGORY_EXTRACTION_KEYS[category] || CATEGORY_EXTRACTION_KEYS.other;
  const fields: ExtractedFieldsMap = {};
  const fieldConfidence: Record<string, number> = {};

  for (const key of keys) {
    const patterns = FIELD_PATTERNS[key];
    if (!patterns) {
      fields[key] = emptyField();
      fieldConfidence[key] = 0;
      continue;
    }

    const hit = findPattern(pages, patterns);
    if (!hit) {
      fields[key] = emptyField();
      fieldConfidence[key] = 0;
      continue;
    }

    let val: string | number | boolean = hit.value;
    if (key === 'documentNumberMasked') {
      val = maskIdNumber(hit.value);
    } else if (key === 'approximateAge') {
      const n = parseInt(hit.value, 10);
      val = Number.isFinite(n) ? n : hit.value;
    } else if (key === 'gender') {
      const lower = hit.value.toLowerCase();
      if (lower === 'पुरुष') val = 'male';
      else if (lower === 'महिला') val = 'female';
      else val = lower;
    } else if (key === 'declarationSigned') {
      val = ['yes', 'signed', 'agreed'].includes(hit.value.toLowerCase());
    }

    const conf = 0.86;
    fields[key] = {
      value: val,
      sourceText: hit.sourceText,
      pageNumber: hit.pageNumber,
      boundingBox: null,
      confidence: conf,
      origin: 'extracted',
      verified: false,
    };
    fieldConfidence[key] = conf;
  }

  return { fields, fieldConfidence };
}
