import { CurrentUser } from '../../features/users/models/current-user.model';

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: CurrentUser;
}

export interface AuthMessage {
  message: string;
}
