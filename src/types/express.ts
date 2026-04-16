import type { UserRole, UserStatus } from "@prisma/client";
import type { Logger } from "pino";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  fullName?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      log?: Logger;
    }
  }
}
