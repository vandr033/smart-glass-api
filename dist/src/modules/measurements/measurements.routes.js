import multer from "multer";
import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAnyPermission, requirePermission, } from "../../middleware/authorization-middleware.js";
import { measurementsController } from "./measurements.controller.js";
import { MEASUREMENTS_CALENDAR_API_PATH, MEASUREMENTS_OBSERVATIONS_API_PATH, MEASUREMENTS_OPENINGS_API_PATH, MEASUREMENTS_PERMISSIONS, MEASUREMENT_REQUESTS_API_PATH, } from "./measurements.constants.js";
const upload = multer({
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    storage: multer.memoryStorage(),
});
export const measurementsRouter = Router();
measurementsRouter.get(MEASUREMENTS_CALENDAR_API_PATH, requirePermission(MEASUREMENTS_PERMISSIONS.view), asyncHandler(measurementsController.listMeasurementCalendar));
measurementsRouter.get(MEASUREMENT_REQUESTS_API_PATH, requirePermission(MEASUREMENTS_PERMISSIONS.view), asyncHandler(measurementsController.listMeasurementRequests));
measurementsRouter.post(MEASUREMENT_REQUESTS_API_PATH, requirePermission(MEASUREMENTS_PERMISSIONS.create), asyncHandler(measurementsController.createMeasurementRequest));
measurementsRouter.get(`${MEASUREMENT_REQUESTS_API_PATH}/:id`, requirePermission(MEASUREMENTS_PERMISSIONS.view), asyncHandler(measurementsController.getMeasurementRequestById));
measurementsRouter.put(`${MEASUREMENT_REQUESTS_API_PATH}/:id`, requirePermission(MEASUREMENTS_PERMISSIONS.update), asyncHandler(measurementsController.updateMeasurementRequest));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/schedule`, requireAnyPermission([
    MEASUREMENTS_PERMISSIONS.schedule,
    MEASUREMENTS_PERMISSIONS.assign,
]), asyncHandler(measurementsController.scheduleMeasurementRequest));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/reprogram`, requirePermission(MEASUREMENTS_PERMISSIONS.schedule), asyncHandler(measurementsController.reprogramMeasurementRequest));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/cancel`, requirePermission(MEASUREMENTS_PERMISSIONS.update), asyncHandler(measurementsController.cancelMeasurementRequest));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/start-visit`, requirePermission(MEASUREMENTS_PERMISSIONS.execute), asyncHandler(measurementsController.startMeasurementVisit));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/openings`, requirePermission(MEASUREMENTS_PERMISSIONS.execute), asyncHandler(measurementsController.createMeasurementOpening));
measurementsRouter.put(`${MEASUREMENTS_OPENINGS_API_PATH}/:openingId`, requirePermission(MEASUREMENTS_PERMISSIONS.update), asyncHandler(measurementsController.updateMeasurementOpening));
measurementsRouter.post(`${MEASUREMENTS_OPENINGS_API_PATH}/:openingId/duplicate`, requirePermission(MEASUREMENTS_PERMISSIONS.update), asyncHandler(measurementsController.duplicateMeasurementOpening));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/evidence`, requirePermission(MEASUREMENTS_PERMISSIONS.execute), upload.single("file"), asyncHandler(measurementsController.uploadMeasurementEvidence));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/observations`, requirePermission(MEASUREMENTS_PERMISSIONS.execute), asyncHandler(measurementsController.createTechnicalObservation));
measurementsRouter.post(`${MEASUREMENTS_OBSERVATIONS_API_PATH}/:observationId/resolve`, requirePermission(MEASUREMENTS_PERMISSIONS.update), asyncHandler(measurementsController.resolveTechnicalObservation));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/submit-approval`, requirePermission(MEASUREMENTS_PERMISSIONS.execute), asyncHandler(measurementsController.submitMeasurementForApproval));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/approve`, requirePermission(MEASUREMENTS_PERMISSIONS.approve), asyncHandler(measurementsController.approveMeasurementRequest));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/reject`, requirePermission(MEASUREMENTS_PERMISSIONS.reject), asyncHandler(measurementsController.rejectMeasurementRequest));
measurementsRouter.post(`${MEASUREMENT_REQUESTS_API_PATH}/:id/create-quotation`, requirePermission(MEASUREMENTS_PERMISSIONS.approve), asyncHandler(measurementsController.createQuotationFromMeasurement));
//# sourceMappingURL=measurements.routes.js.map