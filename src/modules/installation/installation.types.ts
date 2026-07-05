import type { z } from "zod";

import type {
  assignInstallationOrderSchema,
  changeInstallationStatusSchema,
  createInstallationIssueSchema,
  createInstallationOrderSchema,
  installationCalendarQuerySchema,
  installationEvidenceMetadataSchema,
  installationOrderIdParamSchema,
  installationTaskIdParamSchema,
  installationTeamIdParamSchema,
  installationTeamMutationSchema,
  listInstallationOrdersQuerySchema,
  projectIdParamSchema,
  quotationIdParamSchema,
  resolveInstallationIssueSchema,
  rescheduleInstallationOrderSchema,
  updateInstallationOrderSchema,
  updateInstallationTaskSchema,
} from "./installation.validators.js";

import type {
  INSTALLATION_EVIDENCE_TYPES,
  INSTALLATION_ISSUE_SEVERITIES,
  INSTALLATION_ISSUE_STATUSES,
  INSTALLATION_ISSUE_TYPES,
  INSTALLATION_ORDER_STATUSES,
  INSTALLATION_PRIORITIES,
  INSTALLATION_TASK_STATUSES,
  INSTALLATION_TEAM_STATUSES,
} from "./installation.constants.js";

export type InstallationPriority = (typeof INSTALLATION_PRIORITIES)[number];
export type InstallationOrderStatus = (typeof INSTALLATION_ORDER_STATUSES)[number];
export type InstallationTeamStatus = (typeof INSTALLATION_TEAM_STATUSES)[number];
export type InstallationTaskStatus = (typeof INSTALLATION_TASK_STATUSES)[number];
export type InstallationEvidenceType = (typeof INSTALLATION_EVIDENCE_TYPES)[number];
export type InstallationIssueType = (typeof INSTALLATION_ISSUE_TYPES)[number];
export type InstallationIssueSeverity = (typeof INSTALLATION_ISSUE_SEVERITIES)[number];
export type InstallationIssueStatus = (typeof INSTALLATION_ISSUE_STATUSES)[number];

export type CreateInstallationOrderInput = z.infer<typeof createInstallationOrderSchema>;
export type UpdateInstallationOrderInput = z.infer<typeof updateInstallationOrderSchema>;
export type AssignInstallationOrderInput = z.infer<typeof assignInstallationOrderSchema>;
export type RescheduleInstallationOrderInput = z.infer<
  typeof rescheduleInstallationOrderSchema
>;
export type ChangeInstallationStatusInput = z.infer<typeof changeInstallationStatusSchema>;
export type UpdateInstallationTaskInput = z.infer<typeof updateInstallationTaskSchema>;
export type CreateInstallationIssueInput = z.infer<typeof createInstallationIssueSchema>;
export type ResolveInstallationIssueInput = z.infer<typeof resolveInstallationIssueSchema>;
export type InstallationEvidenceMetadataInput = z.infer<
  typeof installationEvidenceMetadataSchema
>;
export type InstallationTeamMutationInput = z.infer<typeof installationTeamMutationSchema>;
export type ListInstallationOrdersQuery = z.infer<typeof listInstallationOrdersQuerySchema>;
export type InstallationCalendarQuery = z.infer<typeof installationCalendarQuerySchema>;
export type InstallationOrderIdParams = z.infer<typeof installationOrderIdParamSchema>;
export type InstallationTeamIdParams = z.infer<typeof installationTeamIdParamSchema>;
export type InstallationTaskIdParams = z.infer<typeof installationTaskIdParamSchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamSchema>;
export type QuotationIdParams = z.infer<typeof quotationIdParamSchema>;
