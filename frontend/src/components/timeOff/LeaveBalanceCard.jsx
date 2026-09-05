import * as React from "react";
import { Card } from "../ui/Card";
import { Calendar } from "lucide-react";

export function LeaveBalanceCard({ title, allocated, used, pending, remaining, isLoading }) {
  if (isLoading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  // Ensure values are numbers for safe calculation
  const safeAllocated = Number(allocated) || 0;
  const safeRemaining = Number(remaining) || 0;
  
  // Calculate percentage used for a small progress bar.
  // We use max(1, allocated) to avoid division by zero.
  const percentRemaining = Math.min(100, Math.max(0, (safeRemaining / Math.max(1, safeAllocated)) * 100));
  const isLowBalance = percentRemaining <= 20 && safeAllocated > 0;

  return (
    <Card className="p-5 flex flex-col h-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
          <Calendar className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 font-medium">Allocated</span>
          <span className="text-gray-900 font-semibold">{allocated} days</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 font-medium">Used</span>
          <span className="text-gray-900 font-semibold">{used} days</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 font-medium">Pending</span>
          <span className="text-gray-900 font-semibold">{pending} days</span>
        </div>
      </div>
      
      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-gray-600">Remaining</span>
          <span className={`text-2xl font-bold ${isLowBalance ? 'text-red-600' : 'text-primary-700'}`}>
            {remaining} <span className="text-sm font-medium text-gray-500">days</span>
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${isLowBalance ? 'bg-red-500' : 'bg-primary-500'}`}
            style={{ width: `${percentRemaining}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
}
