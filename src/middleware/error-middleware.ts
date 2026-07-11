import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";

const localizeErrorMessage = (message: string, statusCode: number): string => {
  if (statusCode >= 500 || /prisma|sql|database|stack|node_modules/i.test(message)) {
    return "Ocurrió un error interno.";
  }

  const exactTranslations: Record<string, string> = {
    "Unauthorized": "No has iniciado sesión.",
    "Forbidden": "No tienes permiso para realizar esta acción.",
    "Access denied": "Acceso denegado.",
    "Invalid credentials": "Las credenciales no son correctas.",
    "Invalid request": "La solicitud no es válida.",
    "Validation failed": "La información enviada no es válida.",
    "Internal server error": "Ocurrió un error interno.",
    "Resource already exists": "El registro ya existe.",
    "Conflict": "El registro fue modificado por otro usuario.",
    "File too large": "El archivo supera el tamaño permitido.",
    "Unsupported file type": "El tipo de archivo no está permitido.",
  };

  const exactTranslation = exactTranslations[message];
  if (exactTranslation) {
    return exactTranslation;
  }

  const notFoundMatch = message.match(/^(.+?) not found\.?$/i);
  if (notFoundMatch) {
    return `No se encontró ${fieldName(notFoundMatch[1] ?? "el recurso")}.`;
  }

  const requiredMatch = message.match(/^(.+?) is required\.?$/i);
  if (requiredMatch) {
    return `El campo ${fieldName(requiredMatch[1] ?? "indicado")} es obligatorio.`;
  }

  function fieldName(value: string): string {
    const normalized = value
      .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll(/[_-]/g, " ")
      .toLowerCase();
    const labels: Record<string, string> = {
      client: "cliente",
      code: "código",
      currency: "moneda",
      date: "fecha",
      description: "descripción",
      email: "correo electrónico",
      material: "material",
      name: "nombre",
      password: "contraseña",
      project: "proyecto",
      quantity: "cantidad",
      title: "título",
      user: "usuario",
      role: "rol",
      invitation: "invitación",
      url: "URL",
    };
    return labels[normalized] ?? normalized;
  }

  const lengthMatch = message.match(/^(.+?) must be (\d+) characters or fewer\.?$/i);
  if (lengthMatch) {
    return `${fieldName(lengthMatch[1] ?? "El campo")} debe tener como máximo ${lengthMatch[2] ?? ""} caracteres.`;
  }

  const validNumberMatch = message.match(/^(.+?) must be a valid number\.?$/i);
  if (validNumberMatch) {
    return `${fieldName(validNumberMatch[1] ?? "El campo")} debe ser un número válido.`;
  }

  const wholeNumberMatch = message.match(/^(.+?) must be a whole number\.?$/i);
  if (wholeNumberMatch) {
    return `${fieldName(wholeNumberMatch[1] ?? "El campo")} debe ser un número entero.`;
  }

  const lowerBoundMatch = message.match(/^(.+?) must be at least (.+)\.?$/i);
  if (lowerBoundMatch) {
    return `${fieldName(lowerBoundMatch[1] ?? "El campo")} debe ser como mínimo ${lowerBoundMatch[2] ?? "el valor indicado"}.`;
  }

  const upperBoundMatch = message.match(/^(.+?) must be at most (.+)\.?$/i);
  if (upperBoundMatch) {
    return `${fieldName(upperBoundMatch[1] ?? "El campo")} debe ser como máximo ${upperBoundMatch[2] ?? "el valor indicado"}.`;
  }

  if (/valid email address/i.test(message)) {
    return "Ingrese un correo electrónico válido.";
  }

  if (/valid url/i.test(message)) {
    return "Ingrese una URL válida.";
  }

  if (/valid date/i.test(message)) {
    return "Ingrese una fecha válida.";
  }

  return message;
};

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

    sendError(response, localizeErrorMessage(validationMessage, 400), 400, issues);
    return;
  }

  if (error instanceof AppError) {
    logger.warn(error.message);
    sendError(response, localizeErrorMessage(error.message, error.statusCode), error.statusCode);
    return;
  }

  const errorMessage = error instanceof Error ? error.message : "Ocurrió un error interno.";

  logger.error("Unhandled application error.", {
    message: errorMessage,
  });

  sendError(response, localizeErrorMessage(errorMessage, 500), 500);
};
