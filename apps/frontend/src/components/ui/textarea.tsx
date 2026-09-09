import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  variant?: "default" | "plain";
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <textarea
      ref={ref}
      className={variant === "plain"
        ? [
            "block min-w-0 resize-none rounded-none border-0 bg-transparent p-0 outline-none transition-colors focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-wait disabled:opacity-60",
            className,
          ].filter(Boolean).join(" ")
        : cn(
            "field h-auto min-h-20 resize-y py-2 leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-60",
            className,
          )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

export { Textarea };
