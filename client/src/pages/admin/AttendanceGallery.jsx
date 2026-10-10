import { useState } from 'react';
import { Camera } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { resolveAsset, toDateKey, formatTime } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';

export default function AttendanceGallery() {
  const [date, setDate] = useState(toDateKey(new Date()));
  const [view, setView] = useState(null);

  const { data, loading } = useApi(async () => {
    const sp = new URLSearchParams({ date, pageSize: '100' });
    const { data } = await api.get(`/attendance?${sp.toString()}`);
    return data.data;
  }, [date]);

  const photos = (data || []).flatMap((r) => {
    const items = [];
    if (r.checkInPhoto) items.push({ src: resolveAsset(r.checkInPhoto), label: `${r.employee.firstName} ${r.employee.lastName} · Check-in · ${formatTime(r.checkInTime)}`, status: r.status });
    if (r.checkOutPhoto) items.push({ src: resolveAsset(r.checkOutPhoto), label: `${r.employee.firstName} ${r.employee.lastName} · Check-out · ${formatTime(r.checkOutTime)}`, status: r.status });
    return items;
  });

  return (
    <div>
      <PageHeader title="Attendance Photo Gallery" description="Every face-verified check-in and check-out is stored here for audit.">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" max={toDateKey(new Date())} />
      </PageHeader>

      {loading && !data ? (
        <SkeletonGrid count={8} />
      ) : photos.length === 0 ? (
        <Card><EmptyState icon={Camera} title="No photos for this date" message="Pick a date where employees checked in with their face." /></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setView(p)} className="group text-left">
              <div className="overflow-hidden rounded-xl ring-1 ring-black/5 transition group-hover:shadow-lift">
                <img src={p.src} alt={p.label} className="aspect-[3/4] w-full object-cover" loading="lazy" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{p.label}</p>
                <Badge>{p.status}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.label} size="md">
        {view && <img src={view.src} alt={view.label} className="w-full rounded-xl object-contain" />}
      </Modal>
    </div>
  );
}