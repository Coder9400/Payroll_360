import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "../../utils/cn";

export function Breadcrumb({ items, className }) {
  return (
    <nav className={cn("flex mb-4", className)} aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-2">
        <li>
          <div>
            <Link to="/dashboard" className="text-gray-400 hover:text-gray-500">
              <Home className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>
        {items.map((item, index) => (
          <li key={item.name}>
            <div className="flex items-center">
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <Link
                to={item.href}
                className={cn(
                  "ml-2 text-sm font-medium",
                  index === items.length - 1
                    ? "text-gray-700 pointer-events-none"
                    : "text-gray-500 hover:text-gray-700"
                )}
                aria-current={index === items.length - 1 ? "page" : undefined}
              >
                {item.name}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
