"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { DayPicker, DayButton as DayPickerDayButton, type ChevronProps, type DayButtonProps } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

function CalendarChevron({ className, orientation }: ChevronProps) {
  const Icon = orientation === "left"
    ? ChevronLeft
    : orientation === "right"
      ? ChevronRight
      : orientation === "up"
        ? ChevronUp
        : ChevronDown;

  return <Icon aria-hidden="true" className={cn("size-4", className)} />;
}

function CalendarDayButton({ className, day, modifiers, ...props }: DayButtonProps) {
  return (
    <DayPickerDayButton
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg font-body-sm text-body-sm text-on-surface outline-none transition-colors hover:bg-surface-container-low hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        className,
        modifiers.selected && "bg-primary text-on-primary hover:bg-primary hover:text-on-primary",
        modifiers.today && !modifiers.selected && "font-semibold text-primary",
        modifiers.outside && "text-on-surface-variant opacity-40",
        modifiers.disabled && "text-on-surface-variant opacity-40",
      )}
      day={day}
      modifiers={modifiers}
      {...props}
    />
  );
}

function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("relative w-fit p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "relative space-y-4",
        month_caption: "relative flex h-10 items-center justify-center px-12",
        caption_label: "font-body-sm text-body-sm font-semibold text-on-surface",
        nav: "absolute inset-x-0 top-1 flex items-center justify-between px-1",
        button_previous: "absolute left-1 top-1 inline-flex size-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:pointer-events-none disabled:opacity-40",
        button_next: "absolute right-1 top-1 inline-flex size-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:pointer-events-none disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "h-8 w-9 rounded-md text-center font-label-caps text-[10px] text-on-surface-variant",
        week: "mt-1 flex w-full",
        day: "relative size-9 p-0 text-center text-sm",
        day_button: "",
        selected: "",
        today: "",
        outside: "",
        disabled: "",
        hidden: "invisible",
        range_start: "rounded-l-lg",
        range_end: "rounded-r-lg",
        range_middle: "rounded-none bg-primary-fixed text-on-primary-fixed",
        ...classNames,
      }}
      components={{ Chevron: CalendarChevron, DayButton: CalendarDayButton }}
      locale={es}
      navLayout="around"
      weekStartsOn={1}
      {...props}
    />
  );
}

export { Calendar };
