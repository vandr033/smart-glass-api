import type { z } from "zod";

import type {
  cancelMeasurementRequestSchema,
  createMeasurementOpeningSchema,
  createMeasurementRequestSchema,
  createTechnicalObservationSchema,
  listMeasurementRequestsQuerySchema,
  measurementCalendarQuerySchema,
  measurementDecisionSchema,
  measurementEvidenceMetadataSchema,
  measurementOpeningIdParamSchema,
  measurementRequestIdParamSchema,
  reprogramMeasurementRequestSchema,
  resolveTechnicalObservationSchema,
  scheduleMeasurementRequestSchema,
  startMeasurementVisitSchema,
  submitMeasurementApprovalSchema,
  technicalObservationIdParamSchema,
  updateMeasurementOpeningSchema,
  updateMeasurementRequestSchema,
} from "./measurements.validators.js";

import type {
  MEASUREMENT_EVIDENCE_TYPES,
  MEASUREMENT_ELEMENT_TYPES,
  MEASUREMENT_OPENING_STATUSES,
  MEASUREMENT_REQUEST_STATUSES,
  MEASUREMENT_VISIT_RESULTS,
  MEASUREMENT_VISIT_STATUSES,
  TECHNICAL_OBSERVATION_SEVERITIES,
  TECHNICAL_OBSERVATION_STATUSES,
  TECHNICAL_OBSERVATION_TYPES,
} from "./measurements.constants.js";

export type MeasurementRequestStatus = (typeof MEASUREMENT_REQUEST_STATUSES)[number];
export type MeasurementVisitStatus = (typeof MEASUREMENT_VISIT_STATUSES)[number];
export type MeasurementVisitResult = (typeof MEASUREMENT_VISIT_RESULTS)[number];
export type MeasurementElementType = (typeof MEASUREMENT_ELEMENT_TYPES)[number];
export type MeasurementOpeningStatus = (typeof MEASUREMENT_OPENING_STATUSES)[number];
export type MeasurementEvidenceType = (typeof MEASUREMENT_EVIDENCE_TYPES)[number];
export type TechnicalObservationType = (typeof TECHNICAL_OBSERVATION_TYPES)[number];
export type TechnicalObservationSeverity =
  (typeof TECHNICAL_OBSERVATION_SEVERITIES)[number];
export type TechnicalObservationStatus =
  (typeof TECHNICAL_OBSERVATION_STATUSES)[number];

export type MeasurementUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type MeasurementClientSummary = {
  clientType: "COMPANY" | "INDIVIDUAL";
  displayName: string;
  id: string;
};

export type MeasurementProjectSummary = {
  code: string;
  id: string;
  status: string;
  title: string;
} | null;

export type MeasurementAddressSummary = {
  address: string | null;
  city: string | null;
  id: string | null;
  label: string;
  latitude: number | null;
  longitude: number | null;
} | null;

export type MeasurementQuotationSummary = {
  code: string;
  id: string;
  status: string;
}[];

export type MeasurementProductionJobSummary = {
  code: string;
  id: string;
  status: string;
}[];

export type MeasurementEvidenceRecord = {
  description: string | null;
  fileName: string;
  fileUrl: string;
  id: string;
  measurementOpeningId: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  type: MeasurementEvidenceType;
  uploadedAt: string;
  uploadedByUser: MeasurementUserSummary;
};

export type MeasurementOpeningRecord = {
  code: string;
  createdAt: string;
  depthMm: number | null;
  elementType: MeasurementElementType;
  environment: string;
  evidence: MeasurementEvidenceRecord[];
  heightMm: number;
  id: string;
  observations: string | null;
  quantity: number;
  requiresCorrection: boolean;
  status: MeasurementOpeningStatus;
  updatedAt: string;
  widthMm: number;
};

export type TechnicalObservationRecord = {
  createdAt: string;
  createdByUser: MeasurementUserSummary;
  description: string;
  id: string;
  resolvedAt: string | null;
  resolvedByUser: MeasurementUserSummary;
  severity: TechnicalObservationSeverity;
  status: TechnicalObservationStatus;
  type: TechnicalObservationType;
  updatedAt: string;
};

