import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roleRequired }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (roleRequired && user.role !== roleRequired) {
    return <Navigate to={user.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard'} replace />;
  }

  return <Outlet />;
}
