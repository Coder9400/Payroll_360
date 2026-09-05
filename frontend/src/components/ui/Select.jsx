import * as React from "react";
import { cn } from "../../utils/cn";

const Select = React.forwardRef(({ className, error, options = [], ...props }, ref) => {
  return (
    <div className="w-full">
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-danger focus:ring-danger",
          className
        )}
        ref={ref}
        {...props}
      >
        <option value="" disabled>Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-sm text-danger mt-1">{error}</span>}
    </div>
  );
});
Select.displayName = "Select";

export { Select };
