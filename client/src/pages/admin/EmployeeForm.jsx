import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ChevronRight, UserPlus } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { toInputDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import Button, { FullScreenLoader } from '../../components/ui/Button';
import { BLANK } from '../../components/employeeForm/constants';
import { validateStep, buildEmployeeFormData } from '../../components/employeeForm/meta';
import BasicInfoEditor from '../../components/employeeForm/BasicInfoEditor';

const today = () => new Date().toISOString().slice(0, 10);

function cloneBlank() {
  return {
    ...BLANK,
    contact: { ...BLANK.contact, address: { ...BLANK.contact.address } },
    bankDetails: { ...BLANK.bankDetails },
    personal: { ...BLANK.personal },
    emergencyContact: { ...BLANK.emergencyContact },
    weekOff: { ...BLANK.weekOff, workingDays: [...BLANK.weekOff.workingDays] },
  };
}

export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState(cloneBlank);
  const [errors, setErrors] = useState({});
  const [manualEmployeeId, setManualEmployeeId] = useState(false);
  const [saving, setSaving] = useState(false);

  const depts = useApi(async () => (await api.get('/departments')).data.data);
  const designations = useApi(async () => (await api.get('/designations')).data.data);
  const locations = useApi(async () => (await api.get('/locations')).data.data);

  const existing = useApi(async () => (await api.get(`/employees/${id}`)).data.data, isEdit ? [id] : []);

  useEffect(() => {
    if (existing.data && isEdit) {
      const d = existing.data;
      setValues((pv) => ({
        ...pv,
        employeeId: d.employeeId || '',
        firstName: d.firstName || '',
        middleName: d.middleName || '',
        lastName: d.lastName || '',
        email: d.email || '',
        phone: d.phone || '',
        dateOfBirth: toInputDate(d.dateOfBirth),
        gender: d.gender || 'Male',
        state: d.state || '',
        address: d.address || '',
        department: d.department?._id || '',
        office: d.office?._id || '',
        designation: d.designation?._id || '',
        joiningDate: toInputDate(d.joiningDate) || today(),
        employmentType: d.employmentType || 'Full-time',
        subDepartment: d.subDepartment || '',
        subDepartment1: d.subDepartment1 || '',
        subDepartment2: d.subDepartment2 || '',
        category: d.category || '',
        subCategory: d.subCategory || '',
        grade: d.grade || '',
        reportingManager: d.reportingManager || '',
        reportingManager2: d.reportingManager2 || '',
        probation: d.probation || '',
        probationManage: Boolean(d.probationManage),
        totalExperience: d.totalExperience || '',
        exEmployee: Boolean(d.exEmployee),
        status: d.status || 'Active',
        contact: { ...pv.contact, ...(d.contact || {}), address: { ...pv.contact.address, ...(d.contact?.address || {}) } },
        bankDetails: { ...pv.bankDetails, ...(d.bankDetails || {}) },
        personal: { ...pv.personal, ...(d.personal || {}) },
        emergencyContact: { ...pv.emergencyContact, ...(d.emergencyContact || {}) },
        emergencyContacts: (d.emergencyContacts || []).map((e) => ({ ...e })),
        weekOff: { ...pv.weekOff, ...(d.weekOff || {}), workingDays: d.weekOff?.workingDays || pv.weekOff.workingDays },
      }));
    }
  }, [existing.data, isEdit]);

  const set = (path, value) => {
    setValues((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let o = next;
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
      o[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const suggestId = () => {
    const f = String(values.firstName || '').toUpperCase().slice(0, 2).replace(/[^A-Z]/g, '');
    const l = String(values.lastName || '').toUpperCase().slice(0, 2).replace(/[^A-Z]/g, '');
    const prefix = f || 'EM';
    const suffix = l || String(Math.floor(100 + Math.random() * 900));
    set('employeeId', `${prefix}${suffix}${Math.floor(100 + Math.random() * 900)}`);
  };

  const generateId = () => {
    const f = String(values.firstName || 'EM').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'EM';
    const l = String(values.lastName || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    const n = Math.floor(10000 + Math.random() * 90000);
    return `${f}${l}${n}`;
  };

  const persist = async () => {
    if (saving) return;
    const vals = { ...values };
    if (!isEdit && !manualEmployeeId && !String(vals.employeeId || '').trim()) {
      vals.employeeId = generateId();
      setValues(vals);
    }

    const e = validateStep('basic', vals);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Please fix the highlighted fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      if (!isEdit) {
        const { data } = await api.post('/employees', buildEmployeeFormData(vals));
        const created = data?.data;
        if (created?._id) {
          if (data.emailSent) {
            toast.success(`Employee created — login credentials sent to ${created.email}.`);
          } else {
            toast.success('Employee created.');
            if (data.generatedPassword) {
              toast.info(`Temporary password: ${data.generatedPassword}`, { duration: 12000 });
            }
          }
          navigate(`/admin/employees/${created._id}`, { replace: true });
        } else {
          toast.error('Employee record was not returned by the server.');
        }
      } else {
        await api.put(`/employees/${id}`, buildEmployeeFormData(vals, { sectionsOverride: false }));
        toast.success('Basic employee information updated.');
        navigate(`/admin/employees/${id}`, { replace: true });
      }
    } catch (err) {
      toast.error(extractError(err, 'Could not save the employee'));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && existing.loading) return <FullScreenLoader label="Loading employee…" />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Employee — Basic Information' : 'Add Employee'}
        description={
          isEdit
            ? 'Update the employee’s basic employment and login information.'
            : 'Start with the employee master basics, then save & continue to complete the full profile section by section.'
        }
      >
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <BasicInfoEditor
        values={values}
        errors={errors}
        set={set}
        isEdit={isEdit}
        depts={depts.data}
        designations={designations.data}
        locations={locations.data}
        suggestId={suggestId}
        manualEmployeeId={manualEmployeeId}
        setManualEmployeeId={setManualEmployeeId}
      />

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={persist} loading={saving}>
          {isEdit ? (
            <>
              <Save className="h-4 w-4" /> Save Basic Information
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Save &amp; Continue <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}