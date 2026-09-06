import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { policyService } from '../services/policyService';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const useToast = () => ({
  toast: ({ title, description, type }) => console.log('Toast:', title, description, type),
});

export function PolicyViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [policy, setPolicy] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAcknowledging, setIsAcknowledging] = React.useState(false);
  const [error, setError] = React.useState(null);

  const isEmployee = !!currentUser?.employee?.id;

  const loadPolicy = React.useCallback(async () => {
    try {
      const data = await policyService.getPolicyById(id);
      setPolicy(data);
    } catch (err) {
      setError(err.message || 'Failed to load policy');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      await policyService.acknowledgePolicy(id);
      toast({ title: 'Success', description: 'Policy acknowledged', type: 'success' });
      await loadPolicy();
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-96"><Spinner size="xl" /></div>
  );

  if (error || !policy) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <FileText className="w-12 h-12 text-red-400" />
        <p className="text-gray-900 font-medium">{error || 'Policy not found'}</p>
        <Button onClick={() => navigate('/policies')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  let pdfUrl = policy.pdfUrl || '';
  if (pdfUrl.startsWith('/')) {
    pdfUrl = `${apiBase}/public/policies${pdfUrl}`;
  } else if (!pdfUrl.startsWith('http')) {
    pdfUrl = `${apiBase}/public/policies/${pdfUrl}`;
  }
  const iframeSrc = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex items-center space-x-4 mb-4 flex-shrink-0">
        <Button variant="ghost" onClick={() => navigate('/policies')} className="text-gray-500">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{policy.title}</h1>
          <p className="text-sm text-gray-500">Version {policy.version} · Updated {new Date(policy.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div
        className="flex-grow rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100 select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          src={iframeSrc}
          title={policy.title}
          className="w-full h-full border-0"
        />
      </div>

      {isEmployee && (
        <div className="mt-4 flex-shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Policy Acknowledgment</p>
            <p className="text-xs text-gray-500">By acknowledging, you confirm you have read this document.</p>
          </div>
          {policy.isAcknowledged ? (
            <div className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span className="font-medium text-sm">Acknowledged on {new Date(policy.acknowledgedAt).toLocaleString()}</span>
            </div>
          ) : (
            <Button onClick={handleAcknowledge} isLoading={isAcknowledging} className="bg-primary-600 hover:bg-primary-700 text-white">
              I have read and acknowledge this policy
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
