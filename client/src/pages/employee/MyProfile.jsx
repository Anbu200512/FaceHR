import { useState } from 'react';
import { Mail, Phone, CalendarDays, Briefcase, Lock, ScanFace } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { resolveAsset, formatDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button, { FullScreenLoader } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/Avatar';
import Modal from '../../components/ui/Modal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import {
  ContactSectionView,
  BankDetailsSectionView,
  PersonalSectionView,
  FamilySectionView,
  EmergencyContactSectionView,
  ExperienceSectionView,
  WeekOffSectionView,
  QualificationSectionView,
  DocumentsSectionView,
} from '../../components/employeeProfile/SectionViews';
import { EMPLOYEE_PROFILE_TABS } from '../../components/employeeForm/constants';
import clsx from 'clsx';

// Mirror of the Admin Portal's employee profile tabs, with the admin-only
// Certification section removed.
const SELF_TABS = EMPLOYEE_PROFILE_TABS.filter((t) => t.id !== 'certification');

const SECTION_VIEWS = {
  contact: ContactSectionView,
  bank: BankDetailsSectionView,
  personal: PersonalSectionView,
  family: FamilySectionView,
  emergency: EmergencyContactSectionView,
  experience: ExperienceSectionView,
  weekOff: WeekOffSectionView,
  qualification: QualificationSectionView,
  documents: DocumentsSectionView,
};

export default function MyProfile() {
  const { user, updateUser } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [tab, setTab] = useState('contact');
  const [preview, setPreview] = useState(null);

  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get(`/employees/${user.employee}`);
    return data.data;
  }, [user.employee]);

  const emp = data || user?.employeeData || {};

  const onPreviewDocument = (d) => {
    const src = resolveAsset(d.path);
    if (/^image\//.test(d.mimeType || '') || /\.(png|jpe?g|webp|gif)$/i.test(d.originalName || '')) {
      setPreview({ src, label: d.originalName });
    } else {
      window.open(src, '_blank', 'noopener');
    }
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    updateUser(data.user);
    refetch();
  };

  if (loading && !data) return <FullScreenLoader label="Loading my profile…" />;

  const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ') || user?.name;
  const mobile = emp.contact?.mobileNumber || emp.phone || '—';
  const SectionView = SECTION_VIEWS[tab];

  return (
    <div>
      <PageHeader title="My Profile" description="Your personal and employment details.">
        <Button variant="secondary" onClick={() => setPwOpen(true)}><Lock className="h-4 w-4" /> Change Password</Button>
      </PageHeader>

      {/* Header summary */}
      <Card className="mb-6">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Avatar name={fullName} src={resolveAsset(emp.profilePhoto)} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{fullName}</h2>
              <Badge>{emp.status}</Badge>
              <Badge>{emp.employmentType}</Badge>
            </div>
            <p className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{emp.employeeId}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {emp.designation?.name || 'No designation'} · {emp.department?.name || 'No department'}{emp.office?.name ? ` · ${emp.office.name}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="h-4 w-4 text-slate-400" /> {emp.email || '—'}
              </span>
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="h-4 w-4 text-slate-400" /> {mobile}
              </span>
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <CalendarDays className="h-4 w-4 text-slate-400" /> Joining {formatDate(emp.joiningDate)}
              </span>
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Briefcase className="h-4 w-4 text-slate-400" /> {emp.employmentType}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Face recognition status (read-only) */}
      <Card className="mb-6">
        <div className="flex items-center gap-3 p-5">
          <ScanFace className={`h-8 w-8 ${emp.face ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {emp.face ? 'Face Registered' : 'Face Not Registered'}
            </p>
            <p className="text-xs text-slate-400">
              {emp.face
                ? `Linked to faceId ${emp.face.faceId?.slice(0, 8)}… · ${formatDate(emp.face.updatedAt)}`
                : 'Ask your HR admin to register your face to use face attendance.'}
            </p>
          </div>
          {emp.face && <Badge className="ml-auto">Verified</Badge>}
        </div>
      </Card>

      {/* Section navigation */}
      <div className="sticky top-16 z-10 mb-6 -mx-4 bg-surface-light px-4 py-2 dark:bg-surface-dark sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {SELF_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition',
                  tab === t.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section content */}
      {SectionView && <SectionView key={tab} emp={emp} onPreview={onPreviewDocument} />}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.label} size="md">
        {preview && (
          <div className="overflow-hidden rounded-xl">
            <img src={preview.src} alt={preview.label} className="h-auto max-h-[70vh] w-full object-contain" />
            <p className="mt-3 text-center text-sm font-medium text-slate-500">{preview.label}</p>
          </div>
        )}
      </Modal>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} onChanged={refreshUser} />
    </div>
  );
}