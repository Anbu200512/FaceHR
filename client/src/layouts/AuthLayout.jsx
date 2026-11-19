import { Outlet } from 'react-router-dom';
import { ScanFace, ShieldCheck, Camera, Users } from 'lucide-react';
import Logo from '../components/Logo';

const FEATURES = [
  { icon: ScanFace, title: 'Face Attendance', desc: 'Secure check-in and check-out with face verification.' },
  { icon: Users, title: 'HR Suite', desc: 'Manage employees, leaves, and records in one place.' },
  { icon: ShieldCheck, title: 'Secure Access', desc: 'Protected accounts and privacy-focused attendance.' },
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(96,139,250,0.35),transparent_40%)]" />
        <div className="relative">
          <Logo size="lg" className="[&_span]:!text-white" />
        </div>
        <div className="relative max-w-lg">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-100">FaceHR Platform</p>
          <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">Smart HR and attendance, simplified.</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-brand-100/90">
            Sign in to manage attendance, employees, and daily HR operations securely.
          </p>
          <div className="mt-8 grid gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-brand-100/90">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-brand-100/80">
          <Camera className="h-4 w-4" />
          Face data is used only for attendance verification.
        </div>
      </div>

      <div className="flex min-h-dvh flex-col justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Logo size="md" />
          </div>
          <Outlet />
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-300">
            © {new Date().getFullYear()} FaceHR
          </p>
        </div>
      </div>
    </div>
  );
}