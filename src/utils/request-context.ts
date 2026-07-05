import type { Request } from "express";

import type { LogActorContext } from "../services/logging-utils.js";

const getForwardedIpAddress = (request: Request): string | null => {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(",")[0]?.trim() ?? null;
  }

  return null;
};

export const getRequestIpAddress = (request: Request): string | null => {
  return getForwardedIpAddress(request) ?? request.ip ?? null;
};

export const getRequestUserAgent = (request: Request): string | null => {
  const userAgent = request.headers["user-agent"];

  if (typeof userAgent === "string") {
    return userAgent.trim() || null;
  }

  if (Array.isArray(userAgent)) {
    const firstUserAgent = String(userAgent[0] ?? "");
    return firstUserAgent.trim() || null;
  }

  return null;
};

export const getRequestLogActorContext = (request: Request): LogActorContext => {
  return {
    ipAddress: getRequestIpAddress(request),
    roleNames: request.authorizationSummary?.roles ?? [],
    userId: request.authSession?.user.id ?? null,
    userAgent: getRequestUserAgent(request),
  };
};
