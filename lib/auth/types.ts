export type UserRole = "user" | "admin";

export type UserStatus = "active" | "inactive" | "blocked";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthApiError = {
  error: string;
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
  status: number;
};
