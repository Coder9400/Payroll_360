import * as React from "react";
import { Select } from "./Select";

export function TimePicker({ value, onChange, error }) {
  // value is expected to be "HH:mm" in 24h format
  const [h, m] = value ? value.split(':') : ['09', '00'];
  const hour24 = parseInt(h, 10);
  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 || 12;

  const handleHour = (e) => {
    let newH = parseInt(e.target.value, 10);
    if (isPM && newH !== 12) newH += 12;
    if (!isPM && newH === 12) newH = 0;
    onChange(`${newH.toString().padStart(2, '0')}:${m}`);
  };

  const handleMin = (e) => {
    onChange(`${h}:${e.target.value.padStart(2, '0')}`);
  };

  const handleAmPm = (e) => {
    const newIsPM = e.target.value === 'PM';
    let newHour24 = hour12;
    if (newIsPM && hour12 !== 12) newHour24 += 12;
    if (!newIsPM && hour12 === 12) newHour24 = 0;
    onChange(`${newHour24.toString().padStart(2, '0')}:${m}`);
  };

  return (
    <div className="flex space-x-2 w-full">
      <Select value={hour12.toString()} onChange={handleHour} className={error ? 'border-red-500' : ''}>
        {[...Array(12)].map((_, i) => (
          <option key={i+1} value={(i+1).toString()}>{i+1}</option>
        ))}
      </Select>
      <Select value={m} onChange={handleMin} className={error ? 'border-red-500' : ''}>
        {['00', '15', '30', '45'].map(min => (
          <option key={min} value={min}>{min}</option>
        ))}
      </Select>
      <Select value={isPM ? 'PM' : 'AM'} onChange={handleAmPm} className={error ? 'border-red-500' : ''}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </Select>
    </div>
  );
}
