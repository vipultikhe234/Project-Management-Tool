import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Users, 
  Plus, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  FileCheck2,
  BookOpen
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface Project {
  uuid: string;
  key: string;
  name: string;
  description: string;
  avatar: string | null;
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
  updated_at: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [workedOnTickets, setWorkedOnTickets] = useState<Ticket[]>([]);
  const [starredTickets, setStarredTickets] = useState<Ticket[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'worked' | 'starred'>('assigned');
  const [analytics, setAnalytics] = useState<any>(null);

  // Get user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Guest', uuid: '' };
  const orgUuid = localStorage.getItem('selected_org_uuid') || user.organizations?.[0]?.uuid || '';

  useEffect(() => {
    fetchDashboardData();
  }, [orgUuid]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Projects
      const projectsResponse = await api.get('/projects', {
        params: { organization_uuid: orgUuid }
      });
      const fetchedProjects = projectsResponse.data.data;
      setProjects(fetchedProjects);

      // 2. Fetch Tickets Assigned to Me
      const assignedResponse = await api.get('/tickets', {
        params: { assignee_uuid: user.uuid }
      });
      setAssignedTickets(assignedResponse.data.data);

      // 3. Fetch Starred Tickets
      const starredResponse = await api.get('/tickets/starred');
      setStarredTickets(starredResponse.data.data);

      // 4. Fetch Recently Viewed Tickets
      const recentResponse = await api.get('/tickets/recent');
      setWorkedOnTickets(recentResponse.data.data);

      // 5. Fetch general workspace analytics & activities
      const analyticsResponse = await api.get('/dashboard-analytics', {
        params: orgUuid ? { organization_uuid: orgUuid } : {}
      });
      setAnalytics(analyticsResponse.data.data);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
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

  const getTicketTypeIcon = (type: string) => {
    switch (type) {
      case 'Bug': return <span className="text-rose-500 text-xs font-bold font-mono bg-rose-500/10 px-1.5 py-0.5 rounded">BUG</span>;
      case 'Story': return <span className="text-emerald-500 text-xs font-bold font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">STRY</span>;
      case 'Epic': return <span className="text-purple-500 text-xs font-bold font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">EPIC</span>;
      case 'Spike': return <span className="text-amber-500 text-xs font-bold font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">SPK</span>;
      default: return <span className="text-indigo-500 text-xs font-bold font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">TSK</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading your personalized dashboard...</p>
      </div>
    );
  }

  const activeIssues = 
    activeTab === 'assigned' ? assignedTickets : 
    activeTab === 'worked' ? workedOnTickets : 
    starredTickets;

  const stats = analytics?.stats || {
    total_projects: 0,
    open_tickets: 0,
    closed_tickets: 0,
    active_sprints: 0
  };

  const activities = analytics?.recent_activities || [];

  return (
    <div className="w-full space-y-8 text-slate-800">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Your Work
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Personalized workspace home summarizing your active sprints, tickets, and recently visited projects.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/projects"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Manage Projects
          </Link>
        </div>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-2">My Open Work</span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold text-slate-900">{assignedTickets.filter(t => t.status !== 'Done').length}</h2>
            <span className="text-xs text-slate-500">tickets</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-500" /> Active issues on board</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-2">Completed Issues</span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold text-slate-900">{workedOnTickets.filter(t => t.status === 'Done').length}</h2>
            <span className="text-xs text-slate-500">tickets</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Finished by you</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-2">Workspace Open Work</span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold text-slate-900">{stats.open_tickets}</h2>
            <span className="text-xs text-slate-500">issues</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1"><ClipboardList className="w-3 h-3 text-rose-500" /> Total team backlog</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-2">Active Workspace Sprints</span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold text-slate-900">{stats.active_sprints}</h2>
            <span className="text-xs text-slate-500">running</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-500" /> Sprints in execution</p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Side: Recent Projects & Assigned Tickets Tabbed Panel */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Recent Projects Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-500" /> Recent Projects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 4).map((project) => (
                <div 
                  key={project.uuid} 
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all group shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {project.key}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">{project.name}</h4>
                        <span className="text-[9px] text-slate-400 font-mono block">UUID: {project.uuid.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <Link
                      to="/board"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      Agile Board <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <Link
                      to="/backlog"
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      Backlog
                    </Link>
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <div className="col-span-2 py-8 text-center bg-white border border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400 italic">No workspace projects registered.</p>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Issues Tabbed panel */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 gap-4">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('assigned')}
                  className={cn(
                    "pb-3.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-all",
                    activeTab === 'assigned' 
                      ? "border-indigo-600 text-slate-900" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Assigned to me ({assignedTickets.length})
                </button>
                <button
                  onClick={() => setActiveTab('worked')}
                  className={cn(
                    "pb-3.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-all",
                    activeTab === 'worked' 
                      ? "border-indigo-600 text-slate-900" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Worked on ({workedOnTickets.length})
                </button>
                <button
                  onClick={() => setActiveTab('starred')}
                  className={cn(
                    "pb-3.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-all",
                    activeTab === 'starred' 
                      ? "border-indigo-600 text-slate-900" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Reported by me ({starredTickets.length})
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {activeIssues.length === 0 ? (
                <div className="py-12 text-center bg-white border border-slate-200 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 italic">No tickets found in this tab.</p>
                </div>
              ) : (
                activeIssues.slice(0, 10).map((ticket) => (
                  <div 
                    key={ticket.uuid}
                    onClick={() => navigate(`/issues/${ticket.uuid}`)}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 group-hover:text-indigo-600 group-hover:border-indigo-500/30 transition-colors">
                        {ticket.key}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate max-w-md sm:max-w-xl">
                          {ticket.title}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">
                          Project: {ticket.project?.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 pl-2">
                      <div className="flex items-center gap-2">
                        {getTicketTypeIcon(ticket.type)}
                        {getPriorityIcon(ticket.priority)}
                      </div>
                      
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Workspace Activity Stream */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Activity Feed
            </h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">No recent workspace events.</p>
              ) : (
                activities.slice(0, 8).map((activity: any) => (
                  <div 
                    key={activity.id} 
                    className="flex gap-3 text-xs leading-normal p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-600 font-sans">
                        <span className="font-bold text-slate-800">{activity.user?.name || 'Someone'}</span> {activity.action}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">{activity.target}</p>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mt-1">{activity.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
