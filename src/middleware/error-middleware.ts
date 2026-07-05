import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  void _next;

  if (response.headersSent) {
    return;
  }

  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    const validationMessage =
      issues.length === 1
        ? issues[0]?.message ?? error.message
        : issues.length > 1
          ? issues
              .map((issue) =>
                issue.path.length > 0 ? `${issue.path}: ${issue.message}` : issue.message,
              )
              .join("; ")
          : error.message;

    logger.warn("Request validation failed.", { issues });

    sendError(response, validationMessage, 400, issues);
    return;
  }

  if (error instanceof AppError) {
    logger.warn(error.message);
    sendError(response, error.message, error.statusCode);
    return;
  }

  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  logger.error("Unhandled application error.", {
    message: errorMessage,
  });

  sendError(response, errorMessage, 500);
};
