export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  gstNumber: string | null;
  address: string | null;
  phone: string;
  logoUrl: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthResponse {
  user: User;
  tenant: Tenant | null;
  accessToken: string;
  refreshToken: string;
}

export interface OtpSendResponse {
  message: string;
  sessionId: string;
}

export interface OtpVerifyResponse {
  user: User;
  tenant: Tenant | null;
  accessToken: string;
  refreshToken: string;
}

export interface OnboardingRequest {
  businessName: string;
  businessType: string;
  city: string;
  state: string;
  hasGst: boolean;
  gstNumber?: string;
  sendWhatsapp: boolean;
  whatsappNumber?: string;
}
