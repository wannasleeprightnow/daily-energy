import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";

import {
  draftToProfile,
  useOnboardingStore,
} from "./onboardingStore";
import { NameStep } from "./NameStep";
import { GenderStep } from "./GenderStep";
import { BirthdayStep } from "./BirthdayStep";
import { WeightStep, HeightStep } from "./WeightHeightSteps";
import { GoalStep } from "./GoalStep";
import { ActivityStep } from "./ActivityStep";

import { useCreateUser } from "@/hooks/useUser";
import { apiErrorMessage } from "@/api/client";
import { Spinner, Text } from "@/ui";
import { springs, stepVariants } from "@/ui/motion";
import { AppShell } from "@/ui/AppShell";
import { colors } from "@/design/tokens";
import { haptic } from "@/lib/telegram";

const TOTAL_STEPS = 7;

interface OnboardingPageProps {
  tgId: number;
  name?: string;
}

/**
 * Multi-step onboarding wizard.
 * Order (from the Figma map):
 *  0 name -> 1 gender -> 2 birthday -> 3 weight -> 4 height -> 5 goal -> 6 activity
 *
 * On success we call POST /api/users; react-query invalidates the user query,
 * which re-renders the root App into the main shell.
 */
export function OnboardingPage({ name }: OnboardingPageProps) {
  const store = useOnboardingStore();
  const { draft, ...actions } = store();
  const [step, setStep] = useState(0);
  /** Slide direction for the step transition: 1 = forward, -1 = back. */
  const [direction, setDirection] = useState(1);
  const createUser = useCreateUser();

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = () => {
    const profile = draftToProfile(draft);

    if (!profile) {
      haptic("warning");

      return;
    }
    createUser.mutate(profile, {
      onSuccess: () => haptic("success"),
      onError: () => haptic("error"),
    });
  };

  if (createUser.isPending) {
    return (
      <AppShell aria-live="polite" className="items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <m.div
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 px-8 text-center text-on"
          initial={{ opacity: 0, scale: 0.94 }}
          transition={springs.soft}
        >
          <Spinner size={40} />
          <Text kind="title">Сохраняем профиль</Text>
          <Text kind="subtitle">
            Создаём твой план на основе данных…
          </Text>
        </m.div>
      </AppShell>
    );
  }

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div style={{ backgroundColor: colors.bg }}>
      <AnimatePresence custom={direction} initial={false} mode="wait">
        <m.div
          key={step}
          animate="center"
          custom={direction}
          exit="exit"
          initial="enter"
          variants={stepVariants}
        >
          {step === 0 && (
            <NameStep
              initialName={name ?? ""}
              step={step}
              total={TOTAL_STEPS}
              onBack={() => window.history.back()}
              onNext={(v) => {
                actions.setName(v);
                goNext();
              }}
            />
          )}
          {step === 1 && (
            <GenderStep
              selected={draft.gender}
              step={step}
              total={TOTAL_STEPS}
              onBack={goBack}
              onChange={actions.setGender}
              onNext={goNext}
            />
          )}
          {step === 2 && (
            <BirthdayStep
              step={step}
              total={TOTAL_STEPS}
              value={draft.dateOfBirth}
              onBack={goBack}
              onChange={(d) => actions.setDateOfBirth(d)}
              onNext={goNext}
            />
          )}
          {step === 3 && (
            <WeightStep
              step={step}
              total={TOTAL_STEPS}
              value={draft.weight}
              onBack={goBack}
              onChange={(v) => actions.setWeight(v)}
              onNext={goNext}
            />
          )}
          {step === 4 && (
            <HeightStep
              step={step}
              total={TOTAL_STEPS}
              value={draft.height}
              onBack={goBack}
              onChange={(v) => actions.setHeight(v)}
              onNext={goNext}
            />
          )}
          {step === 5 && (
            <GoalStep
              selected={draft.goal}
              step={step}
              total={TOTAL_STEPS}
              onBack={goBack}
              onChange={actions.setGoal}
              onNext={goNext}
            />
          )}
          {step === 6 && (
            <ActivityStep
              selected={draft.physicalActivity}
              step={step}
              total={TOTAL_STEPS}
              onBack={goBack}
              onChange={actions.setPhysicalActivity}
              onNext={() => {
                if (isLast) submit();
              }}
            />
          )}
        </m.div>
      </AnimatePresence>
      {createUser.isError && (
        <div className="px-6 pb-8 text-center">
          <Text className="text-danger" kind="subtitle">
            {apiErrorMessage(createUser.error)}
          </Text>
        </div>
      )}
    </div>
  );
}
