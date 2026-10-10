import { Building2 } from 'lucide-react';
import DonutChartSection from './DonutChartSection';

export default function DepartmentsSection({ rows, loading, selectedId }) {
  const visible = selectedId ? (rows || []).filter((r) => String(r.id) === String(selectedId)) : rows;
  return (
    <DonutChartSection
      title="Department overview"
      description="Employees grouped by department"
      icon={Building2}
      rows={visible}
      loading={loading}
      emptyTitle="No department data"
      emptyMessage="No employee data available for the selected filters."
    />
  );
}