import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function NotFound() {
  const { user } = useAuth();
  const home = user?.role === 'admin' ? '/admin' : user?.role === 'employee' ? '/employee' : '/login';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <Compass className="h-12 w-12" />
        </div>
        <p className="font-mono text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Page not found</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to={home}>
            <Button><Home className="h-4 w-4" /> Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}