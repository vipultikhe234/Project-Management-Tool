import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MoreHorizontal, 
  GripVertical, 
  MessageSquare, 
  Share2,
  LayoutGrid,
  Filter,
  ArrowUp,
  ArrowDown,
  Equal,
  ChevronsUp,
  ChevronRight as ChevronRightIcon,
  Kanban,
  Loader2,
  FolderDot,
  Calendar,
  GitBranch,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { Status, Priority } from '../types';
import { GlobalCreateTicketModal } from '../components/layout/GlobalCreateTicketModal';
import { IssueDetailModal } from '../components/layout/IssueDetailModal';
import { useWorkspace } from '../context/WorkspaceContext';

const COLUMNS: string[] = ['To Do', 'Ready Reopen', 'In Progress', 'In Review ( CR )', 'Ready for QA', 'QA', 'Done'];

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface TicketType {
  uuid: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  story_points: number | null;
  due_date?: string | null;
  parent?: {
    uuid: string;
    key: string;
    title: string;
  } | null;
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
  project?: {
    uuid: string;
    key: string;
    name: string;
  } | null;
}

interface ProjectType {
  uuid: string;
  key: string;
  name: string;
  boards: Array<{ uuid: string; name: string }>;
  members?: Array<{ uuid: string; name: string; avatar: string }>;
}

