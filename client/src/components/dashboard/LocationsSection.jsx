import { MapPin } from 'lucide-react';
import DonutChartSection from './DonutChartSection';

export default function LocationsSection({ rows, loading, selectedId }) {
  const visible = selectedId ? (rows || []).filter((r) => String(r.id) === String(selectedId)) : rows;
  return (
    <DonutChartSection
      title="Office location overview"
      description="Employees grouped by office location"
      icon={MapPin}
      rows={visible}
      loading={loading}
      emptyTitle="No location data"
      emptyMessage="No employee data available for the selected filters."
    />
  );
}