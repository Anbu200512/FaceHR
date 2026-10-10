import { Outlet } from 'react-router-dom';
import { ScanFace, ShieldCheck, Camera, BarChart3, Users } from 'lucide-react';
import Logo from '../components/Logo';

const FEATURES = [
  { icon: ScanFace, title: 'Face Attendance', desc: 'Check in and out in seconds with privacy-friendly face recognition.' },
  { icon: Users, title: 'Complete HR Suite', desc: 'Employees, departments, leaves and reports from one workspace.' },
  { icon: ShieldCheck, title: 'Secure by Design', desc: 'JWT-protected APIs, hashed passwords and biometric privacy controls.' },
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-white dark:bg-slate-900 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative">
          <Logo size="lg" className="[&_span]:!text-white" />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight">
            Smart HR Management with <span className="text-brand-200">Face-Based Attendance</span>
          </h1>
          <p className="mt-4 text-brand-100">
            FaceHR brings your people operations and secure facial attendance together in one modern,
            beautiful platform — for HR teams and every employee.
          </p>
          <div className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-sm text-brand-100">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-brand-200">
          <Camera className="h-4 w-4" />
          Face data is used only for attendance verification. Retrieved only with the camera API, never stored as video.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-surface-light px-4 py-10 dark:bg-surface-dark sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>
          <Outlet />
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} FaceHR · Privacy-respecting attendance for modern teams
        </p>
      </div>
    </div>
  );
}