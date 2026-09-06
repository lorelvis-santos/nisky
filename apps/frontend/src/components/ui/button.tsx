import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary shadow-cadence-1 hover:bg-primary/90",
        outline:
          "border-outline-variant bg-surface-container-lowest text-primary hover:border-outline hover:bg-surface",
        secondary:
          "bg-surface-container-low text-on-surface hover:bg-surface-container",
        ghost: "text-surface-tint hover:bg-surface-container-low hover:text-on-surface",
        destructive:
          "bg-destructive text-destructive-foreground shadow-cadence-1 hover:bg-destructive/90",
        link: "text-secondary underline underline-offset-4 hover:text-primary",
      },
      size: {
        default: "h-11 gap-2 px-4",
        xs: "h-11 gap-1.5 px-3 text-xs",
        sm: "h-11 gap-1.5 px-3.5",
        lg: "h-11 gap-2 px-5",
        icon: "size-11",
        "icon-xs": "size-11 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-11",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
