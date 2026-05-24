import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Rocket, 
  Download, 
  Plus, 
  UserPlus,
  Link2,
  CheckSquare,
  Bug,
  Star,
  GripHorizontal,
  X,
  Loader2,
  Building2,
  FolderDot,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { Priority } from '../types';
import { GlobalCreateTicketModal } from '../components/layout/GlobalCreateTicketModal';
import { IssueDetailModal } from '../components/layout/IssueDetailModal';
import { CreateSprintModal } from '../components/layout/CreateSprintModal';

interface TicketType {
  uuid: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number | null;
  type: string;
  epic?: {
    uuid: string;
    key: string;
    title: string;
  } | null;
  sprint?: {
    uuid: string;
    name: string;
    status: string;
  } | null;
  assignee: {
    uuid: string;
    name: string;
    avatar: string;
  } | null;
}

interface SprintType {
  uuid: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  goal: string | null;
  status: string;
  tickets_count: number;
}

interface ProjectType {
  uuid: string;
  key: string;
  name: string;
  allowed_types?: string[];
  boards: Array<{ uuid: string; name: string }>;
  members?: Array<{ uuid: string; name: string; avatar: string }>;
}

export const Backlog: React.FC = () => {
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectType | null>(null);
  const [sprints, setSprints] = useState<SprintType[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSprintUuid, setSelectedSprintUuid] = useState<string | undefined>(undefined);
  const [selectedAssigneeUuids, setSelectedAssigneeUuids] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMoreUsersDropdown, setShowMoreUsersDropdown] = useState(false);
  const [selectedIssueUuid, setSelectedIssueUuid] = useState<string | null>(null);
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [draggedTicketUuid, setDraggedTicketUuid] = useState<string | null>(null);

  // Get user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Guest' };
  const orgUuid = localStorage.getItem('selected_org_uuid') || user.organizations?.[0]?.uuid;

  useEffect(() => {
    if (orgUuid) {
      fetchProjects();
    }
  }, [orgUuid]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects', {
        params: { organization_uuid: orgUuid }
      });
      const fetchedProjects = response.data.data;
      setProjects(fetchedProjects);
      if (fetchedProjects.length > 0) {
        if (fetchedProjects.length > 1) {
          const allMembers = Array.from(
            new Map(fetchedProjects.flatMap((p: any) => p.members || []).map((m: any) => [m.uuid, m])).values()
          );
          setActiveProject({
            uuid: 'all',
            key: 'ALL',
            name: 'All Projects',
            boards: [],
            members: allMembers
          } as any);
        } else {
          setActiveProject(fetchedProjects[0]);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchProjectData();
    }
  }, [activeProject]);

  const fetchProjectData = async () => {
    if (!activeProject) return;
    setTicketsLoading(true);
    try {
      const boardUuid = activeProject.boards?.[0]?.uuid;
      
      const [ticketsRes, sprintsRes, epicsRes] = await Promise.all([
        api.get('/tickets', { params: { project_uuid: activeProject.uuid, organization_uuid: orgUuid, per_page: 500 } }),
        api.get('/sprints', { 
          params: { 
            board_uuid: boardUuid, 
            project_uuid: activeProject.uuid, 
            organization_uuid: orgUuid 
          } 
        }),
        api.get('/tickets', { params: { project_uuid: activeProject.uuid, type: 'Epic', organization_uuid: orgUuid, per_page: 500 } })
      ]);

      setTickets(ticketsRes.data.data);
      setSprints(sprintsRes.data.data);
      setEpics(epicsRes.data.data);
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setTicketsLoading(false);
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (t.type === 'Epic') return false;
    if (selectedAssigneeUuids.length > 0 && (!t.assignee || !selectedAssigneeUuids.includes(t.assignee.uuid))) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchKey = t.key.toLowerCase().includes(q);
      if (!matchTitle && !matchKey) return false;
    }
    return true;
  });

  const backlogTickets = filteredTickets.filter(t => !t.sprint);
  const backlogTodoCount = backlogTickets.filter(t => t.status === 'To Do').length;
  const backlogInProgressCount = backlogTickets.filter(t => t.status !== 'To Do' && t.status !== 'Done').length;
  const backlogDoneCount = backlogTickets.filter(t => t.status === 'Done').length;

  const handleStartSprint = async (sprintUuid: string) => {
    try {
      await api.put(`/sprints/${sprintUuid}/start`);
      fetchProjectData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprintUuid: string) => {
    try {
      await api.put(`/sprints/${sprintUuid}/complete`);
      fetchProjectData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete sprint');
    }
  };

  const handleCreateSprint = async () => {
    if (!activeProject) return;
    const boardUuid = activeProject.boards?.[0]?.uuid;
    if (!boardUuid) return;

    try {
      const name = `Sprint ${sprints.length + 1}`;
      await api.post('/sprints', {
        board_uuid: boardUuid,
        name
      });
      fetchProjectData();
    } catch (err) {
      alert('Failed to create sprint');
    }
  };

  const handleDragStart = (e: React.DragEvent, uuid: string) => {
    setDraggedTicketUuid(uuid);
    e.dataTransfer.setData('text/plain', uuid);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetSprintUuid: string | null) => {
    e.preventDefault();
    const ticketUuid = e.dataTransfer.getData('text/plain') || draggedTicketUuid;
    if (!ticketUuid) return;

    const ticket = tickets.find(t => t.uuid === ticketUuid);
    if (!ticket) return;

    // Optimistically update sprint in UI
    setTickets(prev => 
      prev.map(t => 
        t.uuid === ticketUuid 
          ? { 
              ...t, 
              sprint: targetSprintUuid 
                ? { uuid: targetSprintUuid, name: sprints.find(s => s.uuid === targetSprintUuid)?.name || '', status: 'future' }
                : null 
            } 
          : t
      )
    );

    try {
      await api.put(`/tickets/${ticketUuid}`, {
        sprint_uuid: targetSprintUuid,
        project_uuid: activeProject?.uuid
      });
      fetchProjectData();
    } catch (err) {
      console.error('Failed to update sprint on drop', err);
      alert('Failed to move ticket to sprint');
      fetchProjectData();
    } finally {
      setDraggedTicketUuid(null);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical': return <div className="text-rose-600 font-bold">⇈</div>;
      case 'High': return <div className="text-rose-500 font-bold">↑</div>;
      case 'Medium': return <div className="text-indigo-500 font-bold">=</div>;
      default: return <div className="text-slate-400 font-bold">↓</div>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading backlog workspace...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <FolderDot className="w-8 h-8 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-bold">No projects found</p>
          <p className="text-slate-500 text-sm mb-4">Please create a project to start using the Backlog.</p>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow"
          >
            Go to Projects Page
          </Link>
        </div>
      </div>
    );
  }

  const activeSprint = sprints.find(s => s.status === 'active');
  const futureSprints = sprints.filter(s => s.status === 'future');

  const activeSprintTickets = tickets.filter(t => t.status !== 'Done' && activeSprint && tickets.some(item => item.uuid === t.uuid)); // For simplicity, list active tickets or group by sprint inside render.
  
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header and Project Switcher */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Backlog Dashboard</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <select 
              value={activeProject?.uuid}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  const allMembers = Array.from(
                    new Map(projects.flatMap(p => p.members || []).map(m => [m.uuid, m])).values()
                  );
                  setActiveProject({
                    uuid: 'all',
                    key: 'ALL',
                    name: 'All Projects',
                    boards: [],
                    members: allMembers
                  } as any);
                } else {
                  const found = projects.find(p => p.uuid === e.target.value);
                  if (found) setActiveProject(found);
                }
              }}
              className="bg-transparent text-indigo-600 font-bold text-xs select-none outline-none cursor-pointer border-none"
            >
              {projects.length > 1 && <option value="all">All Projects</option>}
              {projects.map(p => (
                <option key={p.uuid} value={p.uuid}>{p.name}</option>
              ))}
            </select>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 leading-none">Product Backlog</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowCreateSprintModal(true)}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Create Sprint
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4" /> Create Ticket
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-500">
          <Filter className="w-4 h-4" />
          <span>Filter:</span>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search backlog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700"
          />
        </div>

        {/* User Filter */}
        <div className="flex items-center -space-x-1 ml-2">
          {activeProject?.members?.slice(0, 5).map((member: any) => {
            const isSelected = selectedAssigneeUuids.includes(member.uuid);
            return (
              <button
                key={member.uuid}
                onClick={() => {
                  setSelectedAssigneeUuids(prev => 
                    prev.includes(member.uuid) 
                      ? prev.filter(id => id !== member.uuid) 
                      : [...prev, member.uuid]
                  );
                }}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all shrink-0 hover:scale-105 active:scale-95 flex items-center justify-center text-[10px] font-bold text-indigo-600 bg-indigo-50",
                  isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20 z-10 scale-105 bg-indigo-600 text-white" : "border-white hover:z-10"
                )}
                title={member.name}
              >
                {getInitials(member.name)}
              </button>
            );
          })}

          {activeProject?.members && activeProject.members.length > 5 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreUsersDropdown(!showMoreUsersDropdown)}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center text-[9px] font-black shrink-0 hover:scale-105 active:scale-95 border-white bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
                title="More assignees"
              >
                +{activeProject.members.length - 5}
              </button>
              {showMoreUsersDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreUsersDropdown(false)}></div>
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {activeProject.members.slice(5).map((member: any) => {
                      const isSelected = selectedAssigneeUuids.includes(member.uuid);
                      return (
                        <button
                          key={member.uuid}
                          onClick={() => {
                            setSelectedAssigneeUuids(prev => 
                              prev.includes(member.uuid) 
                                ? prev.filter(id => id !== member.uuid) 
                                : [...prev, member.uuid]
                            );
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 transition-colors",
                            isSelected ? "text-indigo-600 bg-indigo-50/50" : "text-slate-700"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0",
                            isSelected ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                          )}>
                            {getInitials(member.name)}
                          </div>
                          <span className="truncate">{member.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {(selectedAssigneeUuids.length > 0 || searchQuery) && (
          <button
            onClick={() => {
              setSelectedAssigneeUuids([]);
              setSearchQuery('');
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold ml-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sprints & Active Sprint Sections */}
      {ticketsLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Fetching board tickets...</p>
        </div>
      ) : (
        <>
          {sprints
            .filter(s => s.status !== 'completed')
            .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
            .map((sprint) => {
              const sprintTickets = filteredTickets.filter(t => t.sprint?.uuid === sprint.uuid);
              const isCurrent = sprint.status === 'active';
            
            const todoCount = sprintTickets.filter(t => t.status === 'To Do').length;
            const inProgressCount = sprintTickets.filter(t => t.status !== 'To Do' && t.status !== 'Done').length;
            const doneCount = sprintTickets.filter(t => t.status === 'Done').length;
            
            return (
              <section key={sprint.uuid} className="space-y-3">
                {/* Sprint Header Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <ChevronDown className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                    <span className="font-bold text-slate-800 text-sm">{sprint.name}</span>
                    <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      {sprint.start_date && sprint.end_date ? (
                        `${new Date(sprint.start_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - ${new Date(sprint.end_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`
                      ) : (
                        <span className="text-indigo-600 hover:underline cursor-pointer">Add dates</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">({sprintTickets.length} work items)</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold" title="To Do">{todoCount}</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold" title="In Progress">{inProgressCount}</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold" title="Done">{doneCount}</span>
                    </div>

                    {isCurrent ? (
                      <button 
                        onClick={() => handleCompleteSprint(sprint.uuid)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg active:scale-95 transition-all shadow-sm shrink-0"
                      >
                        Complete sprint
                      </button>
                    ) : sprint.status === 'future' ? (
                      <button 
                        onClick={() => handleStartSprint(sprint.uuid)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg active:scale-95 transition-all shadow-sm shrink-0"
                      >
                        Start sprint
                      </button>
                    ) : null}

                    <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sprint Tickets Container */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, sprint.uuid)}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-1 duration-150"
                >
                  {sprintTickets.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-semibold italic bg-slate-50/10 border-b border-slate-100">
                      Plan a sprint by dragging work items into it, or by dragging the sprint footer.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sprintTickets.map((ticket) => (
                        <div 
                          key={ticket.uuid} 
                          onClick={() => setSelectedIssueUuid(ticket.uuid)}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, ticket.uuid)}
                          className="flex justify-between items-center px-6 py-2.5 hover:bg-slate-50 transition-all cursor-pointer group border-l-2 border-l-transparent hover:border-l-indigo-600"
                        >
                          {/* Left aligned: grip, type, key, title, epic */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <GripHorizontal className="w-3.5 h-3.5 text-slate-300 cursor-grab shrink-0 hover:text-slate-500" />
                            
                            {/* Type Icon */}
                            <span className="shrink-0">
                              {ticket.type === 'Bug' ? (
                                <div className="w-4 h-4 rounded bg-rose-500 text-white flex items-center justify-center shadow-sm" title="Bug">
                                  <Bug className="w-2.5 h-2.5" />
                                </div>
                              ) : ticket.type === 'Story' ? (
                                <div className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center shadow-sm" title="Story">
                                  <Star className="w-2.5 h-2.5 fill-white text-white" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded bg-sky-500 text-white flex items-center justify-center shadow-sm" title={ticket.type}>
                                  <CheckSquare className="w-2.5 h-2.5" />
                                </div>
                              )}
                            </span>

                            {/* Key & Title */}
                            <div className="flex items-center gap-2 text-left min-w-0">
                              <span className="font-mono font-bold text-slate-400 text-xs shrink-0">{ticket.key}</span>
                              <span className="font-bold text-slate-700 truncate text-xs hover:text-indigo-600 hover:underline">{ticket.title}</span>
                            </div>

                            {/* Epic Tag */}
                            {ticket.epic && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/10 text-purple-600 border border-purple-200/30 uppercase tracking-wide shrink-0">
                                {ticket.epic.title}
                              </span>
                            )}
                          </div>

                          {/* Right aligned: status, estimate, priority, assignee */}
                          <div className="flex items-center gap-3 shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                            {/* Status Dropdown Pill */}
                            <select
                              value={ticket.status}
                              onChange={async (e) => {
                                try {
                                  await api.put(`/tickets/${ticket.uuid}`, {
                                    status: e.target.value,
                                    project_uuid: activeProject?.uuid
                                  });
                                  fetchProjectData();
                                } catch (err) {
                                  alert('Failed to update status');
                                }
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-none font-bold uppercase text-[9px] rounded px-2.5 py-1 flex items-center gap-1.5 focus:outline-none cursor-pointer tracking-wider"
                            >
                              <option value="To Do">To Do</option>
                              <option value="Ready Reopen">Ready Reopen</option>
                              <option value="In Progress">In Progress</option>
                              <option value="In Review ( CR )">In Review ( CR )</option>
                              <option value="Ready for QA">Ready for QA</option>
                              <option value="QA">QA</option>
                              <option value="Done">Done</option>
                            </select>

                            {/* Story Points estimate circle */}
                            <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shadow-sm" title="Story Points">
                              {ticket.story_points ?? '-'}
                            </span>

                            {/* Priority */}
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              {getPriorityIcon(ticket.priority)}
                            </div>

                            {/* Assignee Avatar */}
                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                              {ticket.assignee ? (
                                <div 
                                  className="w-6 h-6 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-indigo-600 shadow-sm" 
                                  title={ticket.assignee.name}
                                >
                                  {getInitials(ticket.assignee.name)}
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-400" title="Unassigned">
                                  -
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sprint Footer */}
                  <div className="px-6 py-2 bg-slate-50/20 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 select-none uppercase tracking-wider">
                    <span>{sprintTickets.length} of {sprintTickets.length} work items visible</span>
                    <span>Estimate: {sprintTickets.reduce((sum, t) => sum + (t.story_points || 0), 0)} story points</span>
                  </div>

                  {/* Inline Create Ticket/Issue */}
                  <button 
                    onClick={() => {
                      setSelectedSprintUuid(sprint.uuid);
                      setShowCreateModal(true);
                    }} 
                    className="w-full text-left px-6 py-3 text-xs text-slate-400 hover:text-indigo-600 hover:bg-slate-50/50 flex items-center gap-1.5 font-bold transition-all border-t border-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create issue
                  </button>
                </div>
              </section>
            );
          })}

          <section className="space-y-3 pt-6 border-t border-slate-200">
            {/* Backlog Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm transition-all hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <ChevronDown className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                <span className="font-bold text-slate-800 text-sm">Backlog</span>
                <span className="text-xs text-slate-400 font-medium">({backlogTickets.length} work items)</span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Status Badges */}
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold" title="To Do">{backlogTodoCount}</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold" title="In Progress">{backlogInProgressCount}</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold" title="Done">{backlogDoneCount}</span>
                </div>

                <button 
                  onClick={() => setShowCreateSprintModal(true)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg active:scale-95 transition-all shadow-sm shrink-0"
                >
                  Create sprint
                </button>
              </div>
            </div>

            {/* Backlog Tickets Container */}
            <div 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {backlogTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold italic bg-slate-50/10 border-b border-slate-100">
                  Your backlog is empty.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {backlogTickets.map((item) => (
                    <div 
                      key={item.uuid} 
                      onClick={() => setSelectedIssueUuid(item.uuid)}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, item.uuid)}
                      className="flex justify-between items-center px-6 py-2.5 hover:bg-slate-50 transition-all cursor-pointer group border-l-2 border-l-transparent hover:border-l-indigo-600"
                    >
                      {/* Left aligned: grip, type, key, title, epic */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <GripHorizontal className="w-3.5 h-3.5 text-slate-300 cursor-grab shrink-0 hover:text-slate-500" />
                        
                        {/* Type Icon */}
                        <span className="shrink-0">
                          {item.type === 'Bug' ? (
                            <div className="w-4 h-4 rounded bg-rose-500 text-white flex items-center justify-center shadow-sm" title="Bug">
                              <Bug className="w-2.5 h-2.5" />
                            </div>
                          ) : item.type === 'Story' ? (
                            <div className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center shadow-sm" title="Story">
                              <Star className="w-2.5 h-2.5 fill-white text-white" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded bg-sky-500 text-white flex items-center justify-center shadow-sm" title={item.type}>
                              <CheckSquare className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </span>

                        {/* Key & Title */}
                        <div className="flex items-center gap-2 text-left min-w-0">
                          <span className="font-mono font-bold text-slate-400 text-xs shrink-0">{item.key}</span>
                          <span className="font-bold text-slate-700 truncate text-xs hover:text-indigo-600 hover:underline">{item.title}</span>
                        </div>

                        {/* Epic Tag */}
                        {item.epic && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/10 text-purple-600 border border-purple-200/30 uppercase tracking-wide shrink-0">
                            {item.epic.title}
                          </span>
                        )}
                      </div>

                      {/* Right aligned: status, estimate, priority, assignee */}
                      <div className="flex items-center gap-3 shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                        {/* Status Dropdown Pill */}
                        <select
                          value={item.status}
                          onChange={async (e) => {
                            try {
                              await api.put(`/tickets/${item.uuid}`, {
                                status: e.target.value,
                                project_uuid: activeProject?.uuid
                              });
                              fetchProjectData();
                            } catch (err) {
                              alert('Failed to update status');
                            }
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-none font-bold uppercase text-[9px] rounded px-2.5 py-1 flex items-center gap-1.5 focus:outline-none cursor-pointer tracking-wider"
                        >
                          <option value="To Do">To Do</option>
                          <option value="Ready Reopen">Ready Reopen</option>
                          <option value="In Progress">In Progress</option>
                          <option value="In Review ( CR )">In Review ( CR )</option>
                          <option value="Ready for QA">Ready for QA</option>
                          <option value="QA">QA</option>
                          <option value="Done">Done</option>
                        </select>

                        {/* Story Points estimate circle */}
                        <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shadow-sm" title="Story Points">
                          {item.story_points ?? '-'}
                        </span>

                        {/* Priority */}
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          {getPriorityIcon(item.priority)}
                        </div>

                        {/* Assignee Avatar */}
                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                          {item.assignee ? (
                            <div 
                              className="w-6 h-6 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-indigo-600 shadow-sm" 
                              title={item.assignee.name}
                            >
                              {getInitials(item.assignee.name)}
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-400" title="Unassigned">
                              -
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Backlog Footer */}
              <div className="px-6 py-2 bg-slate-50/20 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 select-none uppercase tracking-wider">
                <span>{backlogTickets.length} of {backlogTickets.length} work items visible</span>
                <span>Estimate: {backlogTickets.reduce((sum, t) => sum + (t.story_points || 0), 0)} story points</span>
              </div>

              {/* Inline Create Ticket/Issue */}
              <button 
                onClick={() => {
                  setSelectedSprintUuid(undefined);
                  setShowCreateModal(true);
                }} 
                className="w-full text-left px-6 py-3 text-xs text-slate-400 hover:text-indigo-600 hover:bg-slate-50/50 flex items-center gap-1.5 font-bold transition-all border-t border-slate-100"
              >
                <Plus className="w-3.5 h-3.5" /> Create issue
              </button>
            </div>
          </section>
        </>
      )}

      {/* Create Ticket Modal */}
      <GlobalCreateTicketModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedSprintUuid(undefined);
          fetchProjectData();
        }}
        defaultProjectUuid={activeProject?.uuid}
        defaultSprintUuid={selectedSprintUuid}
      />

      {/* Issue Detail Modal */}
      <IssueDetailModal
        isOpen={!!selectedIssueUuid}
        onClose={() => {
          setSelectedIssueUuid(null);
          fetchProjectData();
        }}
        issueUuid={selectedIssueUuid || ''}
      />

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={showCreateSprintModal}
        onClose={() => setShowCreateSprintModal(false)}
        onSprintCreated={fetchProjectData}
        activeProjectUuid={activeProject?.uuid || ''}
        defaultSprintName={`Sprint ${sprints.length + 1}`}
        projects={projects as any}
      />
    </div>
  );
};
