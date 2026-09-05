import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Mail, Download, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { payslipService } from '../../services/payslipService';
import { cn } from '../../utils/cn';

export function PayslipDetail() {
  const { id } = useParams();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchPayslip = async () => {
    try {
      setLoading(true);
      const data = await payslipService.getPayslip(id);
      setPayslip(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslip();
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await payslipService.sendPayslipEmail(id);
      showToast('Payslip sent successfully via email.', 'success');
      await fetchPayslip(); // Refresh status
    } catch (err) {
      showToast('Failed to send email: ' + err.message, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10 print-hidden">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className="text-center py-12 print-hidden">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Payslip not found</h3>
        <Link to="/payroll/payslips" className="mt-4 text-primary-600 hover:text-primary-500">Back to Payslips</Link>
      </div>
    );
  }

  const basicTotal = payslip.breakdown?.filter(r => r.category === 'Basic').reduce((sum, r) => sum + r.amount, 0) || 0;
  const allowancesTotal = payslip.breakdown?.filter(r => r.category === 'Allowance').reduce((sum, r) => sum + r.amount, 0) || 0;
  const deductionsTotal = payslip.breakdown?.filter(r => r.category === 'Deduction').reduce((sum, r) => sum + r.amount, 0) || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 payslip-container">
      {/* Action Bar - Hidden during print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print-hidden">
        <div className="flex items-center space-x-4">
          <Link to="/payroll/payslips" className="p-2 -ml-2 text-gray-400 hover:text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payslip {payslip.payslipNumber}</h1>
            <p className="text-sm text-gray-500">For {payslip.employeeName} • {payslip.payrollPeriod}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Printer className="-ml-1 mr-2 h-4 w-4 text-gray-500" />
            Print / PDF
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {sendingEmail ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Mail className="-ml-1 mr-2 h-4 w-4" />
            )}
            Send by Email
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className={cn(
          "rounded-md p-4 flex items-center transition-all print-hidden",
          toastMessage.type === 'success' ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Printable Payslip Document */}
      <div className="bg-white shadow-sm sm:rounded-lg border border-gray-200 print-document">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-200 flex justify-between items-start">
          <div>
            <div className="flex items-center text-primary-600 mb-2">
              <Building className="h-8 w-8 mr-2" />
              <span className="text-2xl font-bold tracking-tight text-gray-900">PeoplePay360</span>
            </div>
            <p className="text-sm text-gray-500">123 Tech Park, Innovation Way</p>
            <p className="text-sm text-gray-500">Bangalore, Karnataka 560001</p>
            <p className="text-sm text-gray-500">contact@peoplepay360.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">Payslip</h2>
            <p className="text-gray-500 mt-1">{payslip.payrollPeriod}</p>
            <p className="text-sm font-medium text-gray-900 mt-4">Payslip No: {payslip.payslipNumber || payslip.id}</p>
            <p className="text-sm text-gray-500">Generated: {new Date(payslip.generatedAt || new Date()).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Employee Info */}
        <div className="p-8 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Employee Details</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-xs font-medium text-gray-500">Name</dt>
                  <dd className="text-sm font-semibold text-gray-900">{payslip.employeeName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-xs font-medium text-gray-500">Employee ID</dt>
                  <dd className="text-sm font-semibold text-gray-900">{payslip.employeeId}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-xs font-medium text-gray-500">Department</dt>
                  <dd className="text-sm text-gray-900">{payslip.department || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-xs font-medium text-gray-500">Job Position</dt>
                  <dd className="text-sm text-gray-900">{payslip.jobPosition || 'N/A'}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Payroll Details</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-xs font-medium text-gray-500">Payrun</dt>
                  <dd className="text-sm text-gray-900">{payslip.payrunName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-xs font-medium text-gray-500">Structure</dt>
                  <dd className="text-sm text-gray-900">{payslip.structureName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-xs font-medium text-gray-500">Payment Status</dt>
                  <dd className="text-sm font-semibold text-green-600">{payslip.status === 'Paid' ? 'Paid' : 'Pending Payment'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Salary Details */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Earnings */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-300 pb-2">Earnings</h3>
              <table className="min-w-full">
                <tbody>
                  {payslip.breakdown?.filter(r => r.category === 'Basic' || r.category === 'Allowance').map(rule => (
                    <tr key={rule.ruleId}>
                      <td className="py-2 text-sm text-gray-700">{rule.ruleName}</td>
                      <td className="py-2 text-sm text-gray-900 text-right font-medium">₹{rule.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td className="py-3 text-sm font-bold text-gray-900">Total Earnings</td>
                    <td className="py-3 text-sm font-bold text-gray-900 text-right">₹{(basicTotal + allowancesTotal).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-300 pb-2">Deductions</h3>
              <table className="min-w-full">
                <tbody>
                  {payslip.breakdown?.filter(r => r.category === 'Deduction').map(rule => (
                    <tr key={rule.ruleId}>
                      <td className="py-2 text-sm text-gray-700">{rule.ruleName}</td>
                      <td className="py-2 text-sm text-red-600 text-right font-medium">₹{rule.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                  {deductionsTotal === 0 && (
                    <tr>
                      <td className="py-2 text-sm text-gray-500 italic" colSpan="2">No deductions</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td className="py-3 text-sm font-bold text-gray-900">Total Deductions</td>
                    <td className="py-3 text-sm font-bold text-red-600 text-right">₹{deductionsTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        </div>

        {/* Net Salary Footer */}
        <div className="bg-gray-50 p-8 border-t border-gray-200 flex justify-between items-center rounded-b-lg">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wider font-bold">Net Salary Payable</p>
            <p className="text-xs text-gray-500 mt-1">Amount transferred to employee's bank account.</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-primary-700">₹{(payslip.net || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>
        
        {/* Signatures (for print) */}
        <div className="p-8 pt-16 hidden print-signature-block">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Employer Signature</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Employee Signature</p>
            </div>
          </div>
          <div className="text-center mt-12 text-xs text-gray-400 italic">
            This is a system generated document.
          </div>
        </div>
      </div>
    </div>
  );
}
