import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import {
  QUOTATION_APPROVALS_API_PATH,
  QUOTATION_ITEMS_API_PATH,
  QUOTATION_PERMISSIONS,
  QUOTATIONS_API_PATH,
} from "./quotations.constants.js";
import { quotationsController } from "./quotations.controller.js";

export const quotationsRouter = Router();

quotationsRouter.get(
  QUOTATIONS_API_PATH,
  requirePermission(QUOTATION_PERMISSIONS.read),
  asyncHandler(quotationsController.listQuotations),
);

quotationsRouter.get(
  `${QUOTATIONS_API_PATH}/:id`,
  requirePermission(QUOTATION_PERMISSIONS.read),
  asyncHandler(quotationsController.getQuotationById),
);

quotationsRouter.post(
  QUOTATIONS_API_PATH,
  requirePermission(QUOTATION_PERMISSIONS.create),
  asyncHandler(quotationsController.createQuotation),
);

quotationsRouter.put(
  `${QUOTATIONS_API_PATH}/:id`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.updateQuotation),
);

quotationsRouter.delete(
  `${QUOTATIONS_API_PATH}/:id`,
  requirePermission(QUOTATION_PERMISSIONS.delete),
  asyncHandler(quotationsController.deleteQuotation),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/items/template`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.addTemplateItem),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/items/manual-material`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.addManualMaterialItem),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/items/manual-service`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.addManualServiceItem),
);

quotationsRouter.put(
  `${QUOTATION_ITEMS_API_PATH}/:itemId`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.updateQuotationItem),
);

quotationsRouter.delete(
  `${QUOTATION_ITEMS_API_PATH}/:itemId`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.deleteQuotationItem),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/recalculate`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.recalculateQuotation),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/create-version`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.createQuotationVersion),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/submit-approval`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.submitQuotationForApproval),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/approve`,
  requirePermission(QUOTATION_PERMISSIONS.approve),
  asyncHandler(quotationsController.approveQuotation),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/reject`,
  requirePermission(QUOTATION_PERMISSIONS.approve),
  asyncHandler(quotationsController.rejectQuotation),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/change-status`,
  requirePermission(QUOTATION_PERMISSIONS.update),
  asyncHandler(quotationsController.changeQuotationStatus),
);

quotationsRouter.get(
  `${QUOTATIONS_API_PATH}/:id/versions`,
  requirePermission(QUOTATION_PERMISSIONS.read),
  asyncHandler(quotationsController.listQuotationVersions),
);

quotationsRouter.get(
  `${QUOTATIONS_API_PATH}/:id/approvals`,
  requirePermission(QUOTATION_PERMISSIONS.read),
  asyncHandler(quotationsController.listQuotationApprovals),
);

quotationsRouter.get(
  `${QUOTATION_APPROVALS_API_PATH}/pending`,
  requirePermission(QUOTATION_PERMISSIONS.approve),
  asyncHandler(quotationsController.listPendingApprovals),
);

quotationsRouter.post(
  `${QUOTATIONS_API_PATH}/:id/export-pdf`,
  requirePermission(QUOTATION_PERMISSIONS.exportPdf),
  asyncHandler(quotationsController.exportQuotationPdf),
);

quotationsRouter.get(
  `${QUOTATIONS_API_PATH}/:id/pdf/commercial`,
  requirePermission(QUOTATION_PERMISSIONS.exportPdf),
  asyncHandler(quotationsController.downloadCommercialPdf),
);

quotationsRouter.get(
  `${QUOTATIONS_API_PATH}/:id/pdf/internal`,
  requirePermission(QUOTATION_PERMISSIONS.exportPdf),
  asyncHandler(quotationsController.downloadInternalPdf),
);
