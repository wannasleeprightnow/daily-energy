import { OnboardingLayout } from "./OnboardingLayout";
import { OptionButton } from "@/ui";
import type { Goal } from "@/api/types";

interface GoalStepProps {
  selected: Goal | null;
  onNext: (v: Goal) => void;
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
  onNext,
  onBack,
  step,
  total,
}: GoalStepProps) {
  return (
    <OnboardingLayout
      step={step}
      total={total}
      title="Какая у вас цель?"
      showBack
      onBack={onBack}
      onNext={() => selected && onNext(selected)}
      canContinue={!!selected}
    >
      {GOALS.map((g) => (
        <OptionButton
          key={g.value}
          selected={selected === g.value}
          onClick={() => onNext(g.value)}
          className="justify-between"
        >
          <span>{g.label}</span>
          {g.emoji && <span className="text-body">{g.emoji}</span>}
        </OptionButton>
      ))}
    </OnboardingLayout>
  );
}