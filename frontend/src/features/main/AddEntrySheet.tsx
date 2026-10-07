import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import type { ActionType } from "@/api/types";
import { Button, Input, Spinner, WheelColumn } from "@/ui";
import { easings } from "@/ui/motion";
import { CrossIcon } from "@/ui/icons";
import { useCreateAction } from "@/hooks/useActions";
import { estimateActivityCalories, estimateCalories } from "@/api/ai";
import { apiErrorMessage } from "@/api/client";
import { useUser } from "@/hooks/useUser";
import { haptic } from "@/lib/telegram";
import calendarIcon from "@/assets/icons/calendar.svg";

interface AddEntrySheetProps {
  open: boolean;
  onClose: () => void;
  onCalendar: () => void;
  utgid: number;
  type: ActionType;
  /** Day the entry belongs to (local midnight). */
  date: Date;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DURATION_HOURS = Array.from({ length: 10 }, (_, i) => i);
const CALORIES = Array.from({ length: 3001 }, (_, i) => i);

function TimeWheelPair({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  hourValues,
  ariaPrefix,
}: {
  hours: number;
  minutes: number;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
  hourValues: number[];
  ariaPrefix: string;
}) {
  return (
    <div className="flex items-center justify-center gap-0">
      <div className="w-[88px] shrink-0">
        <WheelColumn
          values={hourValues}
          selected={hours}
          onSelect={onHoursChange}
          ariaLabel={`${ariaPrefix}-hours`}
          displayValue={(value) => String(value).padStart(2, "0")}
          viewportClassName="h-[105px] w-[88px]"
          valueClassName="text-[27px] leading-8"
        />
      </div>
      <span className="text-[26px] text-on">:</span>
      <div className="w-[88px] shrink-0">
        <WheelColumn
          values={MINUTES}
          selected={minutes}
          onSelect={onMinutesChange}
          ariaLabel={`${ariaPrefix}-minutes`}
          displayValue={(value) => String(value).padStart(2, "0")}
          viewportClassName="h-[105px] w-[88px]"
          valueClassName="text-[27px] leading-8"
        />
      </div>
    </div>
  );
}

/** Full-screen form for adding a meal or an activity. */
export function AddEntrySheet({
  open,
  onClose,
  onCalendar,
  utgid,
  type,
  date,
}: AddEntrySheetProps) {
  const isFood = type === "Food";
  const now = useMemo(() => new Date(), []);
  const [title, setTitle] = useState("");
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [calories, setCalories] = useState(235);
  const [caloriesEdited, setCaloriesEdited] = useState(false);
  const [foodEstimateForTitle, setFoodEstimateForTitle] = useState<string | null>(null);
  const [estimatedForDuration, setEstimatedForDuration] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAction = useCreateAction(utgid);
  const { data: user } = useUser(utgid);
  const durationMinutesTotal = durationHours * 60 + durationMinutes;
  const durationLabel =
    [durationHours > 0 ? `${durationHours} ч` : "", durationMinutes > 0 ? `${durationMinutes} мин` : ""]
      .filter(Boolean)
      .join(" ") || "0 мин";

  const reset = () => {
    setTitle("");
    setCalories(235);
    setCaloriesEdited(false);
    setFoodEstimateForTitle(null);
    setEstimatedForDuration(null);
    setDurationHours(0);
    setDurationMinutes(30);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const estimate = async () => {
    const name = title.trim();
    if (!name) {
      haptic("warning");
      setError(isFood ? "Укажи, что ты съел" : "Укажи название активности");
      return;
    }
    if (!isFood && durationMinutesTotal < 1) {
      haptic("warning");
      setError("Выбери длительность активности");
      return;
    }
    try {
      setIsEstimating(true);
      setError(null);
      const result = isFood
        ? await estimateCalories({ title: name })
        : user
          ? await estimateActivityCalories({
              title: name,
              weight: user.weight,
              height: user.height,
              gender: user.gender,
              date_of_birth: user.date_of_birth,
              physical_activity: user.physical_activity,
              duration_minutes: durationMinutesTotal,
            })
          : null;
      if (!result) {
        throw new Error("Не удалось загрузить данные профиля");
      }
      if (!result.calories || result.calories <= 0) {
        throw new Error("Не удалось определить калории");
      }
      setCalories(result.calories);
      setCaloriesEdited(true);
      if (isFood) setFoodEstimateForTitle(name);
      setEstimatedForDuration(isFood ? null : durationMinutesTotal);
      haptic("success");
    } catch (err) {
      haptic("error");
      setError(apiErrorMessage(err));
    } finally {
      setIsEstimating(false);
    }
  };

  const submit = async () => {
    const name = title.trim();
    if (!name) {
      haptic("warning");
      setError(isFood ? "Укажи, что ты съел" : "Укажи название активности");
      return;
    }
    if (!isFood && durationMinutesTotal < 1) {
      haptic("warning");
      setError("Выбери длительность активности");
      return;
    }
    if (!isFood && estimatedForDuration !== null && estimatedForDuration !== durationMinutesTotal) {
      haptic("warning");
      setError("Длительность изменилась — пересчитай калории");
      return;
    }

    const at = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
    );

    try {
      setIsSubmitting(true);
      setError(null);
      let kcal = calories;
      if (isFood && !caloriesEdited) {
        const estimate = await estimateCalories({ title: name });
        if (!estimate.calories || estimate.calories <= 0) {
          setError("Не удалось определить калории — попробуй ещё раз");
          haptic("warning");
          return;
        }
        kcal = estimate.calories;
      }
      if (!kcal || Number.isNaN(kcal) || kcal <= 0) {
        setError("Укажи количество калорий");
        haptic("warning");
        return;
      }

      await createAction.mutateAsync({
        date: Math.floor(at.getTime() / 1000),
        activity_name: name,
        calories: Math.round(kcal),
        type,
      });

      haptic("success");
      reset();
      onClose();
    } catch (err) {
      haptic("error");
      setError(apiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="add-entry"
          initial={{ opacity: 0, x: "8%" }}
          animate={{
            opacity: 1,
            x: 0,
            transition: { duration: 0.24, ease: easings.out },
          }}
          exit={{
            opacity: 0,
            x: "8%",
            transition: { duration: 0.16, ease: easings.smooth },
          }}
          className="fixed inset-0 z-40 mx-auto flex w-full max-w-app min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-[#212121] px-[14px] pt-4 pb-24"
        >
      <header className="mb-5 flex min-h-10 items-center gap-2">
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-on"
        >
          <CrossIcon size={24} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[18px] font-medium text-accent">
          {isFood ? "Новая запись о приёме пищи" : "Новая запись об активности"}
        </h1>
        <button
          type="button"
          onClick={onCalendar}
          aria-label="Выбрать дату"
          className="flex h-10 w-10 shrink-0 items-center justify-center"
        >
          <img src={calendarIcon} alt="" aria-hidden="true" className="h-9 w-9" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        <section className="rounded-card bg-[#272727] px-6 py-3">
          <h2 className="text-[24px] font-medium leading-8 text-on">🕒 Время</h2>
          <TimeWheelPair
            hours={hour}
            minutes={minute}
            onHoursChange={setHour}
            onMinutesChange={setMinute}
            hourValues={HOURS}
            ariaPrefix="Время записи"
          />
        </section>

        <section className="rounded-card bg-[#272727] px-5 py-3">
          <h2 className="mb-3 text-[24px] font-medium leading-8 text-on">⚡ Название</h2>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isFood ? "Например: овсянка с бананом" : "Например: бег"}
            aria-label={isFood ? "Название блюда" : "Название активности"}
            className="h-[50px] rounded-[18px] bg-black px-5 py-2 !text-[18px] placeholder:!text-[18px] placeholder:text-[#858585] placeholder:opacity-100"
            style={{ backgroundColor: "#000000" }}
          />
        </section>

        {!isFood && (
          <section className="rounded-card bg-[#272727] px-6 py-3">
            <h2 className="text-[24px] font-medium leading-8 text-on">
              ⏱ Длительность активности
            </h2>
            <TimeWheelPair
              hours={durationHours}
              minutes={durationMinutes}
              onHoursChange={setDurationHours}
              onMinutesChange={setDurationMinutes}
              hourValues={DURATION_HOURS}
              ariaPrefix="Длительность активности"
            />
          </section>
        )}

        <Button
          variant="outline"
          fullWidth
          onClick={() => void estimate()}
          disabled={isEstimating || isSubmitting || createAction.isPending || (isFood && foodEstimateForTitle === title.trim())}
          className="min-h-[53px] px-3 text-[16px] font-medium"
        >
          {isEstimating ? (
            <Spinner size={22} className="shrink-0" />
          ) : (
            "Пусть Рафик сделает расчёт калорий"
          )}
        </Button>
        {!isFood && (
          <p className="-mt-3 text-center text-[12px] text-on/60">
            Примерная оценка для занятия длительностью {durationLabel}
          </p>
        )}

        <section
          className="rounded-card bg-[#272727] px-5 py-3"
        >
          <h2 className="text-[24px] font-medium leading-8 text-on">
            🔥 Потреблено калорий
          </h2>
          <div className="mt-2 flex justify-center">
            <WheelColumn
              values={CALORIES}
              selected={calories}
              onSelect={(value) => {
                setCalories(value);
                setCaloriesEdited(true);
                setEstimatedForDuration(null);
              }}
              ariaLabel="Калории"
              viewportClassName="h-[105px] w-full max-w-[180px]"
              valueClassName="text-[27px] leading-8"
            />
          </div>
        </section>

        {error && (
          <p role="alert" className="px-2 text-center text-bodySm text-danger">
            {error}
          </p>
        )}

        <Button
          variant="outline"
          fullWidth
          onClick={() => void submit()}
          disabled={isEstimating || isSubmitting || createAction.isPending}
          className="mt-auto min-h-[50px] text-[23px] font-medium"
        >
          {isSubmitting ? <Spinner size={24} className="shrink-0" /> : "Добавить запись"}
        </Button>
      </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
