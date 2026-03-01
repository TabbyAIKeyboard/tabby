"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMemory } from "@/lib/ai/tools/memory/client";
import useUser from "@/hooks/use-user";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";

// Helper to set cookie
const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

interface OnboardingData {
  name: string;
  age: string;
  organization: string;
  organizationType: string;
  role: string;
  educationLevel: string;
  fieldOfStudy: string;
  institution: string;
  skills: string;
  interests: string;
  goals: string;
  additionalInfo: string;
}

const steps = [
  { id: 1, title: "Personal Info", description: "Tell us about yourself" },
  { id: 2, title: "Organization", description: "Your work or business" },
  { id: 3, title: "Education", description: "Your academic background" },
  { id: 4, title: "Preferences", description: "Your interests and goals" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    age: "",
    organization: "",
    organizationType: "",
    role: "",
    educationLevel: "",
    fieldOfStudy: "",
    institution: "",
    skills: "",
    interests: "",
    goals: "",
    additionalInfo: "",
  });

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const progress = (currentStep / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.name.trim() !== "";
      case 2:
        return true; // Organization is optional
      case 3:
        return true; // Education is optional
      case 4:
        return true; // Preferences are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);

    try {
      // Build a comprehensive user profile message
      const profileSummary = buildProfileSummary(data);

      // Send to memory API
      await addMemory(
        [
          {
            role: "user",
            content: `My profile information: ${profileSummary}`,
          },
          {
            role: "assistant",
            content: `I've noted your profile information. I'll remember that ${data.name ? `your name is ${data.name}` : "you've completed onboarding"}${data.organization ? `, you work at ${data.organization}` : ""}${data.educationLevel ? `, your education level is ${data.educationLevel}` : ""}. I'll use this information to personalize our interactions.`,
          },
        ],
        user.id,
        {
          type: "user_profile",
          onboarding: true,
          timestamp: new Date().toISOString(),
        }
      );

      // Mark onboarding as complete in localStorage and cookie
      localStorage.setItem("onboarding_complete", "true");
      setCookie("onboarding_complete", "true");
      
      // Sync with Electron store so main process knows onboarding is complete
      if (typeof window !== "undefined" && (window as any).electron?.setOnboardingComplete) {
        (window as any).electron.setOnboardingComplete(true);
      }

      // Redirect to settings page
      router.push("/settings");
      router.refresh(); // Refresh to ensure middleware picks up new cookie
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildProfileSummary = (data: OnboardingData): string => {
    const parts: string[] = [];

    if (data.name) parts.push(`Name: ${data.name}`);
    if (data.age) parts.push(`Age: ${data.age}`);
    if (data.organization) parts.push(`Organization: ${data.organization}`);
    if (data.organizationType) parts.push(`Organization Type: ${data.organizationType}`);
    if (data.role) parts.push(`Role/Position: ${data.role}`);
    if (data.educationLevel) parts.push(`Education Level: ${data.educationLevel}`);
    if (data.fieldOfStudy) parts.push(`Field of Study: ${data.fieldOfStudy}`);
    if (data.institution) parts.push(`Institution: ${data.institution}`);
    if (data.skills) parts.push(`Skills: ${data.skills}`);
    if (data.interests) parts.push(`Interests: ${data.interests}`);
    if (data.goals) parts.push(`Goals: ${data.goals}`);
    if (data.additionalInfo) parts.push(`Additional Info: ${data.additionalInfo}`);

    return parts.join(". ");
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col">
      {/* Drag region */}
      <div
        className="h-8 w-full shrink-0 flex items-center justify-center"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Welcome
            </p>
            <h1 className="text-3xl md:text-4xl font-serif font-normal text-foreground tracking-tight">
              Let&apos;s get to know you
            </h1>
            <p className="text-muted-foreground mt-3 font-light">
              Help us personalize your experience
            </p>
          </motion.div>

          {/* Progress */}
          <div className="mb-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif transition-all duration-300 ${
                        isActive
                          ? "bg-foreground text-background"
                          : isCompleted
                          ? "bg-foreground/80 text-background"
                          : "border border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-12 h-px mx-2 transition-colors duration-300 ${
                        isCompleted ? "bg-foreground/60" : "bg-muted-foreground/20"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl p-8 md:p-10"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step Title */}
                <div className="mb-8">
                  <h2 className="text-2xl font-serif font-normal text-foreground">{steps[currentStep - 1].title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 font-light">
                    {steps[currentStep - 1].description}
                  </p>
                </div>

                {/* Step Content */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-normal text-foreground">
                        What should we call you? <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={data.name}
                        onChange={(e) => updateData("name", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-sm font-normal text-foreground">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="Your age"
                        value={data.age}
                        onChange={(e) => updateData("age", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                        min="1"
                        max="120"
                      />
                      <p className="text-xs text-muted-foreground">Optional</p>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="organization" className="text-sm font-normal text-foreground">Organization</Label>
                      <Input
                        id="organization"
                        placeholder="Company, university, or organization"
                        value={data.organization}
                        onChange={(e) => updateData("organization", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizationType" className="text-sm font-normal text-foreground">Type</Label>
                      <Select
                        value={data.organizationType}
                        onValueChange={(value) => updateData("organizationType", value)}
                      >
                        <SelectTrigger className="h-12 w-full bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="startup">Startup</SelectItem>
                          <SelectItem value="university">University</SelectItem>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="nonprofit">Non-profit</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-normal text-foreground">Role</Label>
                      <Input
                        id="role"
                        placeholder="Your position or title"
                        value={data.role}
                        onChange={(e) => updateData("role", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="educationLevel" className="text-sm font-normal text-foreground">Education Level</Label>
                      <Select
                        value={data.educationLevel}
                        onValueChange={(value) => updateData("educationLevel", value)}
                      >
                        <SelectTrigger className="h-12 w-full bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high-school">High School</SelectItem>
                          <SelectItem value="bachelors">Bachelor&apos;s</SelectItem>
                          <SelectItem value="masters">Master&apos;s</SelectItem>
                          <SelectItem value="phd">Ph.D.</SelectItem>
                          <SelectItem value="diploma">Diploma</SelectItem>
                          <SelectItem value="self-taught">Self-taught</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fieldOfStudy" className="text-sm font-normal text-foreground">Field of Study</Label>
                      <Input
                        id="fieldOfStudy"
                        placeholder="Your area of focus"
                        value={data.fieldOfStudy}
                        onChange={(e) => updateData("fieldOfStudy", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institution" className="text-sm font-normal text-foreground">Institution</Label>
                      <Input
                        id="institution"
                        placeholder="School or university name"
                        value={data.institution}
                        onChange={(e) => updateData("institution", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="skills" className="text-sm font-normal text-foreground">Skills</Label>
                      <Input
                        id="skills"
                        placeholder="Python, JavaScript, Data Analysis..."
                        value={data.skills}
                        onChange={(e) => updateData("skills", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate with commas
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interests" className="text-sm font-normal text-foreground">Interests</Label>
                      <Input
                        id="interests"
                        placeholder="AI, Design, Music..."
                        value={data.interests}
                        onChange={(e) => updateData("interests", e.target.value)}
                        className="h-12 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goals" className="text-sm font-normal text-foreground">Goals</Label>
                      <Textarea
                        id="goals"
                        placeholder="What do you hope to achieve?"
                        value={data.goals}
                        onChange={(e) => updateData("goals", e.target.value)}
                        className="min-h-24 resize-none bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="additionalInfo" className="text-sm font-normal text-foreground">Anything else?</Label>
                      <Textarea
                        id="additionalInfo"
                        placeholder="Tell us more about yourself..."
                        value={data.additionalInfo}
                        onChange={(e) => updateData("additionalInfo", e.target.value)}
                        className="min-h-24 resize-none bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 focus:border-foreground"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-10 pt-6 border-t border-stone-200 dark:border-zinc-800">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-full px-6"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canProceed()}
                  className="gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-full px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <button
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              onClick={() => {
                localStorage.setItem("onboarding_complete", "true");
                setCookie("onboarding_complete", "true");
                // Sync with Electron store
                if (typeof window !== "undefined" && (window as any).electron?.setOnboardingComplete) {
                  (window as any).electron.setOnboardingComplete(true);
                }
                router.push("/settings");
                router.refresh();
              }}
            >
              Skip for now
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
