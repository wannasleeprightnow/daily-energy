import { useMemo } from "react";
import { OnboardingLayout } from "./OnboardingLayout";
import { WheelColumn } from "@/ui";
import { MONTHS_RU } from "@/constants";

interface BirthdayStepProps {
  value: Date | null;
  onChange: (d: Date) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  total: number;
}

const YEARS = (() => {
  const now = new Date().getFullYear();
  const out: number[] = [];
  for (let y = now; y >= now - 100; y--) out.push(y);
  return out;
})();

const DAYS = (() => {
  const out: number[] = [];
  for (let d = 1; d <= 31; d++) out.push(d);
  return out;
})();

/**
 * Date-of-birth picker: day / month / year wheels.
 * Figma `78:88`.
 */
export function BirthdayStep({
  value,
  onChange,
  onNext,
  onBack,
  step,
  total,
}: BirthdayStepProps) {
  const day = value?.getDate() ?? 15;
  const monthIndex = value ? value.getMonth() : 5; // June default
  const year = value?.getFullYear() ?? new Date().getFullYear() - 20;

  const commit = (d: number, m: number, y: number) => {
    const clampedDay = Math.min(d, daysInMonth(y, m));
    onChange(new Date(y, m, clampedDay));
  };

  const wheels = useMemo(() => {
    return [
      { values: DAYS, label: "День", current: day, onSelect: (v: number) => commit(v, monthIndex, year) },
      { values: MONTHS_RU, label: "Месяц", current: MONTHS_RU[monthIndex], onSelect: (v: string) => commit(day, MONTHS_RU.indexOf(v), year) },
      { values: YEARS, label: "Год", current: year, onSelect: (v: number) => commit(day, monthIndex, v) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, monthIndex, year]);

  return (
    <OnboardingLayout
      step={step}
      total={total}
      title="Ваша дата рождения"
      showBack
      onBack={onBack}
      onNext={onNext}
      canContinue={!!value}
    >
      <div className="flex justify-between gap-2 overflow-hidden">
        {wheels.map((w, i) => (
          <WheelColumn
            key={i}
            ariaLabel={w.label}
            label={w.label}
            values={w.values as never}
            selected={w.current as never}
            onSelect={w.onSelect as never}
          />
        ))}
      </div>
    </OnboardingLayout>
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}