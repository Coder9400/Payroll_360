import * as React from "react";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

const Button = React.forwardRef(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
      secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm",
      outline: "border border-primary-600 text-primary-600 hover:bg-primary-50",
      ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
      danger: "bg-danger text-white hover:bg-red-600 shadow-sm",
    };
    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-6 text-lg",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
