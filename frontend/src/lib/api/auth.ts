import { post, get } from './client';
import { 
  ApiResponse, 
  OtpSendResponse, 
  OtpVerifyResponse, 
  OnboardingRequest, 
  Tenant, 
  User 
} from './types';

export const authApi = {
  sendOtp: async (phone: string): Promise<ApiResponse<OtpSendResponse>> => {
    return post<ApiResponse<OtpSendResponse>>('/auth/otp/send', { phone });
  },

  verifyOtp: async (phone: string, code: string): Promise<ApiResponse<OtpVerifyResponse>> => {
    return post<ApiResponse<OtpVerifyResponse>>('/auth/otp/verify', { phone, code });
  },

  onboard: async (data: OnboardingRequest): Promise<ApiResponse<Tenant>> => {
    return post<ApiResponse<Tenant>>('/tenants/onboard', data);
  },

  getMe: async (): Promise<ApiResponse<{ user: User; tenant: Tenant | null }>> => {
    return get<ApiResponse<{ user: User; tenant: Tenant | null }>>('/auth/me');
  }
};
