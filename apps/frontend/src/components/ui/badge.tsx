import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-7 items-center rounded-full px-2.5 font-label-md text-label-md font-medium transition-colors",
  {
    variants: {
      variant: {
        neutral: "bg-surface-container-low text-on-surface-variant",
        secondary: "bg-secondary-container text-on-secondary-container",
        success: "bg-tertiary-container text-on-tertiary-container",
        warning: "bg-warning-container text-on-warning-container",
        destructive: "bg-error-container text-on-error-container",
        outline: "border border-outline-variant bg-surface-bright text-on-surface-variant",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
