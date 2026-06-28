import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Eye,
  Globe,
  CreditCard,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import api from '../lib/api';

interface Organization {
  uuid: string;
  name: string;
  slug: string;
  subscription_plan: string;
  primary_domain: string | null;
  created_at: string;
}

export const Organizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentOrg, setCurrentOrg] = useState<Partial<Organization>>({
    name: '',
    slug: '',
    subscription_plan: 'FREE',
    primary_domain: ''
  });
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const userString = localStorage.getItem('user');
  const loggedInUser = userString ? JSON.parse(userString) : null;
  const isSuperAdmin = loggedInUser?.role?.slug === 'admin';

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await api.get('/organizations');
      setOrganizations(response.data.data);
    } catch (err: any) {
      setError('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (isEditing && currentOrg.uuid) {
        await api.put(`/organizations/${currentOrg.uuid}`, currentOrg);
      } else {
        await api.post('/organizations', currentOrg);
      }
      setIsModalOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Something went wrong');
    } finally {
      setFormLoading(false);
    }
  };

  const openCreateModal = () => {
    setCurrentOrg({ name: '', slug: '', subscription_plan: 'FREE', primary_domain: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setCurrentOrg(org);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openDetailModal = (org: Organization) => {
    setSelectedOrg(org);
    setIsDetailModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setCurrentOrg({
      ...currentOrg,
      name,
      slug: isEditing ? (currentOrg.slug || '') : name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
    });
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.primary_domain && org.primary_domain.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesPlan = planFilter === 'all' || org.subscription_plan === planFilter;
    
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by name, slug or domain..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-700 placeholder-slate-400"
            />
          </div>
          <div className="relative w-full sm:w-auto shrink-0">
            <select 
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={openCreateModal}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Organization
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Orgs</p>
          <p className="text-xl font-bold text-slate-900">{organizations.length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Active Subscriptions</p>
          <p className="text-xl font-bold text-emerald-600">{organizations.filter(o => o.subscription_plan !== 'FREE').length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Growth</p>
          <p className="text-xl font-bold text-indigo-600">+12%</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-medium">Fetching organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-900 font-bold">No organizations found</p>
              <p className="text-slate-500 text-sm">Create your first organization to get started.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organization Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Domain</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created At</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrganizations.map((org) => (
                  <tr key={org.uuid} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold">
                          {org.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{org.name}</p>
                          <p className="text-xs text-slate-500">slug: {org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        org.subscription_plan === 'ENTERPRISE' ? 'bg-indigo-100 text-indigo-700' :
                        org.subscription_plan === 'PRO' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <CreditCard className="w-3 h-3" />
                        {org.subscription_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {org.primary_domain ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Globe className="w-4 h-4 opacity-50" />
                          <span className="text-sm font-medium">{org.primary_domain}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openDetailModal(org)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEditModal(org)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Edit Organization"
                        >
                          <Edit2 className="w-4 h-4" />
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{isEditing ? 'Edit Organization' : 'Create Organization'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Organization Name</label>
                <input 
                  type="text" 
                  value={currentOrg.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Unique Slug</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm font-bold border-r border-slate-200 pr-2 mr-2">sprintnix.com/</span>
                  </div>
                  <input 
                    type="text" 
                    value={currentOrg.slug}
                    onChange={(e) => setCurrentOrg({...currentOrg, slug: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-[115px] pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                    placeholder="slug-name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Subscription Plan</label>
                  <select 
                    value={currentOrg.subscription_plan}
                    onChange={(e) => setCurrentOrg({...currentOrg, subscription_plan: e.target.value})}
                    disabled={!isSuperAdmin}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Primary Domain</label>
                  <input 
                    type="text" 
                    value={currentOrg.primary_domain || ''}
                    onChange={(e) => setCurrentOrg({...currentOrg, primary_domain: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="acme.com"
                  />
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
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Organization')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {isDetailModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-start bg-indigo-600 text-white">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold backdrop-blur-md">
                  {selectedOrg.name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{selectedOrg.name}</h2>
                  <p className="text-indigo-100 text-sm font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Organization
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace ID</p>
                  <p className="text-sm font-mono text-slate-600 truncate" title={selectedOrg.uuid}>{selectedOrg.uuid}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public Slug</p>
                  <p className="text-sm font-bold text-slate-900">/{selectedOrg.slug}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-indigo-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Subscription Plan</p>
                      <p className="text-sm font-bold text-slate-900">{selectedOrg.subscription_plan}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md uppercase">Paid</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-indigo-600">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Primary Domain</p>
                      <p className="text-sm font-bold text-slate-900">{selectedOrg.primary_domain || 'Not configured'}</p>
                    </div>
                  </div>
                  {selectedOrg.primary_domain && <ExternalLink className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-slate-500">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Joined {new Date(selectedOrg.created_at).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    openEditModal(selectedOrg);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
