import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  ListTodo,
  BarChart3,
  Bug,
  Shield,
  Folder,
  ChevronDown,
  ChevronRight,
  Settings,
  HelpCircle,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

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
  Settings,
  MessageSquare
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { projects, activeProject, setActiveProject, refreshWorkspaceData } = useWorkspace();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  
  // Collapsed states for navigation categories
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    workspace: false,
    projects: false,
    planning: false,
    reports: false,
    administration: true,
    settings: true,
  });

  // Get user details from localStorage with robust state tracking
  const [user, setUser] = useState<any>(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : { name: 'Guest', email: '', role: { name: 'Guest', slug: '' }, permissions: [], modules: [] };
  });
  
  const selectedOrgUuid = localStorage.getItem('selected_org_uuid') || user.organizations?.[0]?.uuid || '';
  
  const isAdmin = 
    user.role_id === 1 || 
    user.role_id === '1' ||
    user.role?.id === 1 || 
    user.role?.id === '1' || 
    user.role?.slug === 'admin' || 
    user.role === 'admin' || 
    user.role === 'Admin' || 
    user.role === 'ADMIN' ||
    (typeof user.role === 'object' && user.role?.name?.toLowerCase() === 'admin');

  const fetchOrganizations = () => {
    if (isAdmin) {
      setLoadingOrgs(true);
      api.get('/organizations')
        .then(response => {
          setOrganizations(response.data.data || []);
        })
        .catch(err => {
          console.error('Failed to load organizations in sidebar', err);
        })
        .finally(() => {
          setLoadingOrgs(false);
        });
    } else {
      if (user.organizations && user.organizations.length > 0) {
        setOrganizations(user.organizations);
      }
      setLoadingOrgs(false);
    }
  };

  // Load organizations for workspace switcher and revalidate user details from /me
  useEffect(() => {
    fetchOrganizations();

    // Revalidate user details from /me to fetch fresh permissions & modules hierarchy
    api.get('/me')
      .then(response => {
        const latestUser = response.data.data;
        localStorage.setItem('user', JSON.stringify(latestUser));
        setUser(latestUser);
      })
      .catch(err => {
        console.error('Failed to revalidate user details in sidebar:', err);
      });

    // Listen for workspace updates (org/project create/delete)
    const handleWorkspaceUpdate = () => {
      fetchOrganizations();
      refreshWorkspaceData(true);
    };
    window.addEventListener('workspace-updated', handleWorkspaceUpdate);
    return () => window.removeEventListener('workspace-updated', handleWorkspaceUpdate);
  }, []);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uuid = e.target.value;
    localStorage.setItem('selected_org_uuid', uuid);
    // Reload page to re-initialize layout with new workspace context
    window.location.reload();
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const modules: any[] = user.modules || [];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white flex flex-col shrink-0 z-40 hidden lg:flex border-r border-slate-200 shadow-sm">
      
      {/* Top Section: Workspace & Project switcher dropdowns (Jira style) */}
      <div className="p-4 border-b border-slate-100 space-y-3.5 bg-slate-50/40">
        
        {/* Workspace Tier */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Workspace</label>
          <div className="relative group">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
            <select
              value={selectedOrgUuid}
              onChange={handleOrgChange}
              disabled={loadingOrgs}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none shadow-sm transition-all"
            >
              {organizations.map((org: any) => (
                <option key={org.uuid} value={org.uuid}>
                  {org.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-[-35%]" />
          </div>
        </div>

        {/* Project Tier */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Project</label>
          <div className="relative group">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
            <select
              value={activeProject?.uuid || ''}
              onChange={(e) => {
                const found = projects.find(p => p.uuid === e.target.value);
                if (found) {
                  setActiveProject(found);
                }
              }}
              disabled={projects.length === 0}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none shadow-sm transition-all disabled:opacity-50"
            >
              {projects.length === 0 ? (
                <option value="">No Projects</option>
              ) : (
                projects.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-[-35%]" />
          </div>
        </div>
      </div>

      {/* Navigation Groups List (Fully Dynamic & Database-driven) */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-2 scrollbar-none">
        {modules.map((group) => {
          const GroupIcon = iconMap[group.icon] || Folder;
          const isCollapsed = collapsedGroups[group.slug];
          const subModules = group.sub_modules || [];

          if (subModules.length === 0) return null;

          return (
            <div key={group.uuid} className="space-y-0.5">
              {/* Category Header */}
              <button
                onClick={() => toggleGroup(group.slug)}
                className="w-full flex items-center justify-between px-5 py-1.5 text-left group transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-700">
                  <GroupIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{group.name}</span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                )}
              </button>

              {/* Category Items */}
              {!isCollapsed && (
                <div className="pl-5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {subModules.map((item: any) => (
                    <NavLink
                      key={item.uuid}
                      to={item.route}
                      className={({ isActive }) => cn(
                        "flex items-center gap-2.5 px-4 py-2 text-xs font-semibold rounded-l-xl transition-all border-l-2",
                        isActive
                          ? "bg-indigo-50/70 text-indigo-600 border-indigo-600 font-bold"
                          : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50/50"
                      )}
                    >
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section: System Help Center & Doc links */}
      <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/30">
        <a href="#" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>Help Center</span>
        </a>
        <a href="#" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span>Documentation</span>
        </a>
        <a href="#" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span>Send Feedback</span>
        </a>
      </div>

    </aside>
  );
};
