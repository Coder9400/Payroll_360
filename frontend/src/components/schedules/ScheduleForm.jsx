import * as React from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TimePicker } from "../ui/TimePicker";

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ScheduleForm({ onSubmit, onCancel, isLoading, initialData = null }) {
  const [formData, setFormData] = React.useState({
    name: initialData?.name || "",
    workingDays: initialData?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    dailyStartTime: initialData?.dailyStartTime || "09:00",
    dailyEndTime: initialData?.dailyEndTime || "18:00",
    breakDurationHours: initialData?.breakDurationHours ?? 1,
  });

  const [errors, setErrors] = React.useState({});

  const calculateHoursPerWeek = () => {
    if (!formData.dailyStartTime || !formData.dailyEndTime) return 0;
    
    const [startH, startM] = formData.dailyStartTime.split(':').map(Number);
    const [endH, endM] = formData.dailyEndTime.split(':').map(Number);
    
    let hoursPerDay = (endH + endM / 60) - (startH + startM / 60);
    
    // Handle cross-midnight shifts (e.g. 22:00 to 06:00)
    if (hoursPerDay < 0) {
      hoursPerDay += 24;
    }
    
    hoursPerDay -= formData.breakDurationHours;
    
    if (hoursPerDay < 0) hoursPerDay = 0;
    
    return hoursPerDay * formData.workingDays.length;
  };

  const calculatedHours = calculateHoursPerWeek();

  const toggleDay = (day) => {
    setFormData(prev => {
      const days = [...prev.workingDays];
      if (days.includes(day)) {
        return { ...prev, workingDays: days.filter(d => d !== day) };
      } else {
        // Maintain Mon-Sun order
        const newDays = [...days, day];
        newDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
        return { ...prev, workingDays: newDays };
      }
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Schedule name is required";
    if (formData.workingDays.length === 0) newErrors.workingDays = "Select at least one working day";
    if (!formData.dailyStartTime) newErrors.dailyStartTime = "Start time is required";
    if (!formData.dailyEndTime) newErrors.dailyEndTime = "End time is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    onSubmit({
      ...formData,
      hoursPerWeek: calculatedHours
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Schedule Name <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Standard 40 Hours"
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Working Days <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 text-sm rounded-md border font-medium transition-colors ${
                formData.workingDays.includes(day)
                  ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        {errors.workingDays && <p className="text-red-500 text-xs mt-1">{errors.workingDays}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time <span className="text-red-500">*</span>
          </label>
          <TimePicker
            value={formData.dailyStartTime}
            onChange={(val) => setFormData({ ...formData, dailyStartTime: val })}
            error={errors.dailyStartTime || errors.time}
          />
          {errors.dailyStartTime && <p className="text-red-500 text-xs mt-1">{errors.dailyStartTime}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time <span className="text-red-500">*</span>
          </label>
          <TimePicker
            value={formData.dailyEndTime}
            onChange={(val) => setFormData({ ...formData, dailyEndTime: val })}
            error={errors.dailyEndTime || errors.time}
          />
          {errors.dailyEndTime && <p className="text-red-500 text-xs mt-1">{errors.dailyEndTime}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unpaid Break Duration (Hours)
        </label>
        <Input
          type="number"
          min="0"
          step="0.5"
          value={formData.breakDurationHours}
          onChange={(e) => setFormData({ ...formData, breakDurationHours: Number(e.target.value) })}
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Calculated Hours Per Week:</span>
          <span className="text-lg font-bold text-primary-700">{calculatedHours} hrs</span>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </div>
    </form>
  );
}
