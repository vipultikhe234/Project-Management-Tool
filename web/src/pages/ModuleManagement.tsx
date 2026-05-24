import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  Plus, 
  Trash2, 
  Folder, 
  Layers, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight,
  ShieldAlert,
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  ListTodo,
  BarChart3,
  Bug,
  Shield,
  Trash
} from 'lucide-react';

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

// Icon helper mapping to render custom Lucide icons dynamically
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

export const ModuleManagement: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Parent Module Form state
  const [modName, setModName] = useState('');
  const [modSlug, setModSlug] = useState('');
  const [modIcon, setModIcon] = useState('LayoutDashboard');
  const [modSort, setModSort] = useState(0);

  // Sub-module Form state
  const [subName, setSubName] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subRoute, setSubRoute] = useState('');
  const [subSort, setSubSort] = useState(0);
  const [selectedModuleUuid, setSelectedModuleUuid] = useState('');

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const response = await api.get('/modules');
      setModules(response.data.data);
      if (response.data.data.length > 0 && !selectedModuleUuid) {
        setSelectedModuleUuid(response.data.data[0].uuid);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch modules');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName || !modSlug) return;
    try {
      const response = await api.post('/modules', {
        name: modName,
        slug: modSlug,
        icon: modIcon,
        sort_order: modSort,
      });
      showToast('Parent module created successfully!', 'success');
      setModName('');
      setModSlug('');
      setModSort(0);
      fetchModules();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create module', 'error');
    }
  };

  const handleCreateSubModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subSlug || !selectedModuleUuid) return;
    try {
      const response = await api.post('/sub-modules', {
        module_uuid: selectedModuleUuid,
        name: subName,
        slug: subSlug,
        route: subRoute,
        sort_order: subSort,
      });
      showToast('Sub-module created successfully!', 'success');
      setSubName('');
      setSubSlug('');
      setSubRoute('');
      setSubSort(0);
      fetchModules();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create sub-module', 'error');
    }
  };

  const handleDeleteModule = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this module and all its sub-modules?')) return;
    try {
      await api.delete(`/modules/${uuid}`);
      showToast('Module deleted successfully!', 'success');
      fetchModules();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete module', 'error');
    }
  };

  const handleDeleteSubModule = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this sub-module?')) return;
    try {
      await api.delete(`/sub-modules/${uuid}`);
      showToast('Sub-module deleted successfully!', 'success');
      fetchModules();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete sub-module', 'error');
    }
  };

  const toggleExpand = (uuid: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [uuid]: !prev[uuid]
    }));
  };

  return (
    <div className="w-full space-y-8 text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2 font-medium text-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
            {notification.message}
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Modules Manager
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Build and manage system navigation modules, routes, and layout structures dynamically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create Forms */}
        <div className="space-y-6 lg:col-span-1">
          {/* Create Parent Module */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
              <Folder className="w-5 h-5 text-indigo-600" />
              Add Parent Module
            </h2>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Module Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Data"
                  value={modName}
                  onChange={(e) => {
                    setModName(e.target.value);
                    if (!modSlug) setModSlug(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. master_data"
                  value={modSlug}
                  onChange={(e) => setModSlug(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Icon</label>
                  <select
                    value={modIcon}
                    onChange={(e) => setModIcon(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition-colors cursor-pointer"
                  >
                    <option value="LayoutDashboard">Dashboard</option>
                    <option value="Building2">Building</option>
                    <option value="Users">Users</option>
                    <option value="Kanban">Kanban</option>
                    <option value="ListTodo">Backlog</option>
                    <option value="BarChart3">Reports</option>
                    <option value="Bug">Bug/Issues</option>
                    <option value="Shield">Shield</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={modSort}
                    onChange={(e) => setModSort(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Module
              </button>
            </form>
          </div>

          {/* Create Sub Module */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Add Sub-module
            </h2>
            <form onSubmit={handleCreateSubModule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Module</label>
                <select
                  value={selectedModuleUuid}
                  onChange={(e) => setSelectedModuleUuid(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition-colors cursor-pointer"
                >
                  <option value="" disabled>Select parent module...</option>
                  {modules.map(mod => (
                    <option key={mod.uuid} value={mod.uuid}>{mod.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sub-module Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Master"
                  value={subName}
                  onChange={(e) => {
                    setSubName(e.target.value);
                    if (!subSlug) setSubSlug(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. state_master"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Route Path</label>
                  <input
                    type="text"
                    placeholder="e.g. /states"
                    value={subRoute}
                    onChange={(e) => setSubRoute(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={subSort}
                    onChange={(e) => setSubSort(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Sub-module
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Modules Structure Tree */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-indigo-600" />
              Configured Modules Hierarchy
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
                <span className="text-sm font-medium">Loading module mapping...</span>
              </div>
            ) : error ? (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-lg text-sm flex items-center gap-3">
                <ShieldAlert className="w-5 h-5" />
                {error}
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-lg font-medium">
                No modules defined. Create a parent module to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((mod) => {
                  const IconComp = iconMap[mod.icon] || Folder;
                  const isExpanded = expandedModules[mod.uuid];
                  return (
                    <div 
                      key={mod.uuid} 
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-slate-300 transition-colors"
                    >
                      {/* Parent Module Bar */}
                      <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div 
                          className="flex items-center gap-3 cursor-pointer select-none"
                          onClick={() => toggleExpand(mod.uuid)}
                        >
                          <div className="text-slate-400 hover:text-slate-800 transition-colors">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                          <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                            <IconComp className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                              {mod.name}
                            </span>
                            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-2 font-mono">
                              /{mod.slug}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">
                              (order: {mod.sort_order})
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteModule(mod.uuid)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Parent Module"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Submodules Listing */}
                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/20 space-y-2">
                          {mod.sub_modules.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400 italic">
                              No sub-modules under this category.
                            </div>
                          ) : (
                            mod.sub_modules.map((sub) => (
                              <div 
                                key={sub.uuid} 
                                className="flex justify-between items-center bg-white hover:bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 pl-6 group transition-colors shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                                  <span className="text-xs font-semibold text-slate-700">{sub.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                    Slug: {sub.slug}
                                  </span>
                                  {sub.route && (
                                    <span className="text-[10px] text-purple-600 font-mono bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
                                      Route: {sub.route}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    (order: {sub.sort_order})
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteSubModule(sub.uuid)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                  title="Delete Sub-module"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
