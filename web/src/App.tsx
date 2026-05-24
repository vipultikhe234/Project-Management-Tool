import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { KanbanBoard } from './pages/KanbanBoard';
import { Backlog } from './pages/Backlog';

import { UserManagement } from './pages/UserManagement';
import { Organizations } from './pages/Organizations';
import { Projects } from './pages/Projects';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';
import { AccessControl } from './pages/AccessControl';
import { ModuleManagement } from './pages/ModuleManagement';
import { ProjectSettings } from './pages/ProjectSettings';
import { ShieldAlert } from 'lucide-react';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Route Access Guard using permissions array from login response
const RouteAccessGuard = ({ routePath, children }: { routePath: string; children: React.ReactNode }) => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = 
    user.role_id === 1 || 
    user.role?.id === 1 || 
    user.role?.slug === 'admin' || 
    user.role === 'admin' || 
    user.role === 'Admin' || 
    user.role === 'ADMIN' ||
    (typeof user.role === 'object' && user.role?.name?.toLowerCase() === 'admin');
  const permissions: string[] = user.permissions || [];

  // Super admin has full access bypass; other roles must match routePath in their allowed permissions list
  const hasAccess = isAdmin || permissions.includes(routePath);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-slate-50 text-slate-900 p-6 text-center">
        <div className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-full mb-4 animate-bounce">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Your active security role does not have authorization to view this module. Please contact your administrator.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/:slug" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/your-work" replace />} />
          <Route path="your-work" element={<RouteAccessGuard routePath="/your-work"><Dashboard /></RouteAccessGuard>} />
          <Route path="board" element={<RouteAccessGuard routePath="/board"><KanbanBoard /></RouteAccessGuard>} />
          <Route path="backlog" element={<RouteAccessGuard routePath="/backlog"><Backlog /></RouteAccessGuard>} />


          <Route path="users" element={<RouteAccessGuard routePath="/users"><UserManagement /></RouteAccessGuard>} />
          <Route path="organizations" element={<RouteAccessGuard routePath="/organizations"><Organizations /></RouteAccessGuard>} />
          <Route path="projects" element={<RouteAccessGuard routePath="/projects"><Projects /></RouteAccessGuard>} />
          <Route path="access-control" element={<RouteAccessGuard routePath="/access-control"><AccessControl /></RouteAccessGuard>} />
          <Route path="modules-management" element={<RouteAccessGuard routePath="/modules-management"><ModuleManagement /></RouteAccessGuard>} />
          <Route path="project-settings" element={<RouteAccessGuard routePath="/project-settings"><ProjectSettings /></RouteAccessGuard>} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
