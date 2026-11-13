import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, AtSign, IdCard, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import clsx from 'clsx';

const TABS = [
  { key: 'admin', label: 'Admin / HR', identifierLabel: 'Admin email' },
  { key: 'employee', label: 'Employee', identifierLabel: 'Employee ID or email' },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState('employee');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const submit = async ({ identifier, password, remember }) => {
    try {
      const data = await login(identifier, password, role);
      if (remember) {
        localStorage.setItem('facehr_remember', identifier);
      } else {
        localStorage.removeItem('facehr_remember');
      }
      toast.success(data.message || 'Welcome back!');
      const dest = data.user?.role === 'admin' ? '/admin' : '/employee';
      navigate(dest);
    } catch (err) {
      toast.error(err?.userMessage || 'Invalid login. Please check your credentials.');
    }
  };

  return (
    <div className="card animate-slide-up overflow-hidden">
      <div className="border-b bg-gradient-to-b from-slate-50/80 to-white px-6 pb-5 pt-6 dark:border-slate-700 dark:from-slate-800/40 dark:to-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to your FaceHR account</p>
      </div>

      <div className="px-6 pt-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80" role="tablist" aria-label="Sign in as">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={role === t.key}
              onClick={() => setRole(t.key)}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                role === t.key
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-700 dark:text-white dark:ring-slate-600'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-4 px-6 py-5 pb-6">
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-[41px] z-10 text-slate-400">
            {role === 'employee' ? <IdCard className="h-4 w-4" /> : <AtSign className="h-4 w-4" />}
          </div>
          <Input
            label={role === 'employee' ? 'Email or Employee ID' : 'Email address'}
            placeholder={role === 'employee' ? 'employee@company.com or EMP001' : 'admin@facehr.com'}
            name="identifier"
            type="text"
            autoComplete="username"
            defaultValue={role === 'employee' ? localStorage.getItem('facehr_remember') || '' : ''}
            className="[&_input]:pl-9"
            register={register}
            error={errors.identifier?.message}
          />
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-[41px] z-10 text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            label="Password"
            placeholder="Enter your password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="[&_input]:pl-9 [&_input]:pr-10"
            register={register}
            error={errors.password?.message}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-[38px] rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              defaultChecked={!!localStorage.getItem('facehr_remember')}
              {...register('remember')}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full py-3">
          {isSubmitting ? 'Signing you in...' : 'Sign In'}
        </Button>
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          Signing in as <span className="font-semibold text-slate-700 dark:text-slate-200">{role === 'admin' ? 'Admin / HR' : 'Employee'}</span>. Employees can use their Employee ID or email.
        </p>
      </form>
    </div>
  );
}