import { OnboardingLayout } from "./OnboardingLayout";
import { WheelColumn } from "@/ui";

interface NumberWheelStepProps {
  title: string;
  unit: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  total: number;
}

/**
 * Generic single-column wheel for weight (кг) / height (см).
 * Figma `78:54` (weight), `78:74` (height).
 */
export function NumberWheelStep({
  title,
  unit,
  min,
  max,
  value,
  onChange,
  onNext,
  onBack,
  step,
  total,
}: NumberWheelStepProps) {
  const values = range(min, max);
  const current = value ?? values[Math.floor((max - min) / 2)];

  return (
    <OnboardingLayout
      step={step}
      total={total}
      title={title}
      showBack
      onBack={onBack}
      onNext={onNext}
      canContinue={value !== null}
    >
      <WheelColumn
        ariaLabel={title}
        label={unit}
        values={values}
        selected={current}
        onSelect={onChange}
      />
    </OnboardingLayout>
  );
}

function range(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = min; i <= max; i += 1) out.push(i);
  return out;
}