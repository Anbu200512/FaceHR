import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, AtSign, IdCard, Eye, EyeOff, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import clsx from 'clsx';

const TABS = [
  { key: 'admin', label: 'Admin / HR', hint: 'Manage organization' },
  { key: 'employee', label: 'Employee', hint: 'View & mark attendance' },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState('employee');
  const [showPassword, setShowPassword] = useState(false);
  const remembered = role === 'employee' ? localStorage.getItem('facehr_remember') || '' : '';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { identifier: remembered, password: '', remember: !!remembered },
  });

  const submit = async ({ identifier, password, remember }) => {
    try {
      const data = await login(identifier, password, role);
      if (remember) localStorage.setItem('facehr_remember', identifier);
      else localStorage.removeItem('facehr_remember');
      toast.success(data.message || 'Welcome back!');
      navigate(data.user?.role === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      toast.error(err?.userMessage || 'Invalid login. Please check your credentials.');
    }
  };

  const isEmployee = role === 'employee';

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50/80 to-white px-5 py-5 dark:border-slate-800 dark:from-brand-500/10 dark:to-slate-900 sm:px-7 sm:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <LogIn className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">Welcome back</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">Sign in to your FaceHR account</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Sign in as</p>
          <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2" role="tablist" aria-label="Sign in as">
            {TABS.map((t) => {
              const active = role === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRole(t.key)}
                  className={clsx(
                    'min-h-[48px] rounded-xl border px-3 py-2.5 text-left transition',
                    active
                      ? 'border-brand-300 bg-brand-50 shadow-sm ring-1 ring-brand-500/20 dark:border-brand-500/40 dark:bg-brand-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30 dark:hover:bg-slate-800'
                  )}
                >
                  <p className={clsx('text-sm font-semibold', active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200')}>{t.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">{t.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="label">{isEmployee ? 'Email or Employee ID' : 'Email address'}</label>
            <div className={clsx(
              'flex items-center gap-2.5 rounded-xl border bg-slate-50/50 px-3.5 py-3 transition focus-within:bg-white focus-within:ring-4 dark:bg-slate-800/40 dark:focus-within:bg-slate-900',
              errors.identifier ? 'border-rose-400 focus-within:ring-rose-500/10' : 'border-slate-200 focus-within:border-brand-500 focus-within:ring-brand-500/10 dark:border-slate-700'
            )}>
              <span className="shrink-0 text-slate-400 dark:text-slate-300">{isEmployee ? <IdCard className="h-4 w-4" /> : <AtSign className="h-4 w-4" />}</span>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                defaultValue={remembered}
                placeholder={isEmployee ? 'EMP001 or you@company.com' : 'admin@company.com'}
                className="min-w-0 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                {...register('identifier', { required: isEmployee ? 'Email or Employee ID is required' : 'Email address is required' })}
              />
            </div>
            {errors.identifier && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.identifier.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className={clsx(
              'flex items-center gap-2.5 rounded-xl border bg-slate-50/50 px-3.5 py-3 transition focus-within:bg-white focus-within:ring-4 dark:bg-slate-800/40 dark:focus-within:bg-slate-900',
              errors.password ? 'border-rose-400 focus-within:ring-rose-500/10' : 'border-slate-200 focus-within:border-brand-500 focus-within:ring-brand-500/10 dark:border-slate-700'
            )}>
              <span className="shrink-0 text-slate-400 dark:text-slate-300"><Lock className="h-4 w-4" /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="min-w-0 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                {...register('password', { required: 'Password is required' })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="-m-1 shrink-0 rounded-lg p-2 text-slate-400 dark:text-slate-300 hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" defaultChecked={!!remembered} {...register('remember')} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Forgot password?</Link>
          </div>

          <Button type="submit" loading={isSubmitting} className="mt-1 w-full py-3 text-[15px] shadow-sm shadow-brand-600/20">
            {isSubmitting ? 'Signing in...' : (<><span>Sign in</span><ArrowRight className="h-4 w-4" /></>)}
          </Button>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500 dark:text-slate-300 dark:bg-slate-800/50">
            {isEmployee ? 'Use your Employee ID or registered email to continue.' : 'Use your administrator email to continue.'}
          </p>
        </form>
      </div>
    </div>
  );
}