import * as React from "react";
import { cn } from "../../utils/cn";
import { MoreVertical } from "lucide-react";

export function Dropdown({ trigger, items, align = "right", className }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger || (
          <button className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
            <MoreVertical className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-10 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          )}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm transition-colors",
                  item.danger ? "text-danger hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
