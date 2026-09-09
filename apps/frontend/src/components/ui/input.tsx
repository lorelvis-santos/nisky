import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  variant?: "default" | "plain";
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <input
      ref={ref}
      className={variant === "plain"
        ? [
            "block min-w-0 rounded-none border-0 bg-transparent p-0 outline-none transition-colors focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-wait disabled:opacity-60",
            className,
          ].filter(Boolean).join(" ")
        : cn(
            "field outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-60",
            className,
          )}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export { Input };
