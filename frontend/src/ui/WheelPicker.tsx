import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface ColumnConfig<T> {
  /** Label rendered at the top of the wheel (usually a unit or a label). */
  label?: string;
  values: readonly T[];
  unit?: string;
  initialValue?: T;
}

interface WheelColumnProps<T> extends ColumnConfig<T> {
  selected: T;
  onSelect: (value: T) => void;
  ariaLabel: string;
  /** Override the picker viewport width for responsive multi-column layouts. */
  viewportClassName?: string;
  valueClassName?: string;
  displayValue?: (value: T) => string;
}

/**
 * A single iOS-style scroll column for weight / height / date / time pickers.
 * Fig: centred value fs27 (gradient/fade for adjacent rows).
 */
export function WheelColumn<T extends string | number>({
  values,
  selected,
  onSelect,
  unit,
  label,
  ariaLabel,
  viewportClassName,
  valueClassName,
  displayValue,
}: WheelColumnProps<T>) {
  const selectedIndex = Math.max(
    0,
    values.findIndex((v) => String(v) === String(selected)),
  );
  const clampedIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startOffset = useRef(0);

  const rowHeight = 35;

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const top = (index - 1) * rowHeight;
      el.scrollTo({ top, behavior: "smooth" });
    },
    [rowHeight],
  );

  useEffect(() => {
    scrollToIndex(clampedIndex);
  }, [clampedIndex, scrollToIndex]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    startY.current = e.clientY;
    startOffset.current = viewportRef.current?.scrollTop ?? 0;
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = startOffset.current - (e.clientY - startY.current);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const el = viewportRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / rowHeight) + 1;
    const idxClamped = Math.max(0, Math.min(values.length - 1, idx));
    if (idxClamped !== idx) {
      el.scrollTo({ top: idxClamped * rowHeight, behavior: "smooth" });
    }
    onSelect(values[idxClamped]);
  };

  const renderRow = (value: T, index: number) => {
    const distance = Math.abs(index - clampedIndex);
    const opacity =
      distance === 0 ? 1 : distance === 1 ? 0.35 : 0.12;
    const scale = distance === 0 ? 1 : 0.92;
    return (
      <div
        key={String(value)}
        role="option"
        aria-selected={distance === 0}
        tabIndex={0}
        onClick={() => {
          onSelect(value);
          scrollToIndex(index);
        }}
        className="flex h-[35px] w-full min-w-0 cursor-pointer items-center justify-center"
        style={{ opacity, transform: `scale(${scale})`, transition: "opacity 0.15s ease, transform 0.15s ease" }}
      >
        <span
          className={clsx(
            "text-h3 text-on tabular-nums",
            "block max-w-full truncate",
            valueClassName,
            distance === 0 && "font-medium",
          )}
        >
          {displayValue ? displayValue(value) : value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    );
  };

  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center"
      aria-label={ariaLabel}
    >
      {label && (
        <span className="mb-2 text-bodySm text-on/60">{label}</span>
      )}
      <div
        ref={viewportRef}
        role="listbox"
        aria-activedescendant={`wheel-${ariaLabel}-${clampedIndex}`}
        className={clsx("relative h-[105px] w-[110px] select-none overflow-hidden", viewportClassName)}
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {values.map((v, i) => renderRow(v, i))}
      </div>
    </div>
  );
}
