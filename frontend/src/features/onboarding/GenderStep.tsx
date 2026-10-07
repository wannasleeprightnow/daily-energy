import type { Gender } from "@/api/types";

import { OnboardingLayout } from "./OnboardingLayout";

import { OptionButton } from "@/ui";

interface GenderStepProps {
  selected: Gender | null;
  onChange: (v: Gender) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  total: number;
}

/** "Ваш пол:" — Figma `150:430`. */
export function GenderStep({
  selected,
  onChange,
  onNext,
  onBack,
  step,
  total,
}: GenderStepProps) {
  return (
    <OnboardingLayout
      showBack
      canContinue={!!selected}
      step={step}
      title="Ваш пол:"
      total={total}
      onBack={onBack}
      onNext={onNext}
    >
      <OptionButton
        className="justify-center text-center"
        selected={selected === "Male"}
        onClick={() => onChange("Male")}
      >
        Мужской
      </OptionButton>
      <OptionButton
        className="justify-center text-center"
        selected={selected === "Female"}
        onClick={() => onChange("Female")}
      >
        Женский
      </OptionButton>
    </OnboardingLayout>
  );
}