export const KanbanBoard: React.FC = () => {
  const {
    projects,
    activeProject,
    setActiveProject,
    sprints,
    tickets,
    loading,
    refreshWorkspaceData
  } = useWorkspace();

  const [localTickets, setLocalTickets] = useState<TicketType[]>([]);
  const [draggedTicketUuid, setDraggedTicketUuid] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState<string>('To Do');
  const [selectedAssigneeUuids, setSelectedAssigneeUuids] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMoreUsersDropdown, setShowMoreUsersDropdown] = useState(false);
  const [selectedIssueUuid, setSelectedIssueUuid] = useState<string | null>(null);

  // Sync local tickets state when workspace tickets change
  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  // Filter sprints for the active project
  const projectSprints = sprints.filter(s => 
    activeProject?.uuid === 'all' || 
    s.project_uuid === activeProject?.uuid || 
    activeProject?.boards?.some((b: any) => b.uuid === s.board_uuid)
  );

  const activeSprint = projectSprints.find(s => s.status === 'active');
  const hasActiveSprint = activeProject?.uuid === 'all' || !!activeSprint;

  const baseBoardTickets = localTickets.filter(t => {
    if (t.type === 'Epic') return false;
    if (activeProject?.uuid !== 'all' && t.project?.uuid !== activeProject?.uuid) {
      return false;
    }
    if (activeProject?.uuid !== 'all') {
      if (!activeSprint || !t.sprint || t.sprint.uuid !== activeSprint.uuid) {
        return false;
      }
    } else {
      if (!t.sprint || t.sprint.status !== 'active') {
        return false;
      }
    }
    return true;
  });

  // Get unique assignees who have one or more tickets in baseBoardTickets
  const boardAssignees = React.useMemo(() => {
    const assigneesMap = new Map<string, { uuid: string; name: string; avatar: string }>();
    baseBoardTickets.forEach(t => {
      if (t.assignee) {
        assigneesMap.set(t.assignee.uuid, t.assignee);
      }
    });
    return Array.from(assigneesMap.values());
  }, [baseBoardTickets]);

  const filteredTickets = localTickets.filter(t => {
    if (t.type === 'Epic') return false;
    // Filter by project if not 'all'
    if (activeProject?.uuid !== 'all' && t.project?.uuid !== activeProject?.uuid) {
      return false;
    }

    // 1. Filter by Active Sprint
    if (activeProject?.uuid !== 'all') {
      if (!activeSprint || !t.sprint || t.sprint.uuid !== activeSprint.uuid) {
        return false;
      }
    } else {
      // For "All Projects", show tickets from any active sprint
      if (!t.sprint || t.sprint.status !== 'active') {
        return false;
      }
    }

    // 2. Filter by assignee
    if (selectedAssigneeUuids.length > 0 && (!t.assignee || !selectedAssigneeUuids.includes(t.assignee.uuid))) {
      return false;
    }
    
    // 3. Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchKey = t.key.toLowerCase().includes(q);
      if (!matchTitle && !matchKey) return false;
    }
    return true;
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical': return <ChevronsUp className="w-4 h-4 text-rose-600 animate-pulse" />;
      case 'High': return <ArrowUp className="w-4 h-4 text-rose-600" />;
      case 'Medium': return <Equal className="w-4 h-4 text-indigo-500" />;
      default: return <ArrowDown className="w-4 h-4 text-slate-400" />;
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, uuid: string) => {
    setDraggedTicketUuid(uuid);
    e.dataTransfer.setData('text/plain', uuid);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // necessary to allow drop
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const ticketUuid = e.dataTransfer.getData('text/plain') || draggedTicketUuid;
    if (!ticketUuid) return;

    // Optimistically update status in UI first
    setLocalTickets(prev => prev.map(t => t.uuid === ticketUuid ? { ...t, status: targetStatus } : t));

    try {
      await api.put(`/tickets/${ticketUuid}`, {
        status: targetStatus,
        project_uuid: activeProject?.uuid
      });
      // Refresh in background
      refreshWorkspaceData();
    } catch (err) {
      console.error('Failed to update status on drop', err);
      // Revert if API fail by resetting from context
      setLocalTickets(tickets);
    } finally {
      setDraggedTicketUuid(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading agile boards...</p>
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
          <p className="text-slate-500 text-sm mb-4">Please create a project to start using the Board.</p>
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

  return (
    <div className="w-full animate-in fade-in duration-500 pb-10">
      {/* Combined Header & Filters Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-5">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search board..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* User Filter */}
          <div className="flex items-center -space-x-1.5 shrink-0 ml-1">
            {boardAssignees.slice(0, 5).map((member: any) => {
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

            {boardAssignees.length > 5 && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreUsersDropdown(!showMoreUsersDropdown)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center text-[9px] font-black shrink-0 hover:scale-105 active:scale-95 border-white bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                  title="More assignees"
                >
                  +{boardAssignees.length - 5}
                </button>
                {showMoreUsersDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreUsersDropdown(false)}></div>
                    <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {boardAssignees.slice(5).map((member: any) => {
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
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline shrink-0 ml-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* View Modes */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto bg-slate-100 p-1 rounded-xl border border-slate-200/50">
          <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"><LayoutGrid className="w-4 h-4" /></button>
          <button className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm transition-all"><Kanban className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Kanban Grid */}
      {!hasActiveSprint ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-2xl max-w-2xl mx-auto shadow-sm animate-in fade-in">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-indigo-600 shadow-inner">
            <Kanban className="w-8 h-8 animate-pulse" />
          </div>
          <div className="text-center space-y-2 max-w-md px-6">
            <h3 className="text-slate-900 font-extrabold text-lg">No active sprint</h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              There is no active sprint running for this project. Go to the backlog page, create or plan a sprint, and click "Start Sprint" to begin tracking work on the board.
            </p>
            <div className="pt-4">
              <Link
                to="/backlog"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow hover:scale-105 active:scale-95 duration-200"
              >
                Go to Backlog
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-10 scrollbar-premium snap-x snap-mandatory">
          {COLUMNS.map((col) => {
            const columnTickets = filteredTickets.filter(t => t.status.toLowerCase() === col.toLowerCase());
            
            return (
              <div 
                key={col} 
                className="flex-1 min-w-[280px] sm:min-w-[320px] flex flex-col gap-4 bg-slate-50/50 p-3 rounded-2xl border border-dashed border-slate-200 snap-center animate-in fade-in duration-300"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">{col}</span>
                    {col.toLowerCase() === 'done' ? (
                      <span className="text-emerald-600 font-bold text-xs" title="Done column">✓</span>
                    ) : columnTickets.length > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-500">
                        {columnTickets.length}
                      </span>
                    ) : null}
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 p-1 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Task List */}
                <div className="flex flex-col gap-4 min-h-[300px]">
                  {columnTickets.map((issue) => (
                    <div 
                      key={issue.uuid}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, issue.uuid)}
                      className={cn(
                        "bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab group relative overflow-hidden active:cursor-grabbing",
                        col === 'In Progress' && "ring-1 ring-indigo-100"
                      )}
                    >
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 text-slate-200" />
                      </div>
                      
                      {/* Title on top */}
                      <h4 className="text-sm font-bold text-slate-800 leading-snug mb-2 group-hover:text-indigo-600 transition-colors">
                        <button
                          onClick={() => setSelectedIssueUuid(issue.uuid)}
                          className="text-left font-bold w-full hover:underline focus:outline-none"
                        >
                          {issue.title}
                        </button>
                      </h4>

                      {/* Due Date (Calendar Icon + Date) */}
                      {issue.due_date && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/60 rounded px-2 py-0.5 w-fit mb-3 font-semibold">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(issue.due_date)}</span>
                        </div>
                      )}

                      {/* Epic & Sprint Tags */}
                      {(issue.epic || issue.sprint) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {issue.epic && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-wide">
                              {issue.epic.title}
                            </span>
                          )}
                          {issue.sprint && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                              {issue.sprint.name}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Bottom Meta (Type Icon, Key, SP, Subtask/Parent icon, and Assignee) */}
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-4 h-4 rounded flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm",
                            issue.type === 'Bug' ? "bg-rose-500" :
                            issue.type === 'Story' ? "bg-emerald-500" :
                            issue.type === 'Epic' ? "bg-purple-500" :
                            issue.type === 'Spike' ? "bg-amber-500" :
                            "bg-indigo-500"
                          )}>
                            {issue.type[0]}
                          </span>
                          <button
                            onClick={() => setSelectedIssueUuid(issue.uuid)}
                            className="font-mono font-bold text-slate-400 hover:text-indigo-600 hover:underline text-[10px] focus:outline-none"
                          >
                            {issue.key}
                          </button>
                          {issue.story_points && (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">{issue.story_points} SP</span>
                          )}
                          {issue.parent && (
                            <span title={`Subtask of ${issue.parent.key}`}>
                              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          )}
                        </div>
                        <div className="flex -space-x-1.5">
                          {issue.assignee ? (
                            <div 
                              className="w-6 h-6 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[9px] font-bold text-indigo-600 shadow-sm" 
                              title={issue.assignee.name}
                            >
                              {getInitials(issue.assignee.name)}
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-slate-400" title="Unassigned">U</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Column-level quick create */}
                  {col === 'To Do' && (
                    <button
                      onClick={() => {
                        setCreateModalStatus(col);
                        setCreateModalOpen(true);
                      }}
                      className="py-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100/50 transition-all rounded-xl font-bold text-xs uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Create Ticket Modal */}
      <GlobalCreateTicketModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          refreshWorkspaceData();
        }}
        defaultProjectUuid={activeProject?.uuid}
        defaultStatus={createModalStatus}
      />

      {/* Issue Detail Modal */}
      <IssueDetailModal
        isOpen={!!selectedIssueUuid}
        onClose={() => {
          setSelectedIssueUuid(null);
          refreshWorkspaceData();
        }}
        issueUuid={selectedIssueUuid || ''}
      />
    </div>
  );
};
