/**
 * ElderCare OS — Typed Extraction Schemas & 7 Operational Form Definitions
 */

import type { DocumentCategory, FormSchemaDefinition, FormType } from './types';

export const CATEGORY_EXTRACTION_KEYS: Record<DocumentCategory, string[]> = {
  aadhaar_identity: ['personName', 'dateOfBirth', 'gender', 'address', 'documentNumberMasked', 'issuingAuthority'],
  other_identity: ['personName', 'dateOfBirth', 'address', 'documentNumberMasked', 'issuingAuthority'],
  address_proof: ['personName', 'address', 'documentNumberMasked', 'issuingAuthority'],
  medical_prescription: ['residentReference', 'reportDate', 'hospitalOrClinic', 'doctorName', 'medicationsListed', 'followUpDate'],
  medical_report: ['residentReference', 'reportDate', 'hospitalOrClinic', 'doctorName', 'observationsListed', 'medicationsListed', 'followUpDate'],
  discharge_summary: ['residentReference', 'reportDate', 'hospitalOrClinic', 'doctorName', 'observationsListed', 'medicationsListed', 'followUpDate'],
  admission_application: ['applicantName', 'residentName', 'ageOrDob', 'gender', 'contactPhone', 'guardianName', 'emergencyContact', 'address', 'admissionReason'],
  consent_form: ['residentName', 'guardianName', 'contactPhone', 'declarationSigned', 'reportDate'],
  rescue_case_report: ['caseReference', 'personIdentifier', 'approximateAge', 'gender', 'reportedLocation', 'reportedDateTime', 'contactPhone', 'initialDescription'],
  guardian_info: ['guardianName', 'relationship', 'contactPhone', 'address', 'residentName'],
  financial_document: ['personName', 'documentNumberMasked', 'declaredAmount', 'reportDate', 'issuingAuthority'],
  other: ['personName', 'reportDate', 'notes'],
};

export const FORM_DEFINITIONS: Record<FormType, FormSchemaDefinition> = {
  resident_admission: {
    formType: 'resident_admission',
    version: '1.0',
    title: 'New Resident Admission Form',
    description: 'Draft admission record generated from verified document extraction.',
    requiresClinicalReview: false,
    fields: [
      { key: 'fullName', label: 'Resident Full Name', type: 'text', required: true, maxLength: 150 },
      { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['male', 'female', 'other'] },
      { key: 'ageEstimate', label: 'Estimated Age', type: 'number', required: false },
      { key: 'primaryDiagnosis', label: 'Primary Diagnosis / Condition (Source Quoted)', type: 'textarea', required: false },
      { key: 'roomNumber', label: 'Preferred Room Number', type: 'text', required: false },
      { key: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'phone', required: false },
      { key: 'admissionReason', label: 'Admission Reason', type: 'textarea', required: false },
    ],
  },
  resident_profile: {
    formType: 'resident_profile',
    version: '1.0',
    title: 'Resident Profile Form',
    description: 'Update or verify resident demographic & identity profile.',
    requiresClinicalReview: false,
    fields: [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: false },
      { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['male', 'female', 'other'] },
      { key: 'address', label: 'Permanent / Last Known Address', type: 'textarea', required: false },
      { key: 'documentNumberMasked', label: 'Masked ID Reference', type: 'text', required: false },
    ],
  },
  guardian_family: {
    formType: 'guardian_family',
    version: '1.0',
    title: 'Guardian & Family Details Form',
    description: 'Verified guardian and family linkage details.',
    requiresClinicalReview: false,
    fields: [
      { key: 'residentName', label: 'Resident Name', type: 'text', required: true },
      { key: 'guardianName', label: 'Guardian Full Name', type: 'text', required: true },
      { key: 'relationship', label: 'Relationship', type: 'text', required: true },
      { key: 'contactPhone', label: 'Contact Phone', type: 'phone', required: true },
      { key: 'address', label: 'Guardian Address', type: 'textarea', required: false },
    ],
  },
  emergency_contact: {
    formType: 'emergency_contact',
    version: '1.0',
    title: 'Emergency Contact Form',
    description: 'Verified emergency contact details for a resident.',
    requiresClinicalReview: false,
    fields: [
      { key: 'residentName', label: 'Resident Name', type: 'text', required: true },
      { key: 'contactName', label: 'Emergency Contact Name', type: 'text', required: true },
      { key: 'contactPhone', label: 'Emergency Phone', type: 'phone', required: true },
      { key: 'relationship', label: 'Relationship', type: 'text', required: false },
    ],
  },
  rescue_registration: {
    formType: 'rescue_registration',
    version: '1.0',
    title: 'Rescue Case Registration Form',
    description: 'Draft rescue intake form from verified rescue report.',
    requiresClinicalReview: false,
    fields: [
      { key: 'personIdentifier', label: 'Person Name / Identifier', type: 'text', required: true },
      { key: 'approximateAge', label: 'Approximate Age', type: 'number', required: false },
      { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['male', 'female', 'other'] },
      { key: 'rescueLocation', label: 'Rescue Location', type: 'text', required: true },
      { key: 'reportedByPhone', label: 'Reporter Phone', type: 'phone', required: false },
      { key: 'urgencyLevel', label: 'Urgency Level', type: 'select', required: true, options: ['low', 'medium', 'high', 'critical'] },
      { key: 'notes', label: 'Reported Circumstances', type: 'textarea', required: false },
    ],
  },
  document_verification: {
    formType: 'document_verification',
    version: '1.0',
    title: 'Document Verification Checklist',
    description: 'Administrative checklist confirming human verification of source document.',
    requiresClinicalReview: false,
    fields: [
      { key: 'documentCategory', label: 'Verified Category', type: 'text', required: true },
      { key: 'personName', label: 'Subject Name', type: 'text', required: true },
      { key: 'issuingAuthority', label: 'Issuing Authority', type: 'text', required: false },
      { key: 'identityMatched', label: 'Identity Matches Physical/Original Document', type: 'checkbox', required: true },
      { key: 'verificationNotes', label: 'Reviewer Notes', type: 'textarea', required: false },
    ],
  },
  medical_summary_review: {
    formType: 'medical_summary_review',
    version: '1.0',
    title: 'Medical Document Summary for Clinician Review',
    description: 'Non-diagnostic summary quoted strictly from source medical document for clinician sign-off.',
    requiresClinicalReview: true,
    fields: [
      { key: 'residentReference', label: 'Resident Name / Reference', type: 'text', required: true },
      { key: 'reportDate', label: 'Report Date', type: 'date', required: false },
      { key: 'hospitalOrClinic', label: 'Hospital / Clinic', type: 'text', required: false },
      { key: 'doctorName', label: 'Source Doctor Name', type: 'text', required: false },
      { key: 'observationsListed', label: 'Source-Quoted Observations', type: 'textarea', required: false },
      { key: 'medicationsListed', label: 'Source-Quoted Medications', type: 'textarea', required: false },
      { key: 'clinicianVerified', label: 'Clinician Confirmed Against Original Document', type: 'checkbox', required: true },
    ],
  },
};
