import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useAuth() {
  const router = useRouter();
  const authStore = useAuthStore();

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await authApi.sendOtp(phone);
      return res;
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const res = await authApi.verifyOtp(phone, code);
      return res;
    },
    onSuccess: (response) => {
      const { user, tenant, accessToken, refreshToken } = response.data;
      authStore.setAuth({ user, tenant, accessToken, refreshToken });
      
      toast.success("OTP verified! Swagat hai.");
      
      if (!tenant || !tenant.name) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "OTP verification failed. Koshish karein firse.");
    }
  });

  const onboardMutation = useMutation({
    mutationFn: async (data: Parameters<typeof authApi.onboard>[0]) => {
      const res = await authApi.onboard(data);
      return res;
    },
    onSuccess: (response) => {
      const newTenant = response.data;
      authStore.setTenant(newTenant);
      toast.success("Business details saved! Chalo shuru karte hain.");
      router.push('/dashboard');
    },
    onError: (err: Error) => {
      toast.error(err.message || "Onboarding failed. Koshish karein firse.");
    }
  });

  const logout = () => {
    authStore.logout();
    toast.info("Aap safaltapurvak logout ho gaye.");
    router.push('/login');
  };

  return {
    user: authStore.user,
    tenant: authStore.tenant,
    accessToken: authStore.accessToken,
    isAuthenticated: authStore.isAuthenticated,
    isOnboarded: authStore.isOnboarded,
    sendOtp: sendOtpMutation.mutateAsync,
    isSendingOtp: sendOtpMutation.isPending,
    verifyOtp: verifyOtpMutation.mutateAsync,
    isVerifyingOtp: verifyOtpMutation.isPending,
    onboard: onboardMutation.mutateAsync,
    isOnboarding: onboardMutation.isPending,
    logout,
  };
}
