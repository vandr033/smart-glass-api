const getForwardedIpAddress = (request) => {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0]?.trim() ?? null;
    }
    if (Array.isArray(forwardedFor)) {
        return forwardedFor[0]?.split(",")[0]?.trim() ?? null;
    }
    return null;
};
export const getRequestIpAddress = (request) => {
    return getForwardedIpAddress(request) ?? request.ip ?? null;
};
export const getRequestUserAgent = (request) => {
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
export const getRequestLogActorContext = (request) => {
    return {
        ipAddress: getRequestIpAddress(request),
        roleNames: request.authorizationSummary?.roles ?? [],
        userId: request.authSession?.user.id ?? null,
        userAgent: getRequestUserAgent(request),
    };
};
//# sourceMappingURL=request-context.js.map