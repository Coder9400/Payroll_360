import * as React from "react";
import { cn } from "../../utils/cn";
import { User } from "lucide-react";

const Avatar = React.forwardRef(({ className, src, alt, fallback, size = "md", ...props }, ref) => {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-gray-100",
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || "Avatar"}
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500">
          {fallback || <User className="h-1/2 w-1/2" />}
        </div>
      )}
    </div>
  );
});
Avatar.displayName = "Avatar";

export { Avatar };
