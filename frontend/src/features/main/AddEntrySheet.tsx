import { useMemo, useState } from "react";
import type { ActionType } from "@/api/types";
import { Button, Input, Sheet, Spinner, WheelColumn } from "@/ui";
import { CrossIcon } from "@/ui/icons";
import { useCreateAction } from "@/hooks/useActions";
import { estimateCalories } from "@/api/ai";
import { apiErrorMessage } from "@/api/client";
import { haptic } from "@/lib/telegram";

interface AddEntrySheetProps {
  open: boolean;
  onClose: () => void;
  utgid: number;
  type: ActionType;
  /** Day the entry belongs to (local midnight). */
  date: Date;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/**
 * "Добавить питание / активность" modal (Figma `150:142`, `150:322`).
 *
 * Bottom sheet with a title field, two time wheels (hours / minutes, centred
 * value fs27), and a save action. Food entries call `POST /api/ai/calories`
 * to estimate the calorie count from the title; activity entries take the
 * burned calories directly. The entry is persisted with `useCreateAction`.
 */
export function AddEntrySheet({
  open,
  onClose,
  utgid,
  type,
  date,
}: AddEntrySheetProps) {
  const isFood = type === "Food";
  const now = useMemo(() => new Date(), []);
  const [title, setTitle] = useState("");
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());
  const [calories, setCalories] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAction = useCreateAction(utgid);

  const reset = () => {
    setTitle("");
    setCalories("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const name = title.trim();
    if (!name) {
      haptic("warning");
      setError(isFood ? "Укажи, что ты съел" : "Укажи название активности");
      return;
    }

    const at = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
    );
    const timestamp = Math.floor(at.getTime() / 1000);

    try {
      setBusy(true);
      setError(null);

      let kcal = Number(calories);
      if (isFood && (!calories || Number.isNaN(kcal))) {
        const estimate = await estimateCalories({ title: name });
        kcal = estimate.calories;
      }
      if (Number.isNaN(kcal) || kcal <= 0) {
        setError("Не удалось определить калории — введи вручную");
        haptic("warning");
        return;
      }

      await createAction.mutateAsync({
        date: timestamp,
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
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 font-medium text-on">
            {isFood ? "Что ты съел?" : "Чем занимался?"}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Закрыть"
            className="flex h-11 w-11 items-center justify-center text-on"
          >
            <CrossIcon size={24} />
          </button>
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isFood ? "Например: овсянка с бананом" : "Например: бег"}
          aria-label={isFood ? "Название блюда" : "Название активности"}
        />

        <div className="flex items-center justify-center gap-4 rounded-card bg-[#272727] px-4 py-4">
          <WheelColumn
            values={HOURS}
            selected={hour}
            onSelect={setHour}
            label="Часы"
            ariaLabel="hours"
          />
          <span className="text-h3 text-on">:</span>
          <WheelColumn
            values={MINUTES}
            selected={minute}
            onSelect={setMinute}
            label="Минуты"
            ariaLabel="minutes"
          />
        </div>

        {!isFood && (
          <Input
            value={calories}
            inputMode="numeric"
            onChange={(e) => setCalories(e.target.value.replace(/\D/g, ""))}
            placeholder="Сколько калорий сожжено"
            aria-label="Калории"
          />
        )}

        {error && (
          <p role="alert" className="text-bodySm text-danger">
            {error}
          </p>
        )}

        <Button
          fullWidth
          onClick={() => void submit()}
          disabled={busy || createAction.isPending}
          className="min-h-[57px] bg-[#f08629] text-h3 font-medium"
        >
          {busy ? <Spinner size={24} /> : "Добавить"}
        </Button>
      </div>
    </Sheet>
  );
}
