import { OnboardingLayout } from "./OnboardingLayout";
import { OptionButton } from "@/ui";
import {
  PersonStandingIcon,
  PersonWalkingIcon,
  PersonRunningIcon,
} from "@/ui/icons";
import type { PhysicalActivity } from "@/api/types";

interface ActivityStepProps {
  selected: PhysicalActivity | null;
  onChange: (v: PhysicalActivity) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  total: number;
}

interface Option {
  value: PhysicalActivity;
  title: string;
  subtitle: string;
  Icon: typeof PersonStandingIcon;
}

const OPTIONS: Option[] = [
  {
    value: "Low",
    title: "Низкая",
    subtitle: "Сидячий образ жизни",
    Icon: PersonStandingIcon,
  },
  {
    value: "Medium",
    title: "Умеренная",
    subtitle: "Тренировки 2-4 раза в нед.",
    Icon: PersonWalkingIcon,
  },
  {
    value: "High",
    title: "Интенсивная",
    subtitle: "Тренировки 5-7 раз в нед.",
    Icon: PersonRunningIcon,
  },
];

/** "Ваш уровень физ. активности" — Figma `78:145`. */
export function ActivityStep({
  selected,
  onChange,
  onNext,
  onBack,
  step,
  total,
}: ActivityStepProps) {
  return (
    <OnboardingLayout
      step={step}
      total={total}
      title="Ваш уровень физ. активности"
      showBack
      onBack={onBack}
      onNext={onNext}
      canContinue={!!selected}
    >
      {OPTIONS.map((o) => {
        const active = selected === o.value;
        return (
          <OptionButton
            key={o.value}
            selected={active}
            onClick={() => onChange(o.value)}
            className="min-h-[76px]"
          >
            <span
              className={active ? "text-on" : "text-on/80"}
            >
              <o.Icon size={30} />
            </span>
            <span className="flex flex-col">
              <span className="text-body font-medium">{o.title}</span>
              <span className="text-subtitle text-on/70">{o.subtitle}</span>
            </span>
          </OptionButton>
        );
      })}
    </OnboardingLayout>
  );
}
