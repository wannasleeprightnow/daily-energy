import { NumberWheelStep } from "./NumberWheelStep";
import { LIMITS } from "@/constants";

interface WeightStepProps {
  value: number | null;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  total: number;
}

/** "Ваш вес (в кг):" — Figma `78:54`. */
export function WeightStep(props: WeightStepProps) {
  return (
    <NumberWheelStep
      {...props}
      title="Ваш вес (в кг):"
      unit="кг"
      min={LIMITS.weight.min}
      max={LIMITS.weight.max}
    />
  );
}

interface HeightStepProps {
  value: number | null;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  total: number;
}

/** "Ваш рост (в см):" — Figma `78:74`. */
export function HeightStep(props: HeightStepProps) {
  return (
    <NumberWheelStep
      {...props}
      title="Ваш рост (в см):"
      unit="см"
      min={LIMITS.height.min}
      max={LIMITS.height.max}
    />
  );
}