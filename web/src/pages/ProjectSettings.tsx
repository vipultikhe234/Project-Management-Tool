import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  Settings, 
  Layers, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Check, 
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Tag
} from 'lucide-react';

interface Project {
  uuid: string;
  key: string;
  name: string;
  description: string;
  allowed_types: string[];
}

interface Epic {
  uuid: string;
  key: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
}

const ALL_WORK_TYPES = ['Story', 'Task', 'Bug', 'Spike', 'Subtask'];

export const ProjectSettings: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEpics, setLoadingEpics] = useState(false);
  const [activeTab, setActiveTab] = useState<'types' | 'epics'>('types');
  
  // Settings Form State
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // New Epic Form State
  const [newEpic, setNewEpic] = useState({
    title: '',
    description: '',
    priority: 'High'
  });
  const [creatingEpic, setCreatingEpic] = useState(false);

  // General Notification/Feedback UI
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Role Checks
  const userString = localStorage.getItem('user');
  const loggedInUser = userString ? JSON.parse(userString) : null;
  const isSuperAdmin = loggedInUser?.role_id === 1 || loggedInUser?.role?.slug === 'admin';
  const isOrgAdmin = loggedInUser?.role_id === 2 || loggedInUser?.role?.slug === 'org_admin';
  const hasAccess = isSuperAdmin || isOrgAdmin;

  const orgUuid = localStorage.getItem('selected_org_uuid') || loggedInUser?.organizations?.[0]?.uuid || '';

  useEffect(() => {
    if (hasAccess && orgUuid) {
      fetchProjects();
    }
  }, [orgUuid]);

  useEffect(() => {
    if (selectedProject) {
      setAllowedTypes(selectedProject.allowed_types || ALL_WORK_TYPES);
      fetchEpics(selectedProject.uuid);
    }
  }, [selectedProject]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await api.get('/projects', {
        params: { organization_uuid: orgUuid }
      });
      const data = response.data.data;
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0]);
      }
    } catch (err: any) {
      showToast('Failed to load projects listing.', 'error');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchEpics = async (projectUuid: string) => {
    setLoadingEpics(true);
    try {
      const response = await api.get('/tickets', {
        params: { 
          project_uuid: projectUuid,
          type: 'Epic'
        }
      });
      setEpics(response.data.data);
    } catch (err) {
      console.error('Failed to load Epics list', err);
    } finally {
      setLoadingEpics(false);
    }
  };

  const handleTypeToggle = (type: string) => {
    setAllowedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setError('');
    setSavingSettings(true);

    try {
      // Epics must always be supported behind the scenes or explicitly
      const typesToSave = [...allowedTypes];
      if (!typesToSave.includes('Epic')) {
        typesToSave.push('Epic');
      }

      const response = await api.put(`/projects/${selectedProject.uuid}`, {
        allowed_types: typesToSave
      });
      
      const updatedProj = response.data.data;
      setProjects(prev => prev.map(p => p.uuid === updatedProj.uuid ? updatedProj : p));
      setSelectedProject(updatedProj);
      showToast('Project workflow settings updated successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update workflow configuration.');
      showToast('Workflow save failed.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setError('');
    setCreatingEpic(true);

    try {
      const response = await api.post('/tickets', {
        project_uuid: selectedProject.uuid,
        title: newEpic.title,
        description: newEpic.description,
        type: 'Epic',
        priority: newEpic.priority,
        status: 'To Do'
      });

      showToast(`Epic "${newEpic.title}" created successfully!`, 'success');
      setNewEpic({ title: '', description: '', priority: 'High' });
      fetchEpics(selectedProject.uuid);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register Epic ticket.');
      showToast('Epic registration failed.', 'error');
    } finally {
      setCreatingEpic(false);
    }
  };

  const handleDeleteEpic = async (uuid: string) => {
    if (!window.confirm('Are you sure you want to delete this Epic? Issues linked to it will remain, but the Epic association will be cleared.')) return;

    try {
      await api.delete(`/tickets/${uuid}`);
      showToast('Epic deleted successfully.', 'success');
      if (selectedProject) {
        fetchEpics(selectedProject.uuid);
      }
    } catch (err) {
      showToast('Failed to delete Epic.', 'error');
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-slate-50 text-slate-900 p-6 text-center">
        <div className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-full mb-4 animate-bounce">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Only Organization Administrators and Super Admins can customize project workflow policies or define Epics.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2 font-medium text-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
            {toast.message}
          </div>
        </div>
      )}

      {projects.length === 0 && !loadingProjects ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-3xl">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
            <Settings className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-slate-800 font-bold text-lg">No Active Projects</p>
            <p className="text-slate-500 text-sm max-w-sm">
              Please register a project first via the Projects Module before modifying settings.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-8">
          {/* Navigation Sidebar: Project Switcher & Tabs */}
          <div className="col-span-12 md:col-span-3 space-y-4">
            
            {/* Project Switcher Select */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Project</span>
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs py-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span>Loading project...</span>
                </div>
              ) : projects.length === 0 ? (
                <span className="text-xs text-rose-600 font-semibold block py-1.5">No active projects</span>
              ) : (
                <div className="relative">
                  <select
                    value={selectedProject?.uuid || ''}
                    onChange={(e) => {
                      const found = projects.find(p => p.uuid === e.target.value);
                      if (found) setSelectedProject(found);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer appearance-none pr-8"
                  >
                    {projects.map(p => (
                      <option key={p.uuid} value={p.uuid}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('types')}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all text-xs font-bold ${
                  activeTab === 'types'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <CheckSquare className="w-4.5 h-4.5" />
                  Work Types Toggles
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab('epics')}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all text-xs font-bold ${
                  activeTab === 'epics'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Layers className="w-4.5 h-4.5" />
                  Epics & Initiatives
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Setting Form Area */}
          <div className="col-span-12 md:col-span-9 bg-white border border-slate-200 rounded-2xl p-6 relative shadow-sm">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs py-3 px-4 rounded-xl flex items-center gap-2 mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* TAB 1: WORK TYPES */}
            {activeTab === 'types' && (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Work Type Customization</h3>
                  <p className="text-slate-500 text-xs mt-1 font-medium">
                    Toggle which issues can be added to the backlog and boards for <span className="text-indigo-600 font-semibold">{selectedProject?.name}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ALL_WORK_TYPES.map(type => {
                    const isSelected = allowedTypes.includes(type);
                    return (
                      <div 
                        key={type}
                        onClick={() => handleTypeToggle(type)}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                          isSelected 
                            ? 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-300' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-500 text-white' 
                              : 'border-slate-300 bg-transparent'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-800 block">{type}</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {type === 'Story' && 'User stories representing feature value.'}
                              {type === 'Bug' && 'Software defects requiring verification & fix.'}
                              {type === 'Task' && 'Generic operational or configuration task.'}
                              {type === 'Spike' && 'Time-boxed research to clarify design decisions.'}
                              {type === 'Subtask' && 'Granular breakdown of child assignments.'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow"
                  >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save Changes <ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: EPICS */}
            {activeTab === 'epics' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Epics & Initiatives</h3>
                  <p className="text-slate-500 text-xs mt-1 font-medium">
                    Manage high-level project milestones. You can associate user stories, tasks, bugs, and spikes to these epics.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Create New Epic Form */}
                  <form onSubmit={handleCreateEpic} className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 h-fit">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Create New Epic</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Epic Title</label>
                      <input
                        type="text"
                        value={newEpic.title}
                        onChange={(e) => setNewEpic({...newEpic, title: e.target.value})}
                        placeholder="e.g. Authentication Strategy"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 placeholder:text-slate-400 font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                      <textarea
                        value={newEpic.description}
                        onChange={(e) => setNewEpic({...newEpic, description: e.target.value})}
                        placeholder="Define the scope of this epic..."
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none placeholder:text-slate-400 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                      <select
                        value={newEpic.priority}
                        onChange={(e) => setNewEpic({...newEpic, priority: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none font-medium"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingEpic}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                    >
                      {creatingEpic ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Epic <Plus className="w-4 h-4" /></>}
                    </button>
                  </form>

                  {/* Active Epics List */}
                  <div className="lg:col-span-7 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Active Epics</span>
                    
                    {loadingEpics ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
                        <span className="text-xs font-medium">Loading Epics list...</span>
                      </div>
                    ) : epics.length === 0 ? (
                      <div className="py-10 text-center border border-slate-200 rounded-xl bg-white">
                        <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 italic">No Epics defined yet for this project.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-none">
                        {epics.map(epic => (
                          <div 
                            key={epic.uuid}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-sm"
                          >
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                  {epic.key}
                                </span>
                                <h4 className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{epic.title}</h4>
                              </div>
                              {epic.description && (
                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 leading-normal font-medium">
                                  {epic.description}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteEpic(epic.uuid)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                              title="Delete/Archive Epic"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
