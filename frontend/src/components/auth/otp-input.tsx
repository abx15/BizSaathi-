'use client';

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;        // default 6
  onComplete: (otp: string) => void;
  isError?: boolean;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, isError = false, disabled = false }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first box on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (isError) {
      // Clear inputs on wrong OTP
      setOtp(new Array(length).fill(""));
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  }, [isError, length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return; // Only allow numeric input

    const newOtp = [...otp];
    // take the last character typed
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto-move to next box
    if (val && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    const currentOtp = newOtp.join("");
    if (currentOtp.length === length) {
      onComplete(currentOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // move to previous box and clear
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < length; i++) {
      newOtp[i] = pastedData[i] || "";
    }
    setOtp(newOtp);

    // Focus last completed box or first empty box
    const focusIndex = Math.min(pastedData.length, length - 1);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus();
    }

    if (pastedData.length === length) {
      onComplete(pastedData);
    }
  };

  const isFilled = otp.every((val) => val !== "");

  return (
    <div className={cn("flex justify-center gap-3.5 max-w-sm mx-auto", isError && "animate-shake")}>
      {otp.map((value, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          disabled={disabled}
          ref={(el) => { inputRefs.current[index] = el }}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={cn(
            "h-12 w-12 md:h-14 md:w-14 text-center text-xl font-bold font-mono rounded-xl border bg-background shadow-sm transition-all duration-200 focus:outline-none focus:ring-3",
            isError 
              ? "border-danger focus:ring-danger/25 text-danger" 
              : isFilled
                ? "border-success focus:ring-success/25 text-success"
                : "border-border focus:ring-brand-500/25 focus:border-brand-500"
          )}
        />
      ))}
    </div>
  );
}
