import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { ContractTable } from '../components/contracts/ContractTable';
import { contractService } from '../services/contractService';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Plus } from 'lucide-react';

export function Contracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('All');

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let data = await contractService.getContracts();
      
      if (statusFilter !== 'All') {
        data = data.filter(c => c.status === statusFilter);
      }
      
      setContracts(data);
    } catch (error) {
      console.error("Failed to load contracts", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Employee Contracts"
          description="Manage compensation, job positions, and working schedules for all employees."
        />
        <Button onClick={() => navigate('/contracts/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Contract
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <Select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="All">All</option>
              <option value="Running">Running</option>
              <option value="Draft">Draft</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>
        </div>
        
        <ContractTable 
          data={contracts}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
