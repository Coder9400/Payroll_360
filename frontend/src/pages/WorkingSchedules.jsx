import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { scheduleService } from '../services/scheduleService';
import { ScheduleForm } from '../components/schedules/ScheduleForm';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Plus } from 'lucide-react';

export function WorkingSchedules() {
  const [schedules, setSchedules] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedSchedule, setSelectedSchedule] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await scheduleService.getSchedules();
      setSchedules(data);
    } catch (error) {
      console.error("Failed to load schedules", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (schedule) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (selectedSchedule) {
        await scheduleService.updateSchedule(selectedSchedule.id, formData);
      } else {
        await scheduleService.createSchedule(formData);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Failed to save schedule", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Schedule Name",
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-sm font-medium text-gray-900 block">{row.name}</span>
          <span className="text-xs text-gray-500 block">ID: {row.id}</span>
        </div>
      ),
    },
    {
      key: "hoursPerWeek",
      label: "Hours/Week",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{row.hoursPerWeek}</span>
      ),
    },
    {
      key: "workingDays",
      label: "Working Days",
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {row.workingDays.map(day => (
            <span key={day} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {day}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "time",
      label: "Time (Daily)",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.dailyStartTime} - {row.dailyEndTime}
        </span>
      ),
    },
    {
      key: "break",
      label: "Unpaid Break",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.breakDurationHours} hr{row.breakDurationHours !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.isActive ? 'green' : 'red'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            Edit
          </Button>
        </div>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Working Schedules"
          description="Manage company working hours and schedules for employees."
        />
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Schedule
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable 
          columns={columns}
          data={schedules}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyMessage="No working schedules found."
        />
      </div>

      <Modal 
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={selectedSchedule ? "Edit Working Schedule" : "Create Working Schedule"}
      >
        <ScheduleForm 
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isSubmitting}
          initialData={selectedSchedule}
        />
      </Modal>
    </div>
  );
}
