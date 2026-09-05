// Mock Data
let mockSchedules = [
  {
    id: 'SCH-001',
    name: 'Standard 40 Hours / 5 Days',
    hoursPerWeek: 40,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    dailyStartTime: '09:00',
    dailyEndTime: '18:00',
    breakDurationHours: 1,
    isActive: true,
  },
  {
    id: 'SCH-002',
    name: 'Standard 45 Hours / 5 Days',
    hoursPerWeek: 45,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    dailyStartTime: '08:00',
    dailyEndTime: '18:00',
    breakDurationHours: 1,
    isActive: true,
  },
  {
    id: 'SCH-003',
    name: 'Part-Time 20 Hours / 4 Days',
    hoursPerWeek: 20,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu'],
    dailyStartTime: '09:00',
    dailyEndTime: '14:00',
    breakDurationHours: 0,
    isActive: true,
  }
];

// Helper to simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const scheduleService = {
  /**
   * Get all working schedules
   */
  async getSchedules() {
    await delay(300);
    return [...mockSchedules];
  },

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(id) {
    await delay(200);
    const schedule = mockSchedules.find(s => s.id === id);
    if (!schedule) throw new Error("Schedule not found");
    return { ...schedule };
  },

  /**
   * Create a new working schedule
   */
  async createSchedule(data) {
    await delay(500);
    const newSchedule = {
      ...data,
      id: `SCH-${String(mockSchedules.length + 1).padStart(3, '0')}`,
      isActive: true,
    };
    mockSchedules = [newSchedule, ...mockSchedules];
    return { ...newSchedule };
  },

  /**
   * Update an existing working schedule
   */
  async updateSchedule(id, data) {
    await delay(500);
    const index = mockSchedules.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Schedule not found");
    
    mockSchedules[index] = { ...mockSchedules[index], ...data };
    return { ...mockSchedules[index] };
  }
};
