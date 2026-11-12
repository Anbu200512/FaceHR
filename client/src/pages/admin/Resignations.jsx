import { useState } from 'react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import PageHeader from '../../components/PageHeader';
import ResignationsSection from '../../components/dashboard/ResignationsSection';

export default function Resignations() {
  const [status, setStatus] = useState('');
  const { data, loading, refetch } = useApi(() => {
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (status) params.set('status', status);
    return api.get(`/resignations?${params.toString()}`).then((response) => response.data);
  }, [status]);

  return (
    <div>
      <PageHeader title="Resignation Requests" description="Review resignation requests submitted by employees." />
      <div className="mb-4 flex justify-end">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input w-full sm:w-52" aria-label="Filter resignation requests by status">
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      <ResignationsSection
        rows={data?.data || []}
        loading={loading}
        refetch={refetch}
        title="Submitted by employees"
        description="View and respond to employee resignation requests."
      />
    </div>
  );
}
