import type { Goal } from "@/api/types";

import { OnboardingLayout } from "./OnboardingLayout";

import { OptionButton } from "@/ui";

interface GoalStepProps {
  selected: Goal | null;
  onChange: (v: Goal) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  total: number;
}

interface GoalOption {
  value: Goal;
  label: string;
  hint?: string;
  emoji?: string;
}

const GOALS: GoalOption[] = [
  { value: "LoseWeight", label: "Похудеть", emoji: "📉" },
  { value: "Maintain", label: "Поддерживать вес", emoji: "😊" },
  { value: "GainMuscleMass", label: "Набрать вес", emoji: "💪" },
];

/** "Какая у вас цель?" — Figma `68:24`. */
export function GoalStep({
  selected,
  onChange,
  onNext,
  onBack,
  step,
  total,
}: GoalStepProps) {
  return (
    <OnboardingLayout
      showBack
      canContinue={!!selected}
      step={step}
      title="Какая у вас цель?"
      total={total}
      onBack={onBack}
      onNext={onNext}
    >
      {GOALS.map((g) => (
        <OptionButton
          key={g.value}
          className="justify-between"
          selected={selected === g.value}
          onClick={() => onChange(g.value)}
        >
          <span>{g.label}</span>
          {g.emoji && <span className="text-body">{g.emoji}</span>}
        </OptionButton>
      ))}
    </OnboardingLayout>
  );
}
