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
  const [windowStart, setWindowStart] = useState(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const pointerDownIndex = useRef<number | null>(null);
  const pointerMoved = useRef(false);

  const rowHeight = 35;
  const visibleRows = 7;
  const maxWindowStart = Math.max(0, values.length - visibleRows);

  const updateWindow = (scrollTop: number) => {
    const nextStart = Math.max(
      0,
      Math.min(maxWindowStart, Math.floor(scrollTop / rowHeight) - 1),
    );

    setWindowStart((current) => current === nextStart ? current : nextStart);
  };

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = viewportRef.current;

      if (!el) return;
      const top = index * rowHeight;

      el.scrollTo({ top, behavior: "smooth" });
      updateWindow(top);
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
    const option = (e.target as HTMLElement).closest<HTMLElement>("[data-wheel-index]");

    pointerDownIndex.current = option ? Number(option.dataset.wheelIndex) : null;
    pointerMoved.current = false;
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const el = viewportRef.current;

    if (!el) return;
    const delta = e.clientY - startY.current;

    if (Math.abs(delta) > 3) pointerMoved.current = true;
    if (!pointerMoved.current) return;
    el.scrollTop = startOffset.current - delta;
    updateWindow(el.scrollTop);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const el = viewportRef.current;

    if (!el) return;
    if (!pointerMoved.current && pointerDownIndex.current !== null) {
      const selected = pointerDownIndex.current;

      pointerDownIndex.current = null;
      onSelect(values[selected]);
      scrollToIndex(selected);

      return;
    }
    pointerDownIndex.current = null;
    const idx = Math.round(el.scrollTop / rowHeight);
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
        aria-selected={distance === 0}
        className="flex h-[35px] w-full min-w-0 cursor-pointer items-center justify-center"
        data-wheel-index={index}
        id={`wheel-${ariaLabel}-${index}`}
        role="option"
        style={{ opacity, transform: `scale(${scale})`, transition: "opacity 0.15s ease, transform 0.15s ease" }}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onSelect(value);
          scrollToIndex(index);
        }}
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
      aria-label={ariaLabel}
      className="flex min-w-0 flex-1 flex-col items-center"
    >
      {label && (
        <span className="mb-2 text-bodySm text-on/60">{label}</span>
      )}
      <div
        ref={viewportRef}
        aria-activedescendant={`wheel-${ariaLabel}-${clampedIndex}`}
        className={clsx("relative h-[105px] w-[110px] select-none overflow-hidden", viewportClassName)}
        role="listbox"
        style={{ touchAction: "none" }}
        tabIndex={0}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div aria-hidden="true" style={{ height: (windowStart + 1) * rowHeight }} />
        {values.slice(windowStart, windowStart + visibleRows).map((v, offset) =>
          renderRow(v, windowStart + offset),
        )}
        <div
          aria-hidden="true"
          style={{ height: (Math.max(0, values.length - windowStart - visibleRows) + 1) * rowHeight }}
        />
      </div>
    </div>
  );
}
