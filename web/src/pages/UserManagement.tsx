import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical, 
  Search,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  Building2,
  X
} from 'lucide-react';
import api from '../lib/api';

interface User {
  uuid: string;
  name: string;
  email: string;
  status: string;
  role: {
    id: number;
    name: string;
    slug: string;
  };
  organizations: Array<{
    uuid: string;
    name: string;
    role: string;
  }>;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  slug: string;
}

interface Organization {
  uuid: string;
  name: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [staticDataLoaded, setStaticDataLoaded] = useState(false);
  const [loadingStaticData, setLoadingStaticData] = useState(false);
  
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    organization_uuid: '',
    status: 'active'
  });

  // Get active organization UUID from localStorage or fallback
  const userString = localStorage.getItem('user');
  const loggedInUser = userString ? JSON.parse(userString) : { name: 'Guest' };
  const selectedOrgUuid = localStorage.getItem('selected_org_uuid') || loggedInUser.organizations?.[0]?.uuid;

  useEffect(() => {
    fetchUsers();
  }, [selectedOrgUuid, selectedRoleFilter]);

  const fetchStaticData = async () => {
    if (staticDataLoaded || loadingStaticData) return;
    setLoadingStaticData(true);
    try {
      const [rolesRes, orgsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/organizations')
      ]);
      setRoles(rolesRes.data.data);
      setOrganizations(orgsRes.data.data);
      setStaticDataLoaded(true);
    } catch (err) {
      console.error('Failed to fetch static data', err);
    } finally {
      setLoadingStaticData(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {
        per_page: 500
      };
      if (selectedOrgUuid && selectedOrgUuid !== 'all') {
        params.organization_uuid = selectedOrgUuid;
      }
      if (selectedRoleFilter && selectedRoleFilter !== 'all') {
        params.role_slug = selectedRoleFilter;
      }
      const usersRes = await api.get('/users', { params });
      setUsers(usersRes.data.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await fetchUsers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (isEditing && selectedUser) {
        await api.put(`/users/${selectedUser.uuid}`, formData);
      } else {
        await api.post('/users', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${uuid}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const openCreateModal = () => {
    fetchStaticData();
    setFormData({ 
      name: '', 
      email: '', 
      password: '', 
      role_id: '', 
      organization_uuid: localStorage.getItem('selected_org_uuid') || '', 
      status: 'active' 
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    fetchStaticData();
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      role_id: user.role.id.toString(),
      organization_uuid: user.organizations[0]?.uuid || '',
      status: user.status
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage team members, roles and permissions for SprintNIX.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <UserPlus className="w-4 h-4" />
          Create New User
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/10">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Filter users..." 
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="org_admin">Organization Admin</option>
              <option value="org_user">Organization User</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-medium">Fetching team members...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organization</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                  <tr key={user.uuid} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                        <Shield className="w-3.5 h-3.5 text-indigo-500" />
                        {user.role.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-700">
                        {user.organizations[0]?.name || 'No Organization'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDetailModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit User">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user.uuid)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete User">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{isEditing ? 'Edit User' : 'Register New User'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="John Doe"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="john@example.com"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password {isEditing && '(Leave blank to keep current)'}</label>
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required={!isEditing}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">System Role</label>
                  <select 
                    value={formData.role_id}
                    onChange={(e) => setFormData({...formData, role_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                    disabled={loadingStaticData}
                  >
                    <option value="">{loadingStaticData ? 'Loading roles...' : 'Select Role...'}</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Organization</label>
                  <select 
                    value={formData.organization_uuid}
                    onChange={(e) => setFormData({...formData, organization_uuid: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    disabled={loadingStaticData}
                  >
                    <option value="">{loadingStaticData ? 'Loading organizations...' : 'Select Organization...'}</option>
                    {organizations.map(org => (
                      <option key={org.uuid} value={org.uuid}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Register User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-start bg-indigo-600 text-white">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold backdrop-blur-md">
                  {selectedUser.name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{selectedUser.name}</h2>
                  <p className="text-indigo-100 text-sm font-medium flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> {selectedUser.role.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User ID</p>
                  <p className="text-sm font-mono text-slate-600 truncate" title={selectedUser.uuid}>{selectedUser.uuid}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-indigo-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Primary Organization</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUser.organizations[0]?.name || 'None'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-indigo-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Role in Org</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUser.organizations[0]?.role || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Joined {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    openEditModal(selectedUser);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
