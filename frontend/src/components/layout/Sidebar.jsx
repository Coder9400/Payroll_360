import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  FileSignature,
  DollarSign,
  FileText,
  Settings,
  Menu,
  X
} from "lucide-react";

export function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Attendance", href: "/attendance", icon: CalendarCheck },
    { name: "Time Off", href: "/time-off", icon: CalendarDays },
    { name: "Contracts", href: "/contracts", icon: FileSignature },
    { name: "Payroll", href: "/payroll", icon: DollarSign },
    { name: "Payslips", href: "/payslips", icon: FileText },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Settings", href: "#", icon: Settings, bottom: true },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar component */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-primary-600">PeoplePay360</span>
          <button 
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.filter(item => !item.bottom).map((item) => {
              const isActive = location.pathname.startsWith(item.href) && item.href !== "#";
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    isActive
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-700 hover:bg-gray-100",
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600",
                      "mr-3 h-5 w-5 shrink-0"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-gray-200 p-4">
            {navigation.filter(item => item.bottom).map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <item.icon
                  className="mr-3 h-5 w-5 shrink-0 text-gray-400 group-hover:text-gray-600"
                  aria-hidden="true"
                />
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
