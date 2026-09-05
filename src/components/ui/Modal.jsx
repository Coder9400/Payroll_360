import * as React from "react";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";

export function Modal({ isOpen, onClose, title, children, className }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0">
      <div 
        className={cn(
          "bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col",
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
