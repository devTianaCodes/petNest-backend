import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { comparePassword, hashPassword } from "../../utils/auth.js";
import { AppError } from "../../utils/http.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/tokens.js";
import { env, isProduction } from "../../config/env.js";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  };
}

async function persistRefreshToken(rawToken: string, tokenHash: string, userId: string, req: Request) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      userAgent: req.headers["user-agent"] ?? null,
      ipAddress: req.ip
    }
  });

  return rawToken;
}

export async function registerUser(input: { fullName: string; email: string; password: string }) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    throw new AppError(409, "An account with this email already exists");
  }

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash: await hashPassword(input.password)
    }
  });

  const token = crypto.randomBytes(32).toString("hex");

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  return {
    user,
    verificationUrl: `${env.APP_BASE_URL}/verify-email?token=${token}`
  };
}

export async function loginUser(input: { email: string; password: string }, req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isValidPassword = await comparePassword(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, "Invalid email or password");
  }

  const authUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified
  };

  const accessToken = signAccessToken(authUser);
  const refreshToken = signRefreshToken(user.id);

  await persistRefreshToken(refreshToken.rawToken, refreshToken.tokenHash, user.id, req);

  res.cookie("refreshToken", refreshToken.rawToken, refreshCookieOptions());

  return {
    accessToken,
    user: authUser
  };
}

export async function logoutUser(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken as string | undefined;

  if (refreshToken) {
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  res.clearCookie("refreshToken", refreshCookieOptions());
}

export async function refreshSession(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken as string | undefined;

  if (!refreshToken) {
    throw new AppError(401, "Refresh token missing");
  }

  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token is invalid");
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() }
  });

  const authUser = {
    id: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
    status: storedToken.user.status,
    isEmailVerified: storedToken.user.isEmailVerified
  };

  const nextRefreshToken = signRefreshToken(payload.sub);
  await persistRefreshToken(nextRefreshToken.rawToken, nextRefreshToken.tokenHash, payload.sub, req);
  res.cookie("refreshToken", nextRefreshToken.rawToken, refreshCookieOptions());

  return {
    accessToken: signAccessToken(authUser),
    user: authUser
  };
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError(400, "Verification token is invalid or expired");
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { isEmailVerified: true }
  });

  await prisma.emailVerificationToken.delete({
    where: { id: record.id }
  });

  return { message: "Email verified successfully" };
}
