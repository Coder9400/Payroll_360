import * as React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ValidationSummaryModal({ isOpen, onClose, warnings, onProceed }) {
  if (!isOpen) return null;

  const hasErrors = warnings.some(w => w.type === 'Error');
  const hasWarnings = warnings.some(w => w.type === 'Warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            {hasErrors ? (
              <><AlertCircle className="h-5 w-5 text-red-600 mr-2" /> Validation Failed</>
            ) : hasWarnings ? (
              <><AlertCircle className="h-5 w-5 text-amber-600 mr-2" /> Validation Warnings</>
            ) : (
              <><CheckCircle className="h-5 w-5 text-green-600 mr-2" /> Validation Successful</>
            )}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {warnings.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
              <p className="text-gray-700">No issues found. The payrun is ready to be validated.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {warnings.map((w, i) => (
                <li key={i} className={cn(
                  "p-3 rounded-md flex items-start text-sm",
                  w.type === 'Error' ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"
                )}>
                  <AlertCircle className={cn(
                    "h-5 w-5 mr-3 shrink-0",
                    w.type === 'Error' ? "text-red-500" : "text-amber-500"
                  )} />
                  <div>
                    <span className="font-semibold block">{w.type}</span>
                    {w.message}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {hasErrors ? 'Close' : 'Cancel'}
          </button>
          {!hasErrors && (
            <button
              onClick={onProceed}
              className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
            >
              Confirm Validation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
