export type UserRole = "ADMIN" | "USER";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: string;
  details?: unknown;
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;
