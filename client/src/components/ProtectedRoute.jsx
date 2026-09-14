import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/store';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
