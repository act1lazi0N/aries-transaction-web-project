export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: "Bearer" | string;
  expiresIn: number;
  user: AuthUser;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationDetails = LoginCredentials & {
  fullName: string;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export function parseAuthResponse(value: unknown): AuthResponse {
  if (!isRecord(value) || typeof value.accessToken !== "string" || value.accessToken.length === 0 || typeof value.tokenType !== "string" || typeof value.expiresIn !== "number" || !isRecord(value.user)) throw new Error("The authentication response was invalid");
  const user = value.user;
  if (typeof user.id !== "string" || typeof user.fullName !== "string" || typeof user.email !== "string" || typeof user.role !== "string" || typeof user.isActive !== "boolean" || typeof user.emailVerified !== "boolean" || typeof user.createdAt !== "string") throw new Error("The authentication user response was invalid");
  return { accessToken: value.accessToken, tokenType: value.tokenType, expiresIn: value.expiresIn, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, isActive: user.isActive, emailVerified: user.emailVerified, createdAt: user.createdAt } };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
