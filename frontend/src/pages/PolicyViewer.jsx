import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { policyService } from '../services/policyService';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

  // PDF state
  const [numPages, setNumPages] = React.useState(null);
  const [pageNumber, setPageNumber] = React.useState(1);

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
      toast({ title: 'Success', description: 'Policy acknowledged successfully', type: 'success' });
      await loadPolicy(); // Reload to get updated status
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsAcknowledging(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  if (isLoading) return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Spinner size="xl" /></div>;
  
  if (error || !policy) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
        <div className="text-red-500"><FileText className="w-12 h-12" /></div>
        <p className="text-gray-900 font-medium">{error || 'Policy not found'}</p>
        <Button onClick={() => navigate('/policies')} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Policies</Button>
      </div>
    );
  }

  // Handle PDF URL
  let pdfUrl = policy.pdfUrl;
  if (pdfUrl.startsWith('/')) {
    pdfUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/public/policies${pdfUrl}`;
  } else if (!pdfUrl.startsWith('http')) {
    pdfUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/public/policies/${pdfUrl}`;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/policies')} className="text-gray-500">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{policy.title}</h1>
            <p className="text-sm text-gray-500">Version {policy.version} · Updated on {new Date(policy.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* PDF Viewer - completely disables native browser UI, downloads, and copying */}
      <div className="flex-grow bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner flex flex-col items-center justify-start overflow-y-auto p-4 select-none" onContextMenu={(e) => e.preventDefault()}>
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="py-20"><Spinner /></div>}
          error={<div className="py-20 text-red-500">Failed to load PDF document.</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            className="shadow-lg border border-gray-200"
            width={800}
          />
        </Document>

        {numPages && (
          <div className="flex items-center space-x-4 mt-4 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-700 font-medium">Page {pageNumber} of {numPages}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {isEmployee && (
        <div className="mt-4 flex-shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Policy Acknowledgment</p>
            <p className="text-xs text-gray-500">By acknowledging, you confirm you have read and understood this document.</p>
          </div>
          <div>
            {policy.isAcknowledged ? (
              <div className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm">Acknowledged on {new Date(policy.acknowledgedAt).toLocaleString()}</span>
              </div>
            ) : (
              <Button 
                onClick={handleAcknowledge} 
                isLoading={isAcknowledging}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                I have read and acknowledge this policy
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
