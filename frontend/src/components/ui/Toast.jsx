import * as React from "react";
import { cn } from "../../utils/cn";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

export function Toast({ title, description, variant = "default", onClose, className }) {
  const icons = {
    default: <Info className="h-5 w-5 text-blue-500" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  };

  const bgs = {
    default: "bg-white border-gray-200",
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
  };

  return (
    <div className={cn("pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg ring-1 ring-black ring-opacity-5", bgs[variant], className)}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[variant]}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
