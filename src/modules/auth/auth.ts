import { prismaAdapter } from "@better-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Response } from "express";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { toNodeHandler } from "better-auth/node";

import { emailService } from "../../emails/EmailService.js";
import { activityLogService } from "../../services/activity-log-service.js";
import { notificationService } from "../../services/notification-service.js";
import { env } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../utils/prisma.js";

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const runBestEffortAuthSideEffect = async (
  label: string,
  effect: () => Promise<void>,
  meta?: Record<string, unknown>,
): Promise<void> => {
  try {
    await effect();
  } catch (error) {
    logger.error(`Auth side effect failed: ${label}.`, {
      ...meta,
      error: getErrorMessage(error),
    });
  }
};

const syncCredentialPassword = async (
  userId: string,
  password: string | null | undefined,
): Promise<void> => {
  if (!password) {
    return;
  }

  await prisma.user.update({
    data: {
      password,
    },
    where: {
      id: userId,
    },
  });
};

const getRequestIpAddress = (request?: Request): string | null => {
  if (!request) {
    return null;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
};

const getRequestEmail = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null || !("email" in body)) {
    return null;
  }

  const email = body["email"];
  return typeof email === "string" && email.trim().length > 0 ? email.trim() : null;
};

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "mysql",
    transaction: true,
  }),
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          if (account.providerId === "credential") {
            await runBestEffortAuthSideEffect(
              "sync credential password after account create",
              async () => {
                await syncCredentialPassword(account.userId, account.password);
              },
              {
                providerId: account.providerId,
                userId: account.userId,
              },
            );
          }
        },
      },
      update: {
        after: async (account) => {
          if (account.providerId === "credential") {
            await runBestEffortAuthSideEffect(
              "sync credential password after account update",
              async () => {
                await syncCredentialPassword(account.userId, account.password);
              },
              {
                providerId: account.providerId,
                userId: account.userId,
              },
            );
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await runBestEffortAuthSideEffect("update last login timestamp", async () => {
            await prisma.user.update({
              data: {
                lastLoginAt: new Date(),
              },
              where: {
                id: session.userId,
              },
            });
          }, {
            userId: session.userId,
          });
        },
      },
    },
  },
  emailAndPassword: {
    autoSignIn: false,
    enabled: true,
    onPasswordReset: async ({ user }) => {
      void notificationService
        .create({
          message:
            "Your password was reset successfully. If this wasn't you, contact support immediately.",
          title: "Password reset",
          type: "warning",
          userId: user.id,
        })
        .catch((error: unknown) => {
          logger.error("Failed to create password reset notification.", {
            error: error instanceof Error ? error.message : String(error),
            userId: user.id,
          });
        });
    },
    password: {
      hash: async (password) => bcrypt.hash(password, 12),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ url, user }) => {
      await emailService.sendTemplate({
        template: "passwordReset",
        to: user.email,
        variables: {
          expiresIn: "60 minutes",
          resetLink: url,
          userName: user.name,
        },
      });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ url, user }) => {
      await emailService.sendTemplate({
        template: "emailVerification",
        to: user.email,
        variables: {
          userName: user.name,
          verificationLink: url,
        },
      });
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const ipAddress = getRequestIpAddress(ctx.request);
      const email = getRequestEmail(ctx.body);
      const newSession = ctx.context.newSession;
      const response = ctx.context.returned;

      if (ctx.path === "/sign-in/email") {
        if (response instanceof APIError) {
          await runBestEffortAuthSideEffect("record login failure activity log", async () => {
            await activityLogService.logSystemEvent({
              action: "Login failure",
              entityType: "authentication",
              ipAddress,
              metadata: {
                email,
                reason: response.message,
                summary: email
                  ? `A login attempt failed for ${email}.`
                  : "A login attempt failed.",
              },
            });
          }, {
            email,
            path: ctx.path,
          });

          return;
        }

        if (newSession) {
          await runBestEffortAuthSideEffect("record login success activity log", async () => {
            await activityLogService.logUserAction({
              action: "Login success",
              entityId: newSession.user.id,
              entityType: "authentication",
              ipAddress: newSession.session.ipAddress ?? ipAddress ?? null,
              metadata: {
                email: newSession.user.email,
                summary: `${newSession.user.email} signed in successfully.`,
              },
              userId: newSession.user.id,
            });
          }, {
            path: ctx.path,
            userId: newSession.user.id,
          });
        }

        return;
      }

      const currentSession = ctx.context.session;

      if (ctx.path === "/sign-out" && !(response instanceof APIError) && currentSession) {
        await runBestEffortAuthSideEffect("record logout activity log", async () => {
          await activityLogService.logUserAction({
            action: "Logout success",
            entityId: currentSession.user.id,
            entityType: "authentication",
            ipAddress: currentSession.session.ipAddress ?? ipAddress ?? null,
            metadata: {
              email: currentSession.user.email,
              summary: `${currentSession.user.email} signed out successfully.`,
            },
            userId: currentSession.user.id,
          });
        }, {
          path: ctx.path,
          userId: currentSession.user.id,
        });

        return;
      }

      if (ctx.path === "/sign-up/email" && !(response instanceof APIError) && newSession) {
        await runBestEffortAuthSideEffect("record sign-up activity log", async () => {
          await activityLogService.logUserAction({
            action: "User created",
            entityId: newSession.user.id,
            entityType: "user",
            ipAddress: newSession.session.ipAddress ?? ipAddress ?? null,
            metadata: {
              email: newSession.user.email,
              summary: `${newSession.user.email} registered a new account.`,
            },
            userId: newSession.user.id,
          });
        }, {
          path: ctx.path,
          userId: newSession.user.id,
        });
      }
    }),
  },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],
  user: {
    fields: {
      image: "avatar",
    },
  },
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export const authHandler = toNodeHandler(auth);

export const appendAuthHeaders = (
  response: Response,
  headers: Headers,
): void => {
  const headerBag = headers as Headers & {
    getSetCookie?: () => string[];
  };

  for (const setCookie of headerBag.getSetCookie?.() ?? []) {
    response.append("set-cookie", setCookie);
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      return;
    }

    response.append(key, value);
  });
};

logger.info("Better Auth configured.", {
  baseUrl: env.BETTER_AUTH_URL,
});
