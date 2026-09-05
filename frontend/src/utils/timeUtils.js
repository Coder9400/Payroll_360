/**
 * Converts a decimal hours value to a formatted string (e.g., 8.5 -> "8h 30m").
 * 
 * @param {number|string} decimalHours The decimal representing hours.
 * @returns {string} The formatted string, or "-" if input is invalid.
 */
export function formatHours(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(Number(decimalHours))) {
    return "-";
  }
  
  const totalMinutes = Math.round(Number(decimalHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0 && minutes === 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  
  return `${hours}h ${minutes}m`;
}

/**
 * Formats a given ISO timestamp to a locale time string (e.g., "09:30 AM").
 * 
 * @param {string} isoString The ISO string timestamp.
 * @returns {string} The formatted time, or "-" if input is invalid.
 */
export function formatTime(isoString) {
  if (!isoString) return "-";
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return "-";
  }
}
