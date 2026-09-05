import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calculator, CheckCircle, CreditCard, AlertCircle, FileText } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { payrollService } from '../../services/payrollService';
import { payslipService } from '../../services/payslipService';
import { ValidationSummaryModal } from '../../components/payroll/ValidationSummaryModal';
import { cn } from '../../utils/cn';

export function PayrunDetail() {
  const { id } = useParams();
  
  const [payrun, setPayrun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const loadPayrun = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getPayrun(id);
      setPayrun(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrun();
  }, [id]);

  const handleCompute = async () => {
    setProcessing(true);
    setError('');
    try {
      await payrollService.computePayrun(id);
      await loadPayrun();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const initiateValidation = async () => {
    setProcessing(true);
    try {
      const issues = await payrollService.getPayrollWarnings(id);
      setWarnings(issues);
      setShowValidationModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleValidate = async () => {
    setShowValidationModal(false);
    setProcessing(true);
    setError('');
    try {
      await payrollService.validatePayrun(id);
      await loadPayrun();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGeneratePayslips = async () => {
    setProcessing(true);
    setError('');
    try {
      await payslipService.generatePayslips(id);
      await loadPayrun();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!window.confirm("Are you sure you want to mark this payrun as paid?")) return;
    
    setProcessing(true);
    setError('');
    try {
      await payrollService.markPayrunPaid(id);
      await loadPayrun();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!payrun) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Payrun not found</h3>
        <Link to="/payroll/payruns" className="mt-4 text-primary-600 hover:text-primary-500">Back to Payruns</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/payroll/payruns" className="p-2 -ml-2 text-gray-400 hover:text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader
            title={payrun.name}
            subtitle={`${payrun.periodStart} to ${payrun.periodEnd} • ${payrun.structureName}`}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-3 py-1 inline-flex text-sm font-semibold rounded-full border",
            payrun.status === 'Draft' && "bg-gray-50 text-gray-700 border-gray-200",
            payrun.status === 'Computed' && "bg-blue-50 text-blue-700 border-blue-200",
            payrun.status === 'Validated' && "bg-green-50 text-green-700 border-green-200",
            payrun.status === 'Paid' && "bg-purple-50 text-purple-700 border-purple-200",
          )}>
            Status: {payrun.status}
          </span>
          
          {(payrun.status === 'Draft' || payrun.status === 'Computed') && (
            <button
              onClick={handleCompute}
              disabled={processing}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {processing && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>}
              <Calculator className="-ml-1 mr-2 h-4 w-4 text-gray-500" />
              Compute
            </button>
          )}

          {payrun.status === 'Computed' && (
            <button
              onClick={initiateValidation}
              disabled={processing}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="-ml-1 mr-2 h-4 w-4" />
              Validate
            </button>
          )}

          {payrun.status === 'Validated' && !payrun.payslipsGenerated && (
            <button
              onClick={handleGeneratePayslips}
              disabled={processing}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <FileText className="-ml-1 mr-2 h-4 w-4" />
              Generate Payslips
            </button>
          )}

          {payrun.status === 'Validated' && (
            <button
              onClick={handleMarkPaid}
              disabled={processing}
              className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
            >
              <CreditCard className="-ml-1 mr-2 h-4 w-4" />
              Mark as Paid
            </button>
          )}

          {payrun.payslipsGenerated && (
            <Link
              to="/payroll/payslips"
              className="inline-flex items-center justify-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              View All Payslips
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Employees</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">{payrun.employeeCount}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Gross</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">₹{(payrun.totalGross || 0).toLocaleString()}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Deductions</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">₹{((payrun.totalGross || 0) - (payrun.totalNet || 0)).toLocaleString()}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Net</dt>
            <dd className="mt-1 text-2xl font-semibold text-primary-600">₹{(payrun.totalNet || 0).toLocaleString()}</dd>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Employee Payslips</h3>
        </div>
        
        {payrun.payslips && payrun.payslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Allowances</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrun.payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ps.employeeName}</div>
                      <div className="text-xs text-gray-500">{ps.department} • {ps.jobPosition}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">₹{(ps.basic || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">₹{(ps.allowances || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">₹{(ps.gross || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">₹{(ps.deductions || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 text-right">₹{(ps.net || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        ps.status === 'Draft' && "bg-gray-100 text-gray-800",
                        ps.status === 'Computed' && "bg-blue-100 text-blue-800",
                        ps.status === 'Error' && "bg-red-100 text-red-800",
                        ps.status === 'Validated' && "bg-green-100 text-green-800",
                        ps.status === 'Generated' && "bg-blue-100 text-blue-800",
                        ps.status === 'Paid' && "bg-purple-100 text-purple-800",
                      )}>
                        {ps.status}
                      </span>
                      {ps.status === 'Generated' && (
                        <Link to={`/payroll/payslips/${ps.id}`} className="ml-3 text-xs text-primary-600 hover:text-primary-800 font-medium">
                          View PDF
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-sm text-gray-500">No employees found in this payrun.</p>
          </div>
        )}
      </div>

      <ValidationSummaryModal 
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        warnings={warnings}
        onProceed={handleValidate}
      />
    </div>
  );
}
