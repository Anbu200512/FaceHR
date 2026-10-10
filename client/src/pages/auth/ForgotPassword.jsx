import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { Input } from '../../components/ui/Form';
import Button from '../../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(extractError(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="card animate-slide-up">
        <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20">
            <MailCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Request received</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              If an account exists for this email, an HR admin has been notified to reset your password.
              Admins can reset it from the Employees page.
            </p>
          </div>
          <Link to="/login" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up">
      <div className="border-b px-6 pb-5 pt-6 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your account email and our HR team will help you reset your password.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        <Input
          label="Account email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Sending request…' : 'Send Reset Request'}
        </Button>
        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </form>
    </div>
  );
}