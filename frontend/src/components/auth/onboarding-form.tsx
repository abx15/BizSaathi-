'use client';

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UI_TEXT, INDIAN_STATES, BUSINESS_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Store, 
  Briefcase, 
  Factory, 
  User as UserIcon, 
  HelpCircle, 
  Percent, 
  MessageSquare, 
  Check, 
  ChevronRight, 
  ChevronLeft 
} from "lucide-react";

// Form schemas
const onboardingSchema = zod.object({
  businessName: zod.string().min(2, { message: UI_TEXT.errors.businessNameRequired }),
  businessType: zod.string().min(1, { message: UI_TEXT.errors.businessTypeRequired }),
  city: zod.string().min(1, { message: UI_TEXT.errors.cityRequired }),
  state: zod.string().min(1, { message: UI_TEXT.errors.stateRequired }),
  hasGst: zod.boolean().default(false),
  gstNumber: zod.string().optional(),
  sendWhatsapp: zod.boolean().default(true),
  whatsappNumber: zod.string().optional(),
}).refine((data) => {
  if (data.hasGst && (!data.gstNumber || !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(data.gstNumber))) {
    return false;
  }
  return true;
}, {
  message: UI_TEXT.onboarding.steps.gstSetup.invalidGst,
  path: ["gstNumber"],
});

