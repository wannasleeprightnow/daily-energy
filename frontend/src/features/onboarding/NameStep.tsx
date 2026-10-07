import { useEffect, useRef, useState } from "react";

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
  const [name, setName] = useState(initialName.slice(0, 50));
  const inputRef = useRef<HTMLInputElement>(null);
  const canContinue = name.trim().length > 0 && name.trim().length <= 50;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <OnboardingLayout
      showBack
      canContinue={canContinue}
      step={step}
      title="Как вас зовут?"
      total={total}
      onBack={onBack}
      onNext={() => canContinue && onNext(name.trim())}
    >
      <Input
        ref={inputRef}
        maxLength={50}
        placeholder="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </OnboardingLayout>
  );
}
