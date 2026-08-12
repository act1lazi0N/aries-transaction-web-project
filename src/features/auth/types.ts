export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
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

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
