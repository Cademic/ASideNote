 import type { AuthResponse, LoginRequest, RegisterRequest, GoogleLoginRequest } from "../types";
import { apiClient } from "./client";

export async function postLogin(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", data);
  return response.data;
}

export async function postRegister(data: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/register", data);
  return response.data;
}

export async function postLogout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function postVerifyEmail(token: string): Promise<void> {
  await apiClient.post("/auth/verify-email", { token });
}

export async function postResendVerification(email: string): Promise<void> {
  await apiClient.post("/auth/resend-verification", { email });
}

export async function postGoogleLogin(data: GoogleLoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/google", data);
  return response.data;
}
