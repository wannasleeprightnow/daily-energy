import { OnboardingLayout } from "./OnboardingLayout";
import { OptionButton } from "@/ui";
import type { Gender } from "@/api/types";

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
      step={step}
      total={total}
      title="Ваш пол:"
      showBack
      onBack={onBack}
      onNext={onNext}
      canContinue={!!selected}
    >
      <OptionButton
        selected={selected === "Male"}
        onClick={() => onChange("Male")}
        className="justify-center text-center"
      >
        Мужской
      </OptionButton>
      <OptionButton
        selected={selected === "Female"}
        onClick={() => onChange("Female")}
        className="justify-center text-center"
      >
        Женский
      </OptionButton>
    </OnboardingLayout>
  );
}
