import * as React from "react";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

export function Spinner({ className, size = "md", ...props }) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <Loader2
      className={cn("animate-spin text-primary-600", sizes[size], className)}
      {...props}
    />
  );
}
