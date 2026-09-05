import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Filter, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { payslipService } from '../../services/payslipService';
import { cn } from '../../utils/cn';

export function PayslipsList() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const data = await payslipService.getPayslips();
      setPayslips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredPayslips.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPayslips.map(ps => ps.id)));
    }
  };

  const handleBulkEmail = async () => {
    if (selectedIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to send ${selectedIds.size} payslips by email?`)) {
      return;
    }

    setSendingEmail(true);
    try {
      const result = await payslipService.bulkSendPayslips(Array.from(selectedIds));
      if (result.failed > 0) {
        showToast(`Sent ${result.successful} payslips. Failed: ${result.failed}`, 'warning');
      } else {
        showToast(`Successfully sent ${result.successful} payslips.`, 'success');
      }
      setSelectedIds(new Set());
      await fetchPayslips(); // Refresh statuses
    } catch (err) {
      showToast('Error sending payslips: ' + err.message, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredPayslips = payslips.filter(ps => {
    const term = searchTerm.toLowerCase();
    return (
      (ps.employeeName && ps.employeeName.toLowerCase().includes(term)) ||
      (ps.payslipNumber && ps.payslipNumber.toLowerCase().includes(term)) ||
      (ps.employeeId && ps.employeeId.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Payslips"
          subtitle="View and manage generated employee payslips"
        />
        <div className="flex gap-3">
          <button
            onClick={handleBulkEmail}
            disabled={selectedIds.size === 0 || sendingEmail}
            className="inline-flex items-center justify-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {sendingEmail ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <Mail className="-ml-1 mr-2 h-4 w-4 text-gray-500" />
            )}
            Send Selected ({selectedIds.size})
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className={cn(
          "rounded-md p-4 flex items-center transition-all",
          toastMessage.type === 'success' ? "bg-green-50 text-green-800" : 
          toastMessage.type === 'warning' ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="relative w-full sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Search payslips..."
            />
          </div>
          <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2 text-gray-400" />
            Filters
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="text-center py-12 bg-white">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payslips found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Adjust your search terms.' : 'No payslips have been generated yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={filteredPayslips.length > 0 && selectedIds.size === filteredPayslips.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={selectedIds.has(ps.id)}
                        onChange={() => toggleSelection(ps.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/payroll/payslips/${ps.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">
                        {ps.payslipNumber || ps.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ps.employeeName}</div>
                      <div className="text-xs text-gray-500">{ps.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ps.payrollPeriod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">
                      ₹{(ps.net || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        ps.emailStatus === 'Not Sent' && "bg-gray-100 text-gray-800",
                        ps.emailStatus === 'Sent' && "bg-green-100 text-green-800",
                        ps.emailStatus === 'Failed' && "bg-red-100 text-red-800",
                      )}>
                        {ps.emailStatus || 'Not Sent'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/payroll/payslips/${ps.id}`} className="text-primary-600 hover:text-primary-900">
                        View
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
