import * as React from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { formatTime } from "../../utils/timeUtils";

export function RegularizationForm({ record, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = React.useState({
    requestedCheckIn: "",
    requestedCheckOut: "",
    reason: ""
  });
  const [errors, setErrors] = React.useState({});

  // Initialize with original values if they exist, but formatted for datetime-local input
  // Since we are mocking, we will just use basic text or time inputs.
  // For better UX, we'll use HTML5 time inputs.

  const getHtmlTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toTimeString().slice(0, 5); // "HH:MM"
  };

  React.useEffect(() => {
    if (record) {
      setFormData({
        requestedCheckIn: getHtmlTime(record.checkIn) || "09:00",
        requestedCheckOut: getHtmlTime(record.checkOut) || "18:00",
        reason: ""
      });
    }
  }, [record]);

  const validate = () => {
    const newErrors = {};
    if (!formData.requestedCheckIn) newErrors.requestedCheckIn = "Requested Check In is required";
    if (!formData.requestedCheckOut) newErrors.requestedCheckOut = "Requested Check Out is required";
    if (!formData.reason.trim()) newErrors.reason = "Reason is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    // Construct ISO strings for the current record date
    const datePrefix = record.date; // e.g. 2024-05-10
    const inIso = `${datePrefix}T${formData.requestedCheckIn}:00Z`;
    const outIso = `${datePrefix}T${formData.requestedCheckOut}:00Z`;

    onSubmit({
      attendanceId: record.id,
      employeeId: record.employeeId,
      date: record.date,
      originalCheckIn: record.checkIn,
      originalCheckOut: record.checkOut,
      requestedCheckIn: inIso,
      requestedCheckOut: outIso,
      reason: formData.reason,
    });
  };

  if (!record) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Original Record</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-xs text-gray-500">Date</span>
            <span className="text-sm font-medium">
              {new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Status</span>
            <span className="text-sm font-medium">{record.status}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Check In</span>
            <span className="text-sm font-medium">{formatTime(record.checkIn)}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Check Out</span>
            <span className="text-sm font-medium">{formatTime(record.checkOut)}</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Requested Changes</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check In Time <span className="text-red-500">*</span>
            </label>
            <Input
              type="time"
              value={formData.requestedCheckIn}
              onChange={(e) => setFormData({ ...formData, requestedCheckIn: e.target.value })}
              className={errors.requestedCheckIn ? "border-red-500" : ""}
            />
            {errors.requestedCheckIn && <p className="text-red-500 text-xs mt-1">{errors.requestedCheckIn}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check Out Time <span className="text-red-500">*</span>
            </label>
            <Input
              type="time"
              value={formData.requestedCheckOut}
              onChange={(e) => setFormData({ ...formData, requestedCheckOut: e.target.value })}
              className={errors.requestedCheckOut ? "border-red-500" : ""}
            />
            {errors.requestedCheckOut && <p className="text-red-500 text-xs mt-1">{errors.requestedCheckOut}</p>}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className={`w-full rounded-md border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2.5 ${
            errors.reason ? "border-red-500" : "border-gray-300"
          }`}
          rows="3"
          placeholder="E.g., Forgot to check out, system was down..."
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
        />
        {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
