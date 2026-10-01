import { useState } from "react";
import { useCreateUser } from "@/hooks/useUser";
import { apiErrorMessage } from "@/api/client";
import { Spinner, Text } from "@/ui";
import { AppShell } from "@/ui/AppShell";
import { colors } from "@/design/tokens";
import { haptic } from "@/lib/telegram";
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
  const createUser = useCreateUser();

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

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
      <AppShell className="items-center justify-center" style={{ backgroundColor: colors.bg }} aria-live="polite">
        <div className="flex flex-col items-center gap-4 px-8 text-center text-on">
          <Spinner size={40} />
          <Text kind="title">Сохраняем профиль</Text>
          <Text kind="subtitle">
            Создаём твой план на основе данных…
          </Text>
        </div>
      </AppShell>
    );
  }

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div style={{ backgroundColor: colors.bg }}>
      {step === 0 && (
        <NameStep
          step={step}
          total={TOTAL_STEPS}
          initialName={name ?? ""}
          onBack={() => window.history.back()}
          onNext={(v) => {
            actions.setName(v);
            goNext();
          }}
        />
      )}
      {step === 1 && (
        <GenderStep
          step={step}
          total={TOTAL_STEPS}
          selected={draft.gender}
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
          step={step}
          total={TOTAL_STEPS}
          selected={draft.goal}
          onBack={goBack}
          onChange={actions.setGoal}
          onNext={goNext}
        />
      )}
      {step === 6 && (
        <ActivityStep
          step={step}
          total={TOTAL_STEPS}
          selected={draft.physicalActivity}
          onBack={goBack}
          onChange={actions.setPhysicalActivity}
          onNext={() => {
            if (isLast) submit();
          }}
        />
      )}
      {createUser.isError && (
        <div className="px-6 pb-8 text-center">
          <Text kind="subtitle" className="text-danger">
            {apiErrorMessage(createUser.error)}
          </Text>
        </div>
      )}
    </div>
  );
}
