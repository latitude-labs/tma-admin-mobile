export interface User {
  id: number;
  email: string;
  name: string;
  phone_number?: string | null;
  is_admin: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  class_time_ids?: number[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string | null;
  user: User | null;
  expires_at: string | null;
  requires_2fa?: boolean;
  two_fa_methods?: ('otp' | 'biometric')[];
  temp_token?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}