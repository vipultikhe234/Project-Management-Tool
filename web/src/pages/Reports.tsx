import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ChevronDown, 
  Search, 
  AlertCircle, 
  Filter, 
  RotateCcw, 
  FolderKanban, 
  FileText 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { IssueDetailModal } from '../components/layout/IssueDetailModal';

interface ProjectMeta {
  uuid: string;
  name: string;
  key: string;
}

interface SprintMeta {
  uuid: string;
  name: string;
  status: string;
  project_uuid: string;
}

interface EpicMeta {
  uuid: string;
  key: string;
  title: string;
  project_uuid: string;
}

interface UserMeta {
  uuid: string;
  name: string;
  avatar: string;
}

interface Ticket {
  uuid: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  story_points: number | null;
  project: {
    uuid: string;
    key: string;
    name: string;
  };
  assignee: {
    uuid: string;
    name: string;
    avatar: string;
  } | null;
  reporter: {
    uuid: string;
    name: string;
  } | null;
  sprint: {
    uuid: string;
    name: string;
  } | null;
  epic: {
    uuid: string;
    title: string;
  } | null;
  created_at: string;
}

interface DistributionDetail {
  count: number;
  story_points: number;
}

interface SummaryData {
  total_tickets: number;
  total_story_points: number;
  completed_count: number;
  completed_story_points: number;
  completion_rate_count: number;
  completion_rate_points: number;
  status_distribution: Record<string, DistributionDetail>;
  priority_distribution: Record<string, DistributionDetail>;
  type_distribution: Record<string, DistributionDetail>;
  assignee_distribution: Array<{
    name: string;
    count: number;
    story_points: number;
    completed_count: number;
    completed_story_points: number;
  }>;
}

