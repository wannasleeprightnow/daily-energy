import { OnboardingLayout } from "./OnboardingLayout";
import { OptionButton } from "@/ui";
import type { Gender } from "@/api/types";

interface GenderStepProps {
  selected: Gender | null;
  onNext: (v: Gender) => void;
  onBack: () => void;
  step: number;
  total: number;
}

/** "Ваш пол:" — Figma `150:430`. */
export function GenderStep({
  selected,
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
      onNext={() => selected && onNext(selected)}
      canContinue={!!selected}
    >
      <OptionButton
        selected={selected === "Male"}
        onClick={() => onNext("Male")}
      >
        Мужской
      </OptionButton>
      <OptionButton
        selected={selected === "Female"}
        onClick={() => onNext("Female")}
      >
        Женский
      </OptionButton>
    </OnboardingLayout>
  );
}