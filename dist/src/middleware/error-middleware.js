import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";
const localizeErrorMessage = (message, statusCode) => {
    if (statusCode >= 500 || /prisma|sql|database|stack|node_modules/i.test(message)) {
        return "Ocurrió un error interno.";
    }
    const exactTranslations = {
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
        "Route not found.": "No se encontró la ruta solicitada.",
        "Email template not found.": "No se encontró la plantilla de correo.",
        "A role with this name already exists.": "Ya existe un rol con ese nombre.",
        "A user with this email already exists.": "Ya existe un usuario con ese correo electrónico.",
        "An active invitation already exists for this email address.": "Ya existe una invitación activa para este correo electrónico.",
        "This invitation is invalid or no longer available.": "Esta invitación no es válida o ya no está disponible.",
        "This invitation has been revoked.": "Esta invitación fue revocada.",
        "This invitation has already been accepted.": "Esta invitación ya fue aceptada.",
        "This invitation has expired.": "Esta invitación venció.",
        "Accepted invitations cannot be revoked.": "Las invitaciones aceptadas no se pueden revocar.",
        "Only SUPER_ADMIN users can modify SUPER_ADMIN permissions.": "Solo los usuarios SUPER_ADMIN pueden modificar permisos SUPER_ADMIN.",
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
    function fieldName(value) {
        const normalized = value
            .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
            .replaceAll(/[_-]/g, " ")
            .toLowerCase();
        const labels = {
            "address id": "el identificador de la dirección",
            "client and address ids": "los identificadores del cliente y la dirección",
            "client and contact ids": "los identificadores del cliente y el contacto",
            "client id": "el identificador del cliente",
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
            "material id": "el identificador del material",
            "purchase order id": "el identificador de la orden de compra",
            "quotation id": "el identificador de la cotización",
            "role id": "el identificador del rol",
            "supplier id": "el identificador del proveedor",
            url: "URL",
            "user id": "el identificador del usuario",
            "warehouse id": "el identificador del almacén",
        };
        if (labels[normalized])
            return labels[normalized];
        const words = {
            address: "dirección",
            client: "cliente",
            code: "código",
            contact: "contacto",
            description: "descripción",
            file: "archivo",
            id: "identificador",
            material: "material",
            name: "nombre",
            order: "orden",
            permission: "permiso",
            project: "proyecto",
            purchase: "compra",
            quotation: "cotización",
            role: "rol",
            supplier: "proveedor",
            task: "tarea",
            user: "usuario",
            warehouse: "almacén",
        };
        return normalized.split(" ").map((word) => words[word] ?? word).join(" ");
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
    const alreadyExistsMatch = message.match(/^A[n]? (.+?) already exists\.?$/i);
    if (alreadyExistsMatch) {
        return `Ya existe ${fieldName(alreadyExistsMatch[1] ?? "el registro indicado")}.`;
    }
    const onlyMatch = message.match(/^Only (.+?) can (.+?)\.?$/i);
    if (onlyMatch) {
        return `Solo los registros indicados pueden ${/be (?:released|consumed|edited|deleted|cancelled)/i.test(onlyMatch[2] ?? "") ? "realizar esta acción" : "realizar esta operación"}.`;
    }
    const englishMessagePattern = /\b(?:is required|are required|must be|cannot be|could not|not found|already exists|only |one or more|selected|available|supported|failed|created|updated|deleted|changed|assigned|enabled|disabled|pending|accepted|expired|revoked|warehouse|supplier|material|quotation|project|purchase|inventory|production|installation|profile|cutting|price list|import|file|quantity|currency|description|name|title|code|date|password|email|role|user|notification|invitation)\b/i;
    if (englishMessagePattern.test(message)) {
        return statusCode === 401
            ? "No has iniciado sesión."
            : statusCode === 403
                ? "No tienes permiso para realizar esta acción."
                : "La información enviada no es válida.";
    }
    return message;
};
export const errorMiddleware = (error, _request, response, _next) => {
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
        const validationMessage = issues.length === 1
            ? issues[0]?.message ?? error.message
            : issues.length > 1
                ? issues
                    .map((issue) => issue.path.length > 0 ? `${issue.path}: ${issue.message}` : issue.message)
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
//# sourceMappingURL=error-middleware.js.map