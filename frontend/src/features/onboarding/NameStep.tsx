import { useState } from "react";
import { OnboardingLayout } from "./OnboardingLayout";
import { Input } from "@/ui";

interface NameStepProps {
  onNext: (name: string) => void;
  onBack: () => void;
  step: number;
  total: number;
  initialName?: string;
}

/** "Как вас зовут?" — Figma `28:4`. */
export function NameStep({
  onNext,
  onBack,
  step,
  total,
  initialName = "",
}: NameStepProps) {
  const [name, setName] = useState(initialName);
  const canContinue = name.trim().length > 0;

  return (
    <OnboardingLayout
      step={step}
      total={total}
      title="Как вас зовут?"
      showBack
      onBack={onBack}
      onNext={() => canContinue && onNext(name.trim())}
      canContinue={canContinue}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Имя"
        maxLength={40}
        autoFocus
      />
    </OnboardingLayout>
  );
}