export const Reports: React.FC = () => {
  // Filter States
  const [selectedProject, setSelectedProject] = useState<string>(activeProject?.uuid || 'all');
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [selectedEpic, setSelectedEpic] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Metadata lists
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [sprints, setSprints] = useState<SprintMeta[]>([]);
  const [epics, setEpicList] = useState<EpicMeta[]>([]);
  const [users, setUsers] = useState<UserMeta[]>([]);

  // Derived lists based on selected project
  const [filteredSprints, setFilteredSprints] = useState<SprintMeta[]>([]);
  const [filteredEpics, setFilteredEpics] = useState<EpicMeta[]>([]);

  // Report Data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal State
  const [selectedTicketUuid, setSelectedTicketUuid] = useState<string | null>(null);

  // Active user organization
  const userString = localStorage.getItem('user');
  const currentUser = userString ? JSON.parse(userString) : { uuid: '' };
  const orgUuid = localStorage.getItem('selected_org_uuid') || currentUser.organizations?.[0]?.uuid || '';

  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (orgUuid) {
      setInitialLoaded(false);
      fetchReportData(true).then(() => {
        setInitialLoaded(true);
      });
    }
  }, [orgUuid]);

  useEffect(() => {
    if (activeProject) {
      setSelectedProject(activeProject.uuid);
    }
  }, [activeProject?.uuid]);

  // Reactive effect to fetch filtered report data automatically when any filter changes
  useEffect(() => {
    if (initialLoaded) {
      fetchReportData(true);
    }
  }, [selectedProject, selectedSprint, selectedEpic, selectedUser, startDate, endDate, initialLoaded]);

  // Handle project change to filter sprint and epic choices
  useEffect(() => {
    if (selectedProject === 'all') {
      setFilteredSprints(sprints);
      setFilteredEpics(epics);
    } else {
      setFilteredSprints(sprints.filter(s => s.project_uuid === selectedProject));
      setFilteredEpics(epics.filter(e => e.project_uuid === selectedProject));
      
      // Reset dependent selections if they belong to another project
      setSelectedSprint('all');
      setSelectedEpic('all');
    }
  }, [selectedProject, sprints, epics]);

  const fetchReportData = async (loadMetadata = false) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        organization_uuid: orgUuid,
        project_uuid: selectedProject,
        sprint_uuid: selectedSprint,
        epic_uuid: selectedEpic,
        user_uuid: selectedUser
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get('/reports', { params });
      const { tickets: fetchedTickets, summary: fetchedSummary, metadata } = response.data.data;

      setTickets(fetchedTickets || []);
      setSummary(fetchedSummary || null);

      if (metadata) {
        setProjects(metadata.projects || []);
        setSprints(metadata.sprints || []);
        setEpicList(metadata.epics || []);
        setUsers(metadata.users || []);
        if (loadMetadata) {
          setFilteredSprints(metadata.sprints || []);
          setFilteredEpics(metadata.epics || []);
        }
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reports/export', {
        params: {
          organization_uuid: orgUuid,
          project_uuid: selectedProject,
          sprint_uuid: selectedSprint,
          epic_uuid: selectedEpic,
          user_uuid: selectedUser,
          start_date: startDate || undefined,
          end_date: endDate || undefined
        },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sprintnix_report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };


  // Chart Mappings
  const STATUS_COLORS: Record<string, string> = {
    'To Do': '#94a3b8',
    'In Progress': '#6366f1',
    'In Review ( CR )': '#f59e0b',
    'Ready Reopen': '#ef4444',
    'Ready for QA': '#a855f7',
    'QA': '#0ea5e9',
    'Done': '#10b981',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    'Critical': '#ef4444',
    'High': '#f87171',
    'Medium': '#6366f1',
    'Low': '#94a3b8',
  };

  const getStatusChartData = () => {
    if (!summary || !summary.status_distribution) return [];
    return Object.entries(summary.status_distribution).map(([status, details]) => ({
      name: status,
      value: details.count,
      points: details.story_points,
    }));
  };

  const getPriorityChartData = () => {
    if (!summary || !summary.priority_distribution) return [];
    return Object.entries(summary.priority_distribution).map(([priority, details]) => ({
      name: priority,
      Issues: details.count,
      'Story Points': details.story_points,
    }));
  };

  const getTicketTypeIcon = (type: string) => {
    switch (type) {
      case 'Bug': return <span className="text-rose-500 text-[10px] font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">BUG</span>;
      case 'Story': return <span className="text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">STRY</span>;
      case 'Epic': return <span className="text-purple-500 text-[10px] font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">EPIC</span>;
      case 'Spike': return <span className="text-amber-500 text-[10px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">SPK</span>;
      default: return <span className="text-indigo-500 text-[10px] font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">TSK</span>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical': return <span className="text-rose-500 font-bold">⇈</span>;
      case 'High': return <span className="text-rose-400 font-bold">↑</span>;
      case 'Medium': return <span className="text-indigo-400 font-bold">=</span>;
      default: return <span className="text-slate-500 font-bold">↓</span>;
    }
  };

  // Client-side search matching title or key
  const searchedTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 text-slate-800 animate-in fade-in duration-300 pb-20">
      


      {/* Advanced Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Project Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project</label>
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.uuid} value={p.uuid}>{p.name} ({p.key})</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Sprint Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sprint</label>
            <div className="relative">
              <select
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="all">All Sprints</option>
                {filteredSprints.map(s => (
                  <option key={s.uuid} value={s.uuid}>{s.name} ({s.status})</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Epic Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Epic</label>
            <div className="relative">
              <select
                value={selectedEpic}
                onChange={(e) => setSelectedEpic(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="all">All Epics</option>
                {filteredEpics.map(e => (
                  <option key={e.uuid} value={e.uuid}>{e.key}: {e.title}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assignee</label>
            <div className="relative">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="all">All Members</option>
                {users.map(u => (
                  <option key={u.uuid} value={u.uuid}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

        </div>


      </div>

      {loading && !summary ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse h-32 flex flex-col justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded-full" />
              <div className="h-8 w-16 bg-slate-200 rounded-md" />
              <div className="h-1.5 bg-slate-100 rounded-full w-full" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse h-32 flex flex-col justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded-full" />
              <div className="h-8 w-16 bg-slate-200 rounded-md" />
              <div className="h-1.5 bg-slate-100 rounded-full w-full" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse h-32 flex flex-col justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded-full" />
              <div className="h-8 w-16 bg-slate-200 rounded-md" />
              <div className="h-1.5 bg-slate-100 rounded-full w-full" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse h-32 flex flex-col justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded-full" />
              <div className="h-8 w-16 bg-slate-200 rounded-md" />
              <div className="h-1.5 bg-slate-100 rounded-full w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-12 lg:col-span-5 h-72 animate-pulse" />
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-12 lg:col-span-7 h-72 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Total Issues */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Filtered Issues</span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-extrabold text-slate-900">{summary?.total_tickets}</h2>
                <span className="text-xs text-slate-500">tickets</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>Completed Count</span>
                  <span>{summary?.completed_count} ({summary?.completion_rate_count}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${summary?.completion_rate_count || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Total Story Points */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Total Story Points</span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-extrabold text-slate-900">{summary?.total_story_points}</h2>
                <span className="text-xs text-slate-500">points</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>Burned Points</span>
                  <span>{summary?.completed_story_points} ({summary?.completion_rate_points}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${summary?.completion_rate_points || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Issue Completion Rate</span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-2">{summary?.completion_rate_count}%</h2>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Finished ticket count percentage
              </p>
            </div>

            {/* Velocity Ratio */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Average Ticket Weight</span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                  {summary && summary.total_tickets > 0 
                    ? (summary.total_story_points / summary.total_tickets).toFixed(1) 
                    : '0.0'
                  }
                </h2>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Average story points per issue
              </p>
            </div>

          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Status Distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-12 lg:col-span-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-indigo-500" /> Status Distribution
              </h3>
              
              {getStatusChartData().length === 0 ? (
                <div className="h-60 flex items-center justify-center text-xs text-slate-400 italic">
                  No data to display.
                </div>
              ) : (
                <div className="h-60 relative flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={getStatusChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {getStatusChartData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.name] || '#94a3b8'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any, props: any) => [
                          `${value} tickets (${props.payload.points} pts)`,
                          name
                        ]} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Legend below */}
                  <div className="flex flex-wrap justify-center gap-3 mt-1 text-[10px] font-semibold text-slate-600">
                    {getStatusChartData().map((entry, index) => (
                      <span key={index} className="flex items-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full inline-block" 
                          style={{ backgroundColor: STATUS_COLORS[entry.name] || '#94a3b8' }}
                        />
                        {entry.name} ({entry.value})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Priority Distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-12 lg:col-span-7 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-100">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Priority & Weight Load
              </h3>
              
              {getPriorityChartData().length === 0 ? (
                <div className="h-60 flex items-center justify-center text-xs text-slate-400 italic">
                  No data to display.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getPriorityChartData()}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <Bar dataKey="Issues" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Story Points" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

          {/* Team Workload & Velocity Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-4 h-4 text-indigo-500" /> Assignee Velocity & Delivery
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Total Issues</th>
                    <th className="py-3 px-4">Completed Issues</th>
                    <th className="py-3 px-4">Total Story Points</th>
                    <th className="py-3 px-4">Burned Story Points</th>
                    <th className="py-3 px-4">Completion Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary && summary.assignee_distribution && summary.assignee_distribution.length > 0 ? (
                    summary.assignee_distribution.map((assignee, idx) => {
                      const rate = assignee.count > 0 ? roundValue((assignee.completed_count / assignee.count) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                              {assignee.name.substring(0, 2).toUpperCase()}
                            </span>
                            {assignee.name}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-600">{assignee.count}</td>
                          <td className="py-3 px-4 font-semibold text-slate-500">{assignee.completed_count}</td>
                          <td className="py-3 px-4 font-semibold text-slate-600">{assignee.story_points} pts</td>
                          <td className="py-3 px-4 font-semibold text-emerald-600">{assignee.completed_story_points} pts</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5 min-w-[120px]">
                              <span className="font-bold text-slate-700 block w-8 shrink-0">{rate}%</span>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-1.5 rounded-full",
                                    rate >= 80 ? "bg-emerald-500" :
                                    rate >= 40 ? "bg-indigo-500" : "bg-amber-500"
                                  )}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">No team work logged in active selection.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ticket Listing Detail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Filtered Ticket List ({searchedTickets.length})
              </h3>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow active:scale-95 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" /> Export Excel / CSV
                </button>
                {/* Client side search box */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search key or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Key</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Sprint</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Story Points</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchedTickets.length > 0 ? (
                    searchedTickets.map((ticket) => (
                      <tr 
                        key={ticket.uuid}
                        onClick={() => setSelectedTicketUuid(ticket.uuid)}
                        className="hover:bg-slate-50 cursor-pointer group transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 group-hover:underline">
                          {ticket.key}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700 max-w-xs truncate">
                          {ticket.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-semibold">{ticket.project?.name}</td>
                        <td className="py-3.5 px-4 text-slate-500">{ticket.sprint?.name || 'Backlog'}</td>
                        <td className="py-3.5 px-4">
                          {ticket.assignee ? (
                            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[9px] font-black text-indigo-500">
                                {ticket.assignee.name.substring(0, 2).toUpperCase()}
                              </span>
                              {ticket.assignee.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{getTicketTypeIcon(ticket.type)}</td>
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 font-semibold text-slate-600">
                            {getPriorityIcon(ticket.priority)}
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-600 text-center">
                          {ticket.story_points !== null ? `${ticket.story_points} pts` : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border block w-fit",
                            ticket.status === 'Done' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                            ticket.status === 'In Progress' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600" :
                            ticket.status === 'In Review ( CR )' ? "bg-amber-500/10 border-amber-500/20 text-amber-600" :
                            ticket.status === 'Ready Reopen' ? "bg-rose-500/10 border-rose-500/20 text-rose-600" :
                            ticket.status === 'Ready for QA' ? "bg-purple-500/10 border-purple-500/20 text-purple-600" :
                            ticket.status === 'QA' ? "bg-sky-500/10 border-sky-500/20 text-sky-600" :
                            "bg-slate-50 border-slate-200 text-slate-500"
                          )}>
                            {ticket.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No issues matched the query and search string.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

      {/* Ticket Details Drawer/Modal */}
      <IssueDetailModal
        isOpen={!!selectedTicketUuid}
        onClose={() => {
          setSelectedTicketUuid(null);
          // Refresh report data on modal close to maintain visual sync
          fetchReportData(false);
        }}
        issueUuid={selectedTicketUuid || ''}
      />

    </div>
  );
};

// Simple helper to avoid decimals on exact rates
function roundValue(val: number): number {
  return Math.round(val * 10) / 10;
}
