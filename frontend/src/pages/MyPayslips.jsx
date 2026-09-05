import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Download } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { payslipService } from '../services/payslipService';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export function MyPayslips() {
  const { currentUser } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      // Filter by the current user's employeeId
      // Fallback to EMP-001 for mock testing if currentUser.id is not mapped exactly
      const empId = currentUser?.id === 'USER-1' ? 'EMP-001' : currentUser?.id;
      const data = await payslipService.getPayslips({ employeeId: empId });
      setPayslips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [currentUser]);

  const filteredPayslips = payslips.filter(ps => {
    const term = searchTerm.toLowerCase();
    return (
      (ps.payslipNumber && ps.payslipNumber.toLowerCase().includes(term)) ||
      (ps.payrollPeriod && ps.payrollPeriod.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="My Payslips"
        subtitle="View and download your salary slips"
      />

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative w-full sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Search by period or number..."
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="text-center py-12 bg-white">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payslips available</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Adjust your search terms.' : 'You do not have any generated payslips yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/payroll/payslips/${ps.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">
                        {ps.payslipNumber || ps.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ps.payrollPeriod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      ₹{(ps.basic || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      ₹{(ps.gross || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">
                      ₹{(ps.net || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        to={`/payroll/payslips/${ps.id}`} 
                        className="inline-flex items-center text-primary-600 hover:text-primary-900"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View/PDF
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
