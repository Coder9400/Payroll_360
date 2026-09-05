import * as React from "react";
import { cn } from "../../utils/cn";

const Input = React.forwardRef(({ className, type, error, ...props }, ref) => {
  return (
    <div className="w-full">
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-danger focus:ring-danger",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <span className="text-sm text-danger mt-1">{error}</span>}
    </div>
  );
});
Input.displayName = "Input";

export { Input };
