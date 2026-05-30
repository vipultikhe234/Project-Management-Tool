import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  Shield, 
  Key, 
  Lock, 
  Unlock, 
  X, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  ShieldAlert,
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  ListTodo,
  BarChart3,
  Bug,
  FolderOpen,
  Folder
} from 'lucide-react';

interface Role {
  id: number;
  name: string;
  slug: string;
}

interface SubModule {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  route: string;
  sort_order: number;
  is_allowed: boolean;
}

interface Module {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  sub_modules: SubModule[];
}

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  ListTodo,
  BarChart3,
  Bug,
  Shield,
  Folder,
};

export const AccessControl: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Module[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await api.get('/roles');
      setRoles(response.data.data);
    } catch (err: any) {
      showToast('Failed to fetch user roles', 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenPermissions = async (role: Role) => {
    setSelectedRole(role);
    setModalOpen(true);
    setLoadingPermissions(true);
    try {
      const response = await api.get(`/permissions/role/${role.id}`);
      setPermissionsMatrix(response.data.data);
    } catch (err: any) {
      showToast('Failed to load permissions configuration', 'error');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleTogglePermission = async (subModuleUuid: string, currentAllowed: boolean) => {
    if (!selectedRole) return;
    
    const newAllowed = !currentAllowed;

    // Optimistically update the UI state
    setPermissionsMatrix(prev => 
      prev.map(mod => ({
        ...mod,
        sub_modules: mod.sub_modules.map(sub => 
          sub.uuid === subModuleUuid ? { ...sub, is_allowed: newAllowed } : sub
        )
      }))
    );

    try {
      await api.post('/permissions/toggle', {
        role_id: selectedRole.id,
        sub_module_uuid: subModuleUuid,
        is_allowed: newAllowed
      });
      showToast(`Permission status updated successfully!`, 'success');
    } catch (err: any) {
      // Revert optimization on error
      setPermissionsMatrix(prev => 
        prev.map(mod => ({
          ...mod,
          sub_modules: mod.sub_modules.map(sub => 
            sub.uuid === subModuleUuid ? { ...sub, is_allowed: currentAllowed } : sub
          )
        }))
      );
      showToast(err.response?.data?.message || 'Failed to update permission status', 'error');
    }
  };

  const getRoleDescription = (slug: string) => {
    switch (slug) {
      case 'admin':
        return 'System-wide Super Admin access. By default, has permissions to access all modules and sub-modules.';
      case 'org_admin':
        return 'Organization level administrator. Configures local team workspaces, projects, settings, and workflows.';
      case 'org_user':
        return 'Standard team member or employee. Interacts with projects, works on sprints, and logs tickets.';
      default:
        return 'Custom user role with customizable granular module access constraints.';
    }
  };

  return (
    <div className="w-full space-y-8 text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
            : 'bg-rose-50 border-rose-100 text-rose-600'
        }`}>
          <div className="flex items-center gap-2 font-medium text-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
            {toast.message}
          </div>
        </div>
      )}



      {/* Roles Grid */}
      {loadingRoles ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          <span className="text-sm font-medium">Loading security roles...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div 
              key={role.id} 
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-sm hover:border-slate-300 transition-all duration-300"
            >
              <div>
                {/* Icon header */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${
                    role.slug === 'admin' 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : role.slug === 'org_admin' 
                        ? 'bg-purple-50 text-purple-600' 
                        : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    ID: {role.id}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                  {role.name}
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed mb-6 font-sans font-medium">
                  {getRoleDescription(role.slug)}
                </p>
              </div>

              {/* Action Button */}
              {role.slug === 'admin' ? (
                <div className="w-full bg-slate-50 text-slate-400 py-2.5 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200">
                  <ShieldCheck className="w-4 h-4" /> Full Dynamic Bypass
                </div>
              ) : (
                <button
                  onClick={() => handleOpenPermissions(role)}
                  className="w-full bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 hover:border-indigo-100 transition-all shadow-sm"
                >
                  <Key className="w-4 h-4" /> Configure Access Rules
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Permissions Modal Slide-Over */}
      {modalOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-sm transition-opacity">
          <div 
            className="w-full max-w-2xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800">
                    Access Rights: {selectedRole.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Grant or deny modules and sub-modules visibility.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingPermissions ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
                  <span className="text-sm font-medium">Loading modules database...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {permissionsMatrix.map((module) => {
                    const IconComponent = iconMap[module.icon] || FolderOpen;
                    return (
                      <div 
                        key={module.uuid} 
                        className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3"
                      >
                        {/* Parent Module Title */}
                        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-200">
                          <IconComponent className="w-4.5 h-4.5 text-indigo-600" />
                          <span className="text-sm font-bold text-slate-800">{module.name}</span>
                          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            /{module.slug}
                          </span>
                        </div>

                        {/* Sub Modules List */}
                        <div className="space-y-2 pt-1">
                          {module.sub_modules.length === 0 ? (
                            <p className="text-xs text-slate-400 italic pl-7">No sub-modules mapped.</p>
                          ) : (
                            module.sub_modules.map((sub) => (
                              <div 
                                key={sub.uuid} 
                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-slate-200 pl-7 transition-colors shadow-sm"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-slate-700">{sub.name}</span>
                                  {sub.route && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Route: {sub.route}
                                    </span>
                                  )}
                                </div>

                                {/* Checkbox Slider / Toggle */}
                                <button
                                  onClick={() => handleTogglePermission(sub.uuid, sub.is_allowed)}
                                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    sub.is_allowed ? 'bg-indigo-600' : 'bg-slate-200'
                                  }`}
                                >
                                  <span 
                                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      sub.is_allowed ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow"
              >
                Done Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
