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
  User as UserIcon,
  Sparkles,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface SubModule {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  route: string;
  sort_order: number;
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
  Settings,
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Get user details from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Guest', email: '', role: { name: 'Guest', slug: '' }, permissions: [], modules: [] };

  useEffect(() => {
    // 1. Try to load modules synchronously from localStorage
    let cachedModules: Module[] = [];
    if (user && user.modules && Array.isArray(user.modules)) {
      cachedModules = user.modules;
    }

    if (cachedModules.length > 0) {
      setModules(cachedModules);
      setLoading(false);

      // Auto-expand any accordion that contains the active route
      const initialAccordions: Record<string, boolean> = {};
      cachedModules.forEach(mod => {
        const containsActive = mod.sub_modules?.some(sub => sub.route === location.pathname);
        if (containsActive) {
          initialAccordions[mod.uuid] = true;
        }
      });
      setOpenAccordions(initialAccordions);
    }

    // 2. Background revalidation from /me
    revalidateModules(cachedModules);
  }, []);

  const revalidateModules = async (cached: Module[]) => {
    try {
      const response = await api.get('/me');
      const latestUser = response.data.data;
      
      // Update local storage
      localStorage.setItem('user', JSON.stringify(latestUser));

      const latestModules: Module[] = latestUser.modules || [];

      // Check if modules have changed to avoid unnecessary re-renders
      if (JSON.stringify(cached) !== JSON.stringify(latestModules) || cached.length === 0) {
        setModules(latestModules);
        
        // Auto-expand accordions
        const initialAccordions: Record<string, boolean> = {};
        latestModules.forEach(mod => {
          const containsActive = mod.sub_modules?.some(sub => sub.route === location.pathname);
          if (containsActive) {
            initialAccordions[mod.uuid] = true;
          }
        });
        setOpenAccordions(prev => ({ ...prev, ...initialAccordions }));
      }
    } catch (err) {
      console.error('Failed to revalidate sidebar modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (uuid: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [uuid]: !prev[uuid]
    }));
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white flex flex-col shrink-0 z-40 hidden lg:flex border-r border-slate-200 shadow-sm">
      <nav className="flex-1 overflow-y-auto py-4 space-y-1.5 scrollbar-none">
        {loading ? (
          <div className="flex items-center gap-2.5 px-6 py-3 text-slate-400 text-xs">
            <div className="w-3.5 h-3.5 border border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            Loading navigation...
          </div>
        ) : modules.length === 0 ? (
          <div className="px-6 py-4 text-xs text-slate-400 italic">
            No accessible sections.
          </div>
        ) : (
          modules.filter(mod => mod.slug !== 'issues').map((mod) => {
            const IconComp = iconMap[mod.icon] || Folder;
            const hasMultiple = mod.sub_modules.length > 1;
            const isExpanded = openAccordions[mod.uuid];

            // Case A: Parent Module has exactly one sub-module, render as a direct single link
            if (!hasMultiple) {
              const singleSub = mod.sub_modules[0];
              return (
                <NavLink
                  key={singleSub.uuid}
                  to={singleSub.route}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-6 py-3 transition-all duration-200 text-sm font-medium border-l-4",
                    isActive
                      ? "bg-indigo-50 text-indigo-600 border-indigo-600 font-bold"
                      : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
                  )}
                >
                  <IconComp className="w-5 h-5 shrink-0" />
                  <span className="font-sans truncate">{mod.name}</span>
                </NavLink>
              );
            }

            // Case B: Parent Module has multiple sub-modules, render as an accordion category
            const containsActive = mod.sub_modules.some(sub => sub.route === location.pathname);

            return (
              <div key={mod.uuid} className="space-y-1">
                <button
                  onClick={() => toggleAccordion(mod.uuid)}
                  className={cn(
                    "w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors border-l-4 border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900",
                    containsActive && "text-slate-950 font-bold"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={cn("w-5 h-5 shrink-0", containsActive ? "text-indigo-600" : "text-slate-400")} />
                    <span className="font-sans truncate">{mod.name}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Submodule dropdown panel */}
                {isExpanded && (
                  <div className="pl-14 pr-4 py-1 space-y-1.5 bg-slate-50/50 border-l-4 border-transparent">
                    {mod.sub_modules.map((sub) => (
                      <NavLink
                        key={sub.uuid}
                        to={sub.route}
                        className={({ isActive }) => cn(
                          "block py-1.5 px-3 rounded-lg text-xs transition-all duration-150",
                          isActive
                            ? "bg-indigo-50/50 text-indigo-600 font-bold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                        )}
                      >
                        {sub.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
};
