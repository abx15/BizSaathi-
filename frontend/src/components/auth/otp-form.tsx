'use client';

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UI_TEXT } from "@/lib/constants";
import { OTPInput } from "./otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Phone, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

// Validate 10-digit phone
const phoneSchema = zod.object({
  phone: zod.string().regex(/^\d{10}$/, { message: UI_TEXT.errors.phoneInvalid }),
});

type PhoneFormValues = zod.infer<typeof phoneSchema>;

export function OTPForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Timer for resending OTP
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { sendOtp, isSendingOtp, verifyOtp, isVerifyingOtp } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (step === 2 && countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSendOtp = async (data: PhoneFormValues) => {
    try {
      const res = await sendOtp(data.phone);
      if (res.success) {
        setPhoneNumber(data.phone);
        toastSuccess("OTP bhej diya gaya hai!");
        setStep(2);
        setCountdown(60);
        setCanResend(false);
      }
    } catch (err: any) {
      toastError(err.message || UI_TEXT.errors.generic);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    setOtpError(false);
    try {
      const res = await verifyOtp({ phone: phoneNumber, code: otpCode });
      if (res.success) {
        setSuccess(true);
      }
    } catch {
      setOtpError(true);
      toastError(UI_TEXT.auth.wrongOtp);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    try {
      const res = await sendOtp(phoneNumber);
      if (res.success) {
        toastSuccess("OTP firse bhej diya gaya hai!");
        setCountdown(60);
        setCanResend(false);
        setOtpError(false);
      }
    } catch (err: any) {
      toastError(err.message || UI_TEXT.errors.generic);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success mb-4 shadow-inner shadow-success/10">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">
              Verify Ho Gaya!
            </h2>
            <p className="text-sm text-muted-foreground">
              Aapka login safaltapurvak poora hua...
            </p>
          </motion.div>
        ) : step === 1 ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight">
                {UI_TEXT.auth.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Dukan ka hisab-kitab aasan banane ke liye shuru karein.
              </p>
            </div>

            <form onSubmit={handleSubmit(handleSendOtp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{UI_TEXT.auth.phoneLabel}</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-semibold text-muted-foreground select-none">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={10}
                    placeholder={UI_TEXT.auth.phonePlaceholder}
                    {...register("phone")}
                    className="pl-12 h-11 text-base font-medium placeholder:text-muted-foreground/60 focus-visible:ring-brand-500/25 focus-visible:border-brand-500"
                    disabled={isSendingOtp}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs font-semibold text-danger flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSendingOtp}
                className="w-full h-11 text-base font-semibold shadow-md shadow-brand-500/10 cursor-pointer"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {UI_TEXT.auth.sendingOtp}
                  </>
                ) : (
                  <>
                    {UI_TEXT.auth.sendOtpBtn}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="p-0 h-8 w-8 rounded-lg border border-border"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">
                  {UI_TEXT.auth.verifyTitle}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {UI_TEXT.auth.verifySubtitle.replace("{phone}", `+91 ${phoneNumber}`)}
              </p>
            </div>

            <div className="space-y-4">
              <OTPInput
                length={6}
                onComplete={handleVerifyOtp}
                isError={otpError}
                disabled={isVerifyingOtp}
              />

              {otpError && (
                <p className="text-xs font-semibold text-center text-danger flex items-center justify-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {UI_TEXT.auth.wrongOtp}
                </p>
              )}

              <div className="flex items-center justify-between text-xs font-medium px-1.5 pt-2">
                {canResend ? (
                  <button
                    onClick={handleResendOtp}
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 font-semibold cursor-pointer underline underline-offset-4"
                  >
                    {UI_TEXT.auth.resendOtp}
                  </button>
                ) : (
                  <span className="text-muted-foreground">
                    {countdown} {UI_TEXT.auth.resendTimer}
                  </span>
                )}
                
                <button
                  onClick={() => setStep(1)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Change Number
                </button>
              </div>
            </div>

            {isVerifyingOtp && (
              <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground pt-4">
                <RefreshCw className="h-4 w-4 animate-spin text-brand-500" />
                <span>{UI_TEXT.auth.verifying}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
