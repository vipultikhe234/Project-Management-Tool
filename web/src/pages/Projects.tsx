import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  Folder, 
  FolderPlus, 
  FolderKanban, 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  X, 
  ArrowRight,
  Shield,
  Briefcase,
  Search,
  Target,
  AlertTriangle,
  HeartPulse,
  PlusCircle
} from 'lucide-react';

interface ProjectMember {
  uuid: string;
  name: string;
  avatar: string;
}

interface ProjectBoard {
  uuid: string;
  name: string;
  type: string;
}

interface Project {
  uuid: string;
  key: string;
  name: string;
  description: string;
  avatar: string | null;
  status: string;
  boards: ProjectBoard[];
  members: ProjectMember[];
  organization_uuid?: string;
  created_at: string;
}

interface User {
  uuid: string;
  name: string;
  email: string;
}

interface Role {
  id: number;
  name: string;
  slug: string;
}

interface OKR {
  uuid: string;
  objective: string;
  key_results: string[];
}

interface Risk {
  uuid: string;
  title: string;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  probability: 'Low' | 'Medium' | 'High';
  mitigation_plan: string;
}

const ProjectHealthScoreView: React.FC<{ projectUuid: string }> = ({ projectUuid }) => {
  const [health, setHealth] = useState<{ score: number; status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${projectUuid}/health`)
      .then(res => setHealth(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectUuid]);

  if (loading) return <span className="text-[10px] text-slate-400 font-medium">Loading health...</span>;
  if (!health) return null;

  const scoreColor = 
    health.status === 'Healthy' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
    health.status === 'Warning' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
    'text-rose-500 bg-rose-500/10 border-rose-500/20';

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Health:</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${scoreColor}`}>
        {health.score}% ({health.status})
      </span>
    </div>
  );
};

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'members' | 'okrs' | 'risks' | 'health'>('members');
  
  // OKR & Risk state
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loadingOkrs, setLoadingOkrs] = useState(false);
  const [loadingRisks, setLoadingRisks] = useState(false);
  
  // Project health detail state
  const [healthDetail, setHealthDetail] = useState<any>(null);
  const [loadingHealthDetail, setLoadingHealthDetail] = useState(false);

  // Form states
  const [newProject, setNewProject] = useState({
    name: '',
    key: '',
    type: 'kanban',
    description: ''
  });
  const [addMemberForm, setAddMemberForm] = useState({
    user_uuid: '',
    role_id: ''
  });
  const [newOkrForm, setNewOkrForm] = useState({
    objective: '',
    key_results: ''
  });
  const [newRiskForm, setNewRiskForm] = useState({
    title: '',
    impact: 'Medium',
    probability: 'Medium',
    mitigation_plan: ''
  });

  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Auth context checks
  const userString = localStorage.getItem('user');
  const loggedInUser = userString ? JSON.parse(userString) : null;
  const isSuperAdmin = loggedInUser?.role_id === 1 || loggedInUser?.role?.slug === 'admin';
  const isOrgAdmin = loggedInUser?.role_id === 2 || loggedInUser?.role?.slug === 'org_admin';
  const canManageProjects = isSuperAdmin || isOrgAdmin;

  useEffect(() => {
    fetchProjects();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProjects = async () => {
    const orgUuid = localStorage.getItem('selected_org_uuid') || '';
    setLoadingProjects(true);
    try {
      const response = await api.get('/projects', {
        params: { organization_uuid: orgUuid }
      });
      setProjects(response.data.data);
    } catch (err: any) {
      showToast('Failed to load projects list.', 'error');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchUsersAndRoles = async (project?: Project) => {
    if (loadingUsers) return;
    setLoadingUsers(true);
    try {
      const orgUuid = project?.organization_uuid || localStorage.getItem('selected_org_uuid') || '';
      const params: any = {};
      if (orgUuid && orgUuid !== 'all') {
        params.organization_uuid = orgUuid;
      }

      const [usersResponse, rolesResponse] = await Promise.all([
        api.get('/users', { params }),
        api.get('/roles')
      ]);
      setUsers(usersResponse.data.data);
      setRoles(rolesResponse.data.data);
      setUsersLoaded(true);
    } catch (err) {
      console.error('Failed to load user listing or security roles', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProjectOkrs = async (projectUuid: string) => {
    setLoadingOkrs(true);
    try {
      const res = await api.get(`/projects/${projectUuid}/okrs`);
      setOkrs(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch OKRs', err);
    } finally {
      setLoadingOkrs(false);
    }
  };

  const fetchProjectRisks = async (projectUuid: string) => {
    setLoadingRisks(true);
    try {
      const res = await api.get(`/projects/${projectUuid}/risks`);
      setRisks(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch Risks', err);
    } finally {
      setLoadingRisks(false);
    }
  };

  const fetchProjectHealthDetail = async (projectUuid: string) => {
    setLoadingHealthDetail(true);
    try {
      const res = await api.get(`/projects/${projectUuid}/health`);
      setHealthDetail(res.data.data);
    } catch (err) {
      console.error('Failed to fetch Health detail', err);
    } finally {
      setLoadingHealthDetail(false);
    }
  };

  const handleCreateProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);

    const orgUuid = localStorage.getItem('selected_org_uuid') || '';
    let targetOrgUuid = '';
    if (orgUuid === 'all' || !orgUuid) {
      const userOrgs = loggedInUser?.organizations || [];
      if (userOrgs.length === 0) {
        setError('Please create or select an organization first.');
        setSubmitting(false);
        return;
      }
      targetOrgUuid = userOrgs[0].uuid;
    } else {
      targetOrgUuid = orgUuid;
    }

    try {
      await api.post('/projects', {
        ...newProject,
        organization_uuid: targetOrgUuid
      });
      showToast(`Project "${newProject.name}" created successfully!`, 'success');
      setCreateModalOpen(false);
      setNewProject({ name: '', key: '', type: 'kanban', description: '' });
      fetchProjects();
      // Notify sidebar to refresh project lists
      window.dispatchEvent(new Event('workspace-updated'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register new project. Ensure the key is unique.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (uuid: string) => {
    if (!window.confirm('Are you sure you want to delete/archive this project? All boards and tickets will be lost.')) return;

    try {
      await api.delete(`/projects/${uuid}`);
      showToast('Project deleted successfully.', 'success');
      fetchProjects();
      // Notify sidebar to refresh project lists
      window.dispatchEvent(new Event('workspace-updated'));
    } catch (err: any) {
      showToast('Failed to delete project.', 'error');
    }
  };

  const handleOpenProjectCenter = async (project: Project) => {
    setSelectedProject(project);
    setActiveModalTab('members');
    setMembersModalOpen(true);
    setAddMemberForm({ user_uuid: '', role_id: '' });
    setNewOkrForm({ objective: '', key_results: '' });
    setNewRiskForm({ title: '', impact: 'Medium', probability: 'Medium', mitigation_plan: '' });
    
    // Fetch initial tab data
    fetchUsersAndRoles(project);
  };

  useEffect(() => {
    if (selectedProject && membersModalOpen) {
      if (activeModalTab === 'okrs') {
        fetchProjectOkrs(selectedProject.uuid);
      } else if (activeModalTab === 'risks') {
        fetchProjectRisks(selectedProject.uuid);
      } else if (activeModalTab === 'health') {
        fetchProjectHealthDetail(selectedProject.uuid);
      }
    }
  }, [activeModalTab, selectedProject, membersModalOpen]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setError('');
    setSubmitting(true);

    try {
      await api.post(`/projects/${selectedProject.uuid}/members`, {
        user_uuid: addMemberForm.user_uuid
      });
      showToast('Team member added to the project!', 'success');
      
      const updatedResponse = await api.get(`/projects/${selectedProject.uuid}`);
      const updatedProject = updatedResponse.data.data;
      
      setProjects(prev => prev.map(p => p.uuid === selectedProject.uuid ? updatedProject : p));
      setSelectedProject(updatedProject);
      setAddMemberForm({ user_uuid: '', role_id: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add project member. Ensure they are not already added.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOkr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setError('');
    setSubmitting(true);

    const krArray = newOkrForm.key_results
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    try {
      await api.post(`/projects/${selectedProject.uuid}/okrs`, {
        objective: newOkrForm.objective,
        key_results: krArray
      });
      showToast('OKR objective added successfully!', 'success');
      setNewOkrForm({ objective: '', key_results: '' });
      fetchProjectOkrs(selectedProject.uuid);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add OKR.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setError('');
    setSubmitting(true);

    try {
      await api.post(`/projects/${selectedProject.uuid}/risks`, newRiskForm);
      showToast('Risk mitigation plan registered!', 'success');
      setNewRiskForm({ title: '', impact: 'Medium', probability: 'Medium', mitigation_plan: '' });
      fetchProjectRisks(selectedProject.uuid);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register risk.');
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-700 placeholder-slate-400"
          />
        </div>
        {canManageProjects && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <FolderPlus className="w-4 h-4" /> Create Project
          </button>
        )}
      </div>

      {/* Grid List */}
      {loadingProjects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between animate-pulse shadow-sm h-48">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-200 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <div className="h-3 w-48 bg-slate-100 rounded-full mb-6 animate-pulse" />
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between animate-pulse shadow-sm h-48">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-200 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <div className="h-3 w-48 bg-slate-100 rounded-full mb-6 animate-pulse" />
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between animate-pulse shadow-sm h-48">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-200 rounded-xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <div className="h-3 w-48 bg-slate-100 rounded-full mb-6 animate-pulse" />
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-3xl">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
            <Folder className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-slate-800 font-bold text-lg">No Projects Found</p>
            <p className="text-slate-500 text-sm max-w-sm">
              Please create a project to start configuring boards, sprints, and logging tickets.
            </p>
          </div>
          {canManageProjects && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.uuid}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-300 transition-all duration-300 relative overflow-hidden group shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <FolderKanban className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
                          Key: {project.key}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {canManageProjects && (
                    <button
                      onClick={() => handleDeleteProject(project.uuid)}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                      title="Archive Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed min-h-[40px] line-clamp-2 mb-2 font-medium">
                  {project.description || 'No description provided.'}
                </p>

                {/* Health Score Component */}
                <ProjectHealthScoreView projectUuid={project.uuid} />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-4">
                {/* Active Boards Info */}
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Board</span>
                  <span className="text-slate-700 font-semibold truncate max-w-[120px] block">
                    {project.boards?.[0]?.name || 'No Boards'}
                  </span>
                </div>

                {/* Manage Project Center */}
                <button
                  onClick={() => handleOpenProjectCenter(project)}
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl text-[11px] font-bold border border-slate-200 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Project Center</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Create New Project</h2>
                  <p className="text-xs text-slate-400 font-medium">Initialize a new team repository and board workspace.</p>
                </div>
              </div>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder="SprintNIX Core Platform"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Project Key</label>
                  <input
                     type="text"
                     value={newProject.key}
                     onChange={(e) => setNewProject({...newProject, key: e.target.value.toUpperCase()})}
                     placeholder="ALPHA"
                     maxLength={10}
                     className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium uppercase"
                     required
                  />
                  <span className="text-[9px] text-slate-400 font-medium block ml-1">Unique ID prefix (e.g. SN-1, SN-2).</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Workflow Engine</label>
                  <select
                    value={newProject.type}
                    onChange={(e) => setNewProject({...newProject, type: e.target.value})}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  >
                    <option value="kanban">Kanban (Continuous Flow)</option>
                    <option value="scrum">Scrum (Sprints & Backlog)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder="Optional details regarding project goals and scope..."
                  rows={4}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium resize-none"
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateProject()}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Workspace <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Center Modal (Members, OKRs, Risks, Health details) */}
      {membersModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Project Center</h2>
                  <p className="text-xs text-slate-400 font-medium">{selectedProject.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setMembersModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-100 px-6 bg-slate-50/30">
              <button 
                onClick={() => setActiveModalTab('members')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeModalTab === 'members' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Members
              </button>
              <button 
                onClick={() => setActiveModalTab('okrs')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeModalTab === 'okrs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Target className="w-3.5 h-3.5" /> OKRs
              </button>
              <button 
                onClick={() => setActiveModalTab('risks')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeModalTab === 'risks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Risks
              </button>
              <button 
                onClick={() => setActiveModalTab('health')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeModalTab === 'health' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" /> Health Details
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* MEMBERS TAB */}
              {activeModalTab === 'members' && (
                <div className="space-y-6">
                  {canManageProjects && (
                    <form onSubmit={handleAddMember} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <UserPlus className="w-4.5 h-4.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Add Team Member</span>
                      </div>
                      
                      {error && activeModalTab === 'members' && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs py-2 px-3 rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {error}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select User</label>
                        <select
                          value={addMemberForm.user_uuid}
                          onChange={(e) => setAddMemberForm({...addMemberForm, user_uuid: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-xs font-medium"
                          required
                        >
                          <option value="">-- Choose User --</option>
                          {users.map(u => (
                            <option key={u.uuid} value={u.uuid}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Add Member <Plus className="w-4 h-4" /></>}
                      </button>
                    </form>
                  )}

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Active Workspace Members ({selectedProject.members?.length || 0})</span>
                    <div className="space-y-2">
                      {selectedProject.members?.map((member) => (
                        <div 
                          key={member.uuid}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                              {member.name.substring(0,2)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{member.name}</p>
                              <span className="text-[9px] text-slate-400 block font-mono truncate max-w-[200px]">{member.uuid}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">
                            <Briefcase className="w-3 h-3 text-indigo-500" /> Active Member
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* OKRS TAB */}
              {activeModalTab === 'okrs' && (
                <div className="space-y-6">
                  {canManageProjects && (
                    <form onSubmit={handleAddOkr} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <PlusCircle className="w-4.5 h-4.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Add Project OKR</span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Objective Title</label>
                        <input
                          type="text"
                          value={newOkrForm.objective}
                          onChange={(e) => setNewOkrForm({...newOkrForm, objective: e.target.value})}
                          placeholder="e.g. Complete core auth features with high security"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Key Results (comma separated list)</label>
                        <input
                          type="text"
                          value={newOkrForm.key_results}
                          onChange={(e) => setNewOkrForm({...newOkrForm, key_results: e.target.value})}
                          placeholder="e.g. Integrate JWT token refresh, Implement SSO, Attain 95% unit test coverage"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save OKR Objective <Plus className="w-4 h-4" /></>}
                      </button>
                    </form>
                  )}

                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Project OKRs ({okrs.length})</span>
                    {loadingOkrs ? (
                      <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span className="text-xs">Loading OKR configurations...</span>
                      </div>
                    ) : okrs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pl-1">No Objectives & Key Results linked to this project workspace.</p>
                    ) : (
                      <div className="space-y-3">
                        {okrs.map((okr) => (
                          <div key={okr.uuid} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="w-4 h-4 text-indigo-500" />
                              <h4 className="text-xs font-black text-slate-800">{okr.objective}</h4>
                            </div>
                            <div className="pl-6 space-y-1">
                              {okr.key_results?.map((kr, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                  <span>{kr}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RISKS TAB */}
              {activeModalTab === 'risks' && (
                <div className="space-y-6">
                  {canManageProjects && (
                    <form onSubmit={handleAddRisk} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <PlusCircle className="w-4.5 h-4.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Register Project Risk Factor</span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Risk Title</label>
                        <input
                          type="text"
                          value={newRiskForm.title}
                          onChange={(e) => setNewRiskForm({...newRiskForm, title: e.target.value})}
                          placeholder="e.g. Delayed third-party payment gateway integration approval"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Impact Level</label>
                          <select
                            value={newRiskForm.impact}
                            onChange={(e) => setNewRiskForm({...newRiskForm, impact: e.target.value as any})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-700"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Probability Level</label>
                          <select
                            value={newRiskForm.probability}
                            onChange={(e) => setNewRiskForm({...newRiskForm, probability: e.target.value as any})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-700"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Mitigation Plan</label>
                        <textarea
                          value={newRiskForm.mitigation_plan}
                          onChange={(e) => setNewRiskForm({...newRiskForm, mitigation_plan: e.target.value})}
                          placeholder="Identify alternative integration provider, create mock gateway interfaces..."
                          rows={3}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save Mitigation Risk <Plus className="w-4 h-4" /></>}
                      </button>
                    </form>
                  )}

                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Active Project Risks ({risks.length})</span>
                    {loadingRisks ? (
                      <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span className="text-xs">Loading registered risk logs...</span>
                      </div>
                    ) : risks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pl-1">No registered project risks detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {risks.map((risk) => {
                          const impactColor = 
                            risk.impact === 'Critical' ? 'text-rose-600 bg-rose-50 border-rose-100' :
                            risk.impact === 'High' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                            'text-slate-600 bg-slate-50 border-slate-100';

                          return (
                            <div key={risk.uuid} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all">
                              <div className="flex justify-between items-start mb-2 gap-4">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                  <h4 className="text-xs font-black text-slate-800 leading-snug">{risk.title}</h4>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${impactColor}`}>
                                  {risk.impact} Impact
                                </span>
                              </div>
                              <div className="pl-6 space-y-1 text-[11px] font-medium text-slate-500">
                                <p><strong className="text-slate-600">Probability:</strong> {risk.probability}</p>
                                <p><strong className="text-slate-600">Mitigation:</strong> {risk.mitigation_plan || 'No plan defined.'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HEALTH DETAILS TAB */}
              {activeModalTab === 'health' && (
                <div className="space-y-6">
                  {loadingHealthDetail ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      <span className="text-xs font-medium">Computing live health indexes...</span>
                    </div>
                  ) : !healthDetail ? (
                    <p className="text-xs text-slate-400 italic text-center py-10">No health analysis data could be compiled.</p>
                  ) : (
                    <div className="space-y-6">
                      {/* Health Meter Panel */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
                        <HeartPulse className={`w-12 h-12 mx-auto ${
                          healthDetail.status === 'Healthy' ? 'text-emerald-500 animate-pulse' :
                          healthDetail.status === 'Warning' ? 'text-amber-500' : 'text-rose-500'
                        }`} />
                        <div>
                          <h3 className="text-3xl font-black text-slate-900">{healthDetail.score}%</h3>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Workspace Status Index</span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Your project health score is calculated based on overdue tasks, incomplete sprint tasks, and open bugs. 
                          A score below 50% puts the sprint delivery target at risk.
                        </p>
                      </div>

                      {/* Score Breakdown Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                          <span className="text-2xl font-bold text-rose-500 block">{healthDetail.overdue_tasks}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-1">Overdue Tasks</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                          <span className="text-2xl font-bold text-amber-500 block">{healthDetail.open_bugs}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-1">Open Bugs</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                          <span className="text-2xl font-bold text-indigo-500 block">{healthDetail.incomplete_sprint_tasks}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-1">Incomplete Tasks</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setMembersModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all"
              >
                Close Center
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
