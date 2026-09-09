import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("font-label-md text-label-md text-on-surface-variant", className)}
      {...props}
    />
  ),
);

Label.displayName = "Label";

export { Label };
