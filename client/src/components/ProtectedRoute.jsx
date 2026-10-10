import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullScreenLoader } from './ui/Button';

/**
 * Route guard: requires a signed-in user.
 * - adminOnly: only admin role may pass (otherwise redirected to their home).
 * - employeeOnly: only employee role may pass.
 */
export default function ProtectedRoute({ children, adminOnly, employeeOnly }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FullScreenLoader label="Checking your session..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (adminOnly && user.role !== 'admin') return <Navigate to="/employee" replace />;
  if (employeeOnly && user.role !== 'employee') return <Navigate to="/admin" replace />;

  return children;
}