"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root className={cn("flex items-center gap-1", className)} {...props} />;
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn("inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-outline-variant px-2 font-data-mono text-data-mono text-xs text-on-surface-variant outline-none transition-colors hover:bg-surface-container-low hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20 data-[state=on]:border-primary data-[state=on]:bg-primary-container data-[state=on]:text-on-primary disabled:pointer-events-none disabled:opacity-50", className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
