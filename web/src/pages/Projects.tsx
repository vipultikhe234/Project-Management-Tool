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
  Briefcase
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

  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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
    console.log('[Projects.tsx] fetchProjects called with orgUuid:', orgUuid);
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

  const handleCreateProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);

    const orgUuid = localStorage.getItem('selected_org_uuid') || '';
    let targetOrgUuid = '';
    if (orgUuid === 'all' || !orgUuid) {
      // If super admin has 'all' selected, use their first organization or warn
      const userOrgs = loggedInUser?.organizations || [];
      if (userOrgs.length === 0) {
        setError('Please create or select an organization first.');
        setSubmitting(false);
        return;
      }
      // Use their active organization
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
    } catch (err: any) {
      showToast('Failed to delete project.', 'error');
    }
  };

  const handleOpenMembers = async (project: Project) => {
    setSelectedProject(project);
    setMembersModalOpen(true);
    setAddMemberForm({ user_uuid: '', role_id: '' });
    fetchUsersAndRoles(project);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setError('');
    setSubmitting(true);

    try {
      await api.post(`/projects/${selectedProject.uuid}/members`, {
        user_uuid: addMemberForm.user_uuid,
        role_id: parseInt(addMemberForm.role_id)
      });
      showToast('Team member added to the project!', 'success');
      
      // Refresh current project members in UI
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

  return (
    <div className="w-full space-y-8 text-slate-800">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Project Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Manage your organization's projects, boards, and team members dynamically.
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <FolderPlus className="w-4 h-4" /> Create Project
          </button>
        )}
      </div>

      {/* Grid List */}
      {loadingProjects ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-sm font-medium">Loading workspace projects...</span>
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
          {projects.map((project) => (
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
                      <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
                        Key: {project.key}
                      </span>
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

                <p className="text-xs text-slate-500 leading-relaxed min-h-[40px] line-clamp-2 mb-6 font-medium">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                {/* Active Boards Info */}
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Board</span>
                  <span className="text-slate-700 font-semibold truncate max-w-[120px] block">
                    {project.boards?.[0]?.name || 'No Boards'}
                  </span>
                </div>

                {/* Manage Members Actions */}
                <button
                  onClick={() => handleOpenMembers(project)}
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl text-[11px] font-bold border border-slate-200 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{project.members?.length || 0} Members</span>
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

      {/* Manage Members Modal */}
      {membersModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Project Members</h2>
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

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add Member Form */}
              {canManageProjects && (
                <form onSubmit={handleAddMember} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <UserPlus className="w-4.5 h-4.5 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Add Team Member</span>
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs py-2 px-3 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select User</label>
                      <select
                        value={addMemberForm.user_uuid}
                        onChange={(e) => setAddMemberForm({...addMemberForm, user_uuid: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-xs font-medium"
                        required
                        disabled={loadingUsers}
                      >
                        <option value="">{loadingUsers ? 'Loading Users...' : '-- Choose User --'}</option>
                        {users.map(u => (
                          <option key={u.uuid} value={u.uuid}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assign Role</label>
                      <select
                        value={addMemberForm.role_id}
                        onChange={(e) => setAddMemberForm({...addMemberForm, role_id: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-xs font-medium"
                        required
                        disabled={loadingUsers}
                      >
                        <option value="">{loadingUsers ? 'Loading Roles...' : '-- Choose Role --'}</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Add to Workspace <Plus className="w-4 h-4" /></>}
                  </button>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Active Workspace Members ({selectedProject.members?.length || 0})</span>
                <div className="space-y-2">
                  {selectedProject.members?.map((member) => (
                    <div 
                      key={member.uuid}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 object-cover"
                        />
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

                  {selectedProject.members?.length === 0 && (
                    <p className="text-xs text-slate-500 italic pl-1">No members added to this project workspace.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setMembersModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
