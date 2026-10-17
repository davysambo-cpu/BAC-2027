import cookie from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import {
  activateInvitationRequestSchema,
  completePasswordResetRequestSchema,
  createInvitationRequestSchema,
  createResetCodeRequestSchema,
  loginRequestSchema,
  updateProfileRequestSchema,
  updateUserStatusRequestSchema,
  uuidSchema,
} from "@bac-2027/contracts";

import type { Environment } from "../../config/env";
import type { AuthService, AuthenticationResult } from "./auth.service";
import { sessionTokenFromRequest } from "./auth.transport";

interface AuthRoutesOptions {
  authService: AuthService;
  environment: Environment;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { authService, environment },
) => {
  await app.register(cookie);

  const cookieOptions = environment.EMBEDDED_PREVIEW_MODE
    ? {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "none" as const,
        partitioned: true,
      }
    : {
        path: "/",
        httpOnly: true,
        secure: environment.NODE_ENV === "production",
        sameSite: "lax" as const,
      };

  function writeSessionCookie(reply: FastifyReply, authentication: AuthenticationResult) {
    const expiresAt = new Date(authentication.session.expiresAt);
    const options = cookieOptions;
    if (authentication.session.deviceType === "personal") {
      reply.setCookie(environment.SESSION_COOKIE_NAME, authentication.sessionToken, {
        ...options,
        expires: expiresAt,
      });
    } else {
      reply.setCookie(environment.SESSION_COOKIE_NAME, authentication.sessionToken, options);
    }
  }

  function publicAuthentication(reply: FastifyReply, authentication: AuthenticationResult) {
    reply.header("Cache-Control", "no-store");
    return {
      user: authentication.user,
      session: authentication.session,
      ...(environment.EMBEDDED_PREVIEW_MODE
        ? { sessionAccessToken: authentication.sessionToken }
        : {}),
    };
  }

  async function currentSession(request: FastifyRequest) {
    return authService.authenticate(sessionTokenFromRequest(request, environment));
  }

  app.post(
    "/api/v1/auth/login",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const input = loginRequestSchema.parse(request.body);
      const authentication = await authService.login(input);
      writeSessionCookie(reply, authentication);
      return publicAuthentication(reply, authentication);
    },
  );

  app.post(
    "/api/v1/auth/activate",
    {
      config: { rateLimit: { max: 5, timeWindow: "5 minutes" } },
    },
    async (request, reply) => {
      const input = activateInvitationRequestSchema.parse(request.body);
      const authentication = await authService.activateInvitation(
        input.token,
        input.password,
        input.deviceType,
      );
      writeSessionCookie(reply, authentication);
      return publicAuthentication(reply, authentication);
    },
  );

  app.post(
    "/api/v1/auth/reset/complete",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const input = completePasswordResetRequestSchema.parse(request.body);
      const authentication = await authService.completePasswordReset(input);
      writeSessionCookie(reply, authentication);
      return publicAuthentication(reply, authentication);
    },
  );

  app.get("/api/v1/auth/me", async (request) => {
    const session = await currentSession(request);
    return {
      user: session.user,
      session: {
        deviceType: session.session.deviceType,
        expiresAt: session.session.expiresAt.toISOString(),
      },
    };
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    await authService.logout(sessionTokenFromRequest(request, environment));
    reply.clearCookie(environment.SESSION_COOKIE_NAME, cookieOptions);
    return reply.status(204).send();
  });

  app.get("/api/v1/profile", async (request) => {
    const session = await currentSession(request);
    return { user: session.user, preferences: session.preferences };
  });

  app.patch("/api/v1/profile", async (request) => {
    const session = await currentSession(request);
    const input = updateProfileRequestSchema.parse(request.body);
    return authService.updateProfile(session, input);
  });

  app.get("/api/v1/admin/users", async (request) => {
    const session = await currentSession(request);
    return { users: await authService.listAccounts(session.user) };
  });

  app.post("/api/v1/admin/invitations", async (request, reply) => {
    const session = await currentSession(request);
    const input = createInvitationRequestSchema.parse(request.body);
    const invitation = await authService.createInvitation(session.user, input);
    return reply.status(201).send(invitation);
  });

  app.post("/api/v1/admin/reset-codes", async (request, reply) => {
    const session = await currentSession(request);
    const { userId } = createResetCodeRequestSchema.parse(request.body);
    const resetCode = await authService.createResetCode(session.user, userId);
    return reply.status(201).send(resetCode);
  });

  app.patch("/api/v1/admin/users/:userId/status", async (request) => {
    const session = await currentSession(request);
    const userId = uuidSchema.parse((request.params as { userId?: unknown }).userId);
    const { status } = updateUserStatusRequestSchema.parse(request.body);
    return authService.updateAccountStatus(session.user, userId, status);
  });
};
