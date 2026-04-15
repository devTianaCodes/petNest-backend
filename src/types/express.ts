import type { UserRole, UserStatus } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