export type MeasurementVisitRecord = {
  createdAt: string;
  evidence: MeasurementEvidenceRecord[];
  finishedAt: string | null;
  generalObservations: string | null;
  id: string;
  locationConfirmed: boolean;
  observations: TechnicalObservationRecord[];
  openings: MeasurementOpeningRecord[];
  result: MeasurementVisitResult;
  startedAt: string | null;
  status: MeasurementVisitStatus;
  technician: MeasurementUserSummary;
  updatedAt: string;
};

export type MeasurementStatusHistoryRecord = {
  changedByUser: MeasurementUserSummary;
  createdAt: string;
  fromStatus: MeasurementRequestStatus | null;
  id: string;
  metadataJson: unknown;
  notes: string | null;
  toStatus: MeasurementRequestStatus;
};

export type MeasurementRequestListItem = {
  address: MeasurementAddressSummary;
  approvedAt: string | null;
  approvedByUser: MeasurementUserSummary;
  assignedTechnician: MeasurementUserSummary;
  client: MeasurementClientSummary;
  code: string;
  createdAt: string;
  evidenceCount: number;
  hasScheduleConflict: boolean;
  id: string;
  latestVisit: {
    id: string;
    result: MeasurementVisitResult;
    status: MeasurementVisitStatus;
  } | null;
  observations: string | null;
  openingCount: number;
  openObservationCount: number;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  productionJobCount: number;
  project: MeasurementProjectSummary;
  quotationCount: number;
  rejectedAt: string | null;
  requestedDate: string;
  scheduledDate: string | null;
  scheduledEndTime: string | null;
  scheduledStartTime: string | null;
  status: MeasurementRequestStatus;
  updatedAt: string;
  visitCount: number;
};

export type MeasurementRequestDetailRecord = MeasurementRequestListItem & {
  alerts: {
    production: string[];
    quotation: string[];
  };
  createdByUser: MeasurementUserSummary;
  productionJobs: MeasurementProductionJobSummary;
  quotations: MeasurementQuotationSummary;
  statusHistory: MeasurementStatusHistoryRecord[];
  visits: MeasurementVisitRecord[];
};

export type CreateMeasurementRequestInput = z.infer<typeof createMeasurementRequestSchema>;
export type UpdateMeasurementRequestInput = z.infer<typeof updateMeasurementRequestSchema>;
export type ScheduleMeasurementRequestInput = z.infer<
  typeof scheduleMeasurementRequestSchema
>;
export type ReprogramMeasurementRequestInput = z.infer<
  typeof reprogramMeasurementRequestSchema
>;
export type CancelMeasurementRequestInput = z.infer<typeof cancelMeasurementRequestSchema>;
export type StartMeasurementVisitInput = z.infer<typeof startMeasurementVisitSchema>;
export type SubmitMeasurementApprovalInput = z.infer<
  typeof submitMeasurementApprovalSchema
>;
export type MeasurementDecisionInput = z.infer<typeof measurementDecisionSchema>;
export type CreateMeasurementOpeningInput = z.infer<typeof createMeasurementOpeningSchema>;
export type UpdateMeasurementOpeningInput = z.infer<typeof updateMeasurementOpeningSchema>;
export type CreateTechnicalObservationInput = z.infer<
  typeof createTechnicalObservationSchema
>;
export type ResolveTechnicalObservationInput = z.infer<
  typeof resolveTechnicalObservationSchema
>;
export type MeasurementEvidenceMetadataInput = z.infer<
  typeof measurementEvidenceMetadataSchema
>;
export type ListMeasurementRequestsQuery = z.infer<
  typeof listMeasurementRequestsQuerySchema
>;
export type MeasurementCalendarQuery = z.infer<typeof measurementCalendarQuerySchema>;
export type MeasurementRequestIdParams = z.infer<typeof measurementRequestIdParamSchema>;
export type MeasurementOpeningIdParams = z.infer<typeof measurementOpeningIdParamSchema>;
export type TechnicalObservationIdParams = z.infer<
  typeof technicalObservationIdParamSchema
>;
