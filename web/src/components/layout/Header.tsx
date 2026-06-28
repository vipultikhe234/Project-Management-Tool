import React, { useState, useEffect } from 'react';
import { Search, Bell, Settings, HelpCircle, ChevronDown, LogOut, User as UserIcon, Building2, Plus } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { GlobalCreateTicketModal } from './GlobalCreateTicketModal';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);

  // Resolve active module/page name for central header tracking
  const getModuleName = () => {
    const path = location.pathname;
    if (path.includes('/reports')) return 'Reports';
    if (path.includes('/board')) return 'Active Board';
    if (path.includes('/backlog')) return 'Backlog';
    if (path.includes('/your-work') || path === '/') return 'Your Work';
    if (path.includes('/profile')) return 'Profile';
    if (path.includes('/projects')) return 'Projects';
    if (path.includes('/users')) return 'User Management';
    if (path.includes('/access-control')) return 'Access Control';
    if (path.includes('/modules')) return 'Module Management';
    if (path.includes('/organizations')) return 'Organizations';
    if (path.includes('/project-settings')) return 'Project Settings';
    return '';
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Get user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Guest', email: '' };

  const [selectedOrgUuid, setSelectedOrgUuid] = useState<string>(() => {
    const stored = localStorage.getItem('selected_org_uuid');
    if (stored && stored !== 'all') return stored;
    return user.organizations?.[0]?.uuid || '';
  });

  const isAdmin = user.role?.slug === 'admin' || user.role?.id === 1;
  const isOrgAdmin = user.role?.slug === 'org_admin' || user.role?.id === 2;
  const isUser = user.role?.slug === 'org_user' || user.role?.id === 3;

  useEffect(() => {
    if (isAdmin) {
      api.get('/organizations')
        .then(response => {
          const orgs = response.data.data;
          setOrganizations(orgs);
          
          // If selectedOrgUuid is not set, or is 'all', or is not in the list of fetched organizations, set it to the first organization
          const currentStored = localStorage.getItem('selected_org_uuid');
          const isValidOrg = orgs.some((org: any) => org.uuid === currentStored);
          if (!currentStored || currentStored === 'all' || !isValidOrg) {
            const defaultOrgUuid = orgs[0]?.uuid || '';
            setSelectedOrgUuid(defaultOrgUuid);
            localStorage.setItem('selected_org_uuid', defaultOrgUuid);
            window.location.reload();
          }
        })
        .catch(err => {
          console.error('Failed to load organizations', err);
        });
    } else {
      // For org_admin and org_user, fix to their user.organizations
      if (user.organizations && user.organizations.length > 0) {
        setOrganizations(user.organizations);
        const userOrgUuid = user.organizations[0].uuid;
        setSelectedOrgUuid(userOrgUuid);
        localStorage.setItem('selected_org_uuid', userOrgUuid);
      }
    }
  }, [isAdmin]);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uuid = e.target.value;
    setSelectedOrgUuid(uuid);
    localStorage.setItem('selected_org_uuid', uuid);
    // Reload the page to propagate the selected organization change to all active components
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('selected_org_uuid');
    navigate('/login');
  };

  return (
    <header className="fixed top-0 w-full h-16 z-50 bg-white border-b border-slate-200 flex justify-between items-center px-8 shrink-0">
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold tracking-tight text-slate-800 font-display">SprintNIX</span>


        {/* Global Create Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create
        </button>

        {/* Dynamic active page heading next to search box */}
        {getModuleName() && (
          <span className="hidden lg:inline-flex text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 uppercase tracking-widest shrink-0 shadow-sm animate-in fade-in zoom-in-95 duration-300 select-none">
            {getModuleName()}
          </span>
        )}

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tasks, docs..."
            className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-primary transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-50 transition-colors group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{user.role?.name || 'User'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm overflow-hidden">
              <UserIcon className="w-5 h-5" />
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowUserMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account</p>
                  <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
                </div>
                
                <Link 
                  to="/profile" 
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                  <HelpCircle className="w-5 h-4" />
                  Support
                </button>
                
                <div className="h-px bg-slate-100 my-1"></div>
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <GlobalCreateTicketModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </header>
  );
};