type OnboardingValues = zod.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { onboard, isOnboarding, user } = useAuth();
  const { error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: "",
      businessType: "SHOP",
      city: "",
      state: "Maharashtra",
      hasGst: false,
      gstNumber: "",
      sendWhatsapp: true,
      whatsappNumber: user?.phone || "",
    },
  });

  const watchBusinessType = watch("businessType");
  const watchHasGst = watch("hasGst");
  const watchSendWhatsapp = watch("sendWhatsapp");
  const watchWhatsappNumber = watch("whatsappNumber");
  const watchBusinessName = watch("businessName");

  useEffect(() => {
    setMounted(true);
    if (user?.phone) {
      setValue("whatsappNumber", user.phone);
    }
  }, [user, setValue]);

  if (!mounted) return null;

  const handleNextStep = () => {
    if (step === 1) {
      const name = watch("businessName");
      const type = watch("businessType");
      const city = watch("city");
      const state = watch("state");
      
      if (!name || name.length < 2) {
        toastError(UI_TEXT.errors.businessNameRequired);
        return;
      }
      if (!type) {
        toastError(UI_TEXT.errors.businessTypeRequired);
        return;
      }
      if (!city) {
        toastError(UI_TEXT.errors.cityRequired);
        return;
      }
      if (!state) {
        toastError(UI_TEXT.errors.stateRequired);
        return;
      }
    }
    
    if (step === 2) {
      const hasGst = watch("hasGst");
      const gstNumber = watch("gstNumber");
      if (hasGst && (!gstNumber || !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(gstNumber))) {
        toastError(UI_TEXT.onboarding.steps.gstSetup.invalidGst);
        return;
      }
    }

    setStep((prev) => (prev + 1) as any);
  };

  const handlePrevStep = () => {
    setStep((prev) => (prev - 1) as any);
  };

  const onSubmit = async (data: OnboardingValues) => {
    try {
      await onboard({
        businessName: data.businessName,
        businessType: data.businessType,
        city: data.city,
        state: data.state,
        hasGst: data.hasGst,
        gstNumber: data.hasGst ? data.gstNumber : undefined,
        sendWhatsapp: data.sendWhatsapp,
        whatsappNumber: data.sendWhatsapp ? data.whatsappNumber : undefined,
      });
    } catch (err: any) {
      toastError(err.message || UI_TEXT.errors.generic);
    }
  };

  const getBusinessIcon = (id: string) => {
    switch (id) {
      case "SHOP": return <Store className="h-5 w-5 text-brand-600 dark:text-brand-400" />;
      case "SERVICE": return <Briefcase className="h-5 w-5 text-brand-600 dark:text-brand-400" />;
      case "MANUFACTURING": return <Factory className="h-5 w-5 text-brand-600 dark:text-brand-400" />;
      case "FREELANCER": return <UserIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />;
      default: return <HelpCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-card rounded-2xl border border-border/80 shadow-lg p-6 md:p-8">
      {/* Progress Bar Header */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{UI_TEXT.onboarding.progress.replace("{step}", step.toString())}</span>
          <span className="text-brand-600 dark:text-brand-400 font-bold">
            {step === 1 ? "Business Info" : step === 2 ? "GST Settings" : "WhatsApp Alerts"}
          </span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-500 rounded-full"
            initial={{ width: "33%" }}
            animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">{UI_TEXT.onboarding.steps.businessInfo.title}</h2>
                <p className="text-sm text-muted-foreground">Dukan ka naam aur work type entered karein.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">{UI_TEXT.onboarding.steps.businessInfo.nameLabel}</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder={UI_TEXT.onboarding.steps.businessInfo.namePlaceholder}
                    {...register("businessName")}
                    className="h-11 focus-visible:ring-brand-500/25 focus-visible:border-brand-500 font-medium"
                  />
                  {errors.businessName && (
                    <p className="text-xs font-semibold text-danger">{errors.businessName.message}</p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label>{UI_TEXT.onboarding.steps.businessInfo.typeLabel}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {BUSINESS_TYPES.map((type) => (
                      <div
                        key={type.id}
                        onClick={() => setValue("businessType", type.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border border-border cursor-pointer transition-all hover:bg-secondary/40 select-none ${
                          watchBusinessType === type.id 
                            ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500" 
                            : "bg-background"
                        }`}
                      >
                        <div className={`mt-0.5 p-2 rounded-lg bg-secondary/80 ${watchBusinessType === type.id ? "bg-brand-500/10" : ""}`}>
                          {getBusinessIcon(type.id)}
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold">{type.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{type.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{UI_TEXT.onboarding.steps.businessInfo.cityLabel}</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder={UI_TEXT.onboarding.steps.businessInfo.cityPlaceholder}
                      {...register("city")}
                      className="h-11 focus-visible:ring-brand-500/25 focus-visible:border-brand-500 font-medium"
                    />
                    {errors.city && (
                      <p className="text-xs font-semibold text-danger">{errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">{UI_TEXT.onboarding.steps.businessInfo.stateLabel}</Label>
                    <select
                      id="state"
                      {...register("state")}
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={handleNextStep} className="px-6 h-11 font-semibold cursor-pointer">
                  {UI_TEXT.onboarding.buttons.next}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">{UI_TEXT.onboarding.steps.gstSetup.title}</h2>
                <p className="text-sm text-muted-foreground">GST registration option configure karein (optional).</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">{UI_TEXT.onboarding.steps.gstSetup.toggleLabel}</Label>
                    <p className="text-xs text-muted-foreground">Select yes if your business has GSTIN registration.</p>
                  </div>
                  <Switch
                    checked={watchHasGst}
                    onCheckedChange={(checked: boolean) => setValue("hasGst", checked)}
                    className="data-[state=checked]:bg-brand-500"
                  />
                </div>

                <AnimatePresence>
                  {watchHasGst && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="gstNumber">{UI_TEXT.onboarding.steps.gstSetup.gstLabel}</Label>
                      <Input
                        id="gstNumber"
                        type="text"
                        placeholder={UI_TEXT.onboarding.steps.gstSetup.gstPlaceholder}
                        {...register("gstNumber")}
                        className="h-11 focus-visible:ring-brand-500/25 focus-visible:border-brand-500 font-mono font-medium tracking-wide uppercase"
                      />
                      {errors.gstNumber && (
                        <p className="text-xs font-semibold text-danger">{errors.gstNumber.message}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* GST benefits panel */}
                <Card className="border-brand-500/20 bg-brand-500/5">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                      <Percent className="h-4 w-4" />
                      {UI_TEXT.onboarding.steps.gstSetup.infoTitle}
                    </h4>
                    <ul className="space-y-2">
                      {UI_TEXT.onboarding.steps.gstSetup.benefits.map((benefit, i) => (
                        <li key={i} className="text-xs font-medium text-muted-foreground flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-brand-500 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="outline" onClick={handlePrevStep} className="px-5 h-11 font-semibold rounded-xl cursor-pointer">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {UI_TEXT.onboarding.buttons.back}
                </Button>

                <div className="flex gap-2">
                  {!watchHasGst && (
                    <Button type="button" variant="ghost" onClick={handleNextStep} className="h-11 font-semibold cursor-pointer">
                      {UI_TEXT.onboarding.buttons.skip}
                    </Button>
                  )}
                  <Button type="button" onClick={handleNextStep} className="px-6 h-11 font-semibold cursor-pointer">
                    {UI_TEXT.onboarding.buttons.next}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">{UI_TEXT.onboarding.steps.whatsappSetup.title}</h2>
                <p className="text-sm text-muted-foreground">Customers ko bill alerts auto send karne ke liye WhatsApp enable karein.</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">{UI_TEXT.onboarding.steps.whatsappSetup.toggleLabel}</Label>
                    <p className="text-xs text-muted-foreground">Invoices are instantly sent over WhatsApp text alert.</p>
                  </div>
                  <Switch
                    checked={watchSendWhatsapp}
                    onCheckedChange={(checked: boolean) => setValue("sendWhatsapp", checked)}
                    className="data-[state=checked]:bg-brand-500"
                  />
                </div>

                <AnimatePresence>
                  {watchSendWhatsapp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="whatsappNumber">{UI_TEXT.onboarding.steps.whatsappSetup.phoneLabel}</Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-sm font-semibold text-muted-foreground select-none">
                          +91
                        </span>
                        <Input
                          id="whatsappNumber"
                          type="tel"
                          maxLength={10}
                          placeholder={UI_TEXT.onboarding.steps.whatsappSetup.phonePlaceholder}
                          {...register("whatsappNumber")}
                          className="pl-12 h-11 focus-visible:ring-brand-500/25 focus-visible:border-brand-500 font-medium"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* WhatsApp Message Preview Mockup */}
                {watchSendWhatsapp && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      {UI_TEXT.onboarding.steps.whatsappSetup.previewTitle}
                    </h4>
                    <div className="text-xs text-muted-foreground rounded-lg bg-background border border-border p-3 shadow-inner whitespace-pre-line leading-relaxed font-sans">
                      {UI_TEXT.onboarding.steps.whatsappSetup.previewMsg.replace("Ramesh Traders", watchBusinessName || "Ramesh Traders")}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="outline" onClick={handlePrevStep} className="px-5 h-11 font-semibold rounded-xl cursor-pointer">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {UI_TEXT.onboarding.buttons.back}
                </Button>

                <div className="flex gap-2">
                  {!watchSendWhatsapp && (
                    <Button type="submit" variant="ghost" disabled={isOnboarding} className="h-11 font-semibold cursor-pointer">
                      {UI_TEXT.onboarding.buttons.skip}
                    </Button>
                  )}
                  <Button type="submit" disabled={isOnboarding} className="px-6 h-11 font-bold shadow-md shadow-brand-500/10 cursor-pointer">
                    {isOnboarding ? "Details Save ho rahi hain..." : UI_TEXT.onboarding.buttons.finish}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
