import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { policyService } from '../services/policyService';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Policies() {
  const [policies, setPolicies] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isEmployee = !!currentUser?.employee?.id;

  React.useEffect(() => {
    let cancelled = false;
    async function loadPolicies() {
      try {
        const data = await policyService.getPolicies();
        if (!cancelled) {
          setPolicies(data || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load policies');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadPolicies();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Policies & Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Read and acknowledge official company policies.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="xl" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState 
          icon={FileText} 
          title="No policies found" 
          description="There are currently no active company policies." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map(policy => (
            <div 
              key={policy.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:border-primary-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/policies/${policy.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary-50 text-primary-600 rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
                {isEmployee && (
                  policy.isAcknowledged ? (
                    <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Acknowledged
                    </div>
                  ) : (
                    <div className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      <AlertCircle className="w-3 h-3 mr-1" /> Action Required
                    </div>
                  )
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{policy.title}</h3>
              <p className="text-sm text-gray-500 mb-4 flex-grow line-clamp-2">{policy.description}</p>
              
              <div className="flex justify-between items-center text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100">
                <span>Version {policy.version}</span>
                <span>Updated: {new Date(policy.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
