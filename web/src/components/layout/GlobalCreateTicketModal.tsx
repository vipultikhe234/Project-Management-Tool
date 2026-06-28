import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Sparkles, FolderKanban, Plus } from 'lucide-react';
import api from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

interface Project {
  uuid: string;
  key: string;
  name: string;
  allowed_types?: string[];
}

interface ProjectMember {
  uuid: string;
  name: string;
  avatar: string;
  role?: {
    id?: number;
    name?: string;
    slug?: string;
  };
}

interface Ticket {
  uuid: string;
  key: string;
  title: string;
}

interface GlobalCreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectUuid?: string;
  defaultStatus?: string;
  defaultSprintUuid?: string;
}

export const GlobalCreateTicketModal: React.FC<GlobalCreateTicketModalProps> = ({ isOpen, onClose, defaultProjectUuid, defaultStatus, defaultSprintUuid }) => {
  const { projects, sprints: contextSprints, tickets: contextTickets, refreshWorkspaceData } = useWorkspace();
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // Project-specific resources
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [epics, setEpics] = useState<Ticket[]>([]);
  const [parentIssues, setParentIssues] = useState<Ticket[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);

  // Form State
  const [type, setType] = useState('Task');
  const [status, setStatus] = useState('To Do');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [storyPoints, setStoryPoints] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeUuid, setAssigneeUuid] = useState('');
  const [epicUuid, setEpicUuid] = useState('');
  const [sprintUuid, setSprintUuid] = useState('');
  const [parentUuid, setParentUuid] = useState('');
  const [createAnother, setCreateAnother] = useState(false);

  // Sync defaultSprintUuid when it changes or when modal opens
  useEffect(() => {
    if (isOpen) {
      setSprintUuid(defaultSprintUuid || '');
    }
  }, [isOpen, defaultSprintUuid]);

  // Feedback State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Get active organization from localStorage
  const userString = localStorage.getItem('user');
  const loggedInUser = userString ? JSON.parse(userString) : null;
  const orgUuid = localStorage.getItem('selected_org_uuid') || loggedInUser?.organizations?.[0]?.uuid || '';

  // When projects are loaded, sync selected project if none selected
  useEffect(() => {
    if (isOpen && projects.length > 0 && !selectedProject) {
      const match = defaultProjectUuid ? projects.find((p: any) => p.uuid === defaultProjectUuid) : null;
      setSelectedProject(match || projects[0]);
    }
  }, [isOpen, projects, defaultProjectUuid, selectedProject]);

  // When defaultStatus changes, sync form state
  useEffect(() => {
    if (isOpen && defaultStatus) {
      setStatus(defaultStatus);
    } else if (isOpen) {
      setStatus('To Do');
    }
  }, [isOpen, defaultStatus]);

  useEffect(() => {
    if (selectedProject) {
      // Reset form variables dependent on project
      setAssigneeUuid('');
      setEpicUuid('');
      setSprintUuid(defaultSprintUuid || '');
      setParentUuid('');

      // Load allowed types and default to first allowed type
      const allowed = selectedProject.allowed_types || ['Story', 'Task', 'Bug', 'Epic', 'Subtask', 'Spike'];
      if (!allowed.includes(type)) {
        setType(allowed[0] || 'Task');
      }

      // Populate resources from context directly!
      setMembers(selectedProject.members || []);
      setEpics(contextTickets.filter((t: any) => t.project?.uuid === selectedProject.uuid && t.type === 'Epic') as any);
      setParentIssues(contextTickets.filter((t: any) => t.project?.uuid === selectedProject.uuid) as any);
      setSprints(contextSprints.filter((s: any) =>
        s.project_uuid === selectedProject.uuid ||
        selectedProject.boards?.some((b: any) => b.uuid === s.board_uuid)
      ));
    }
  }, [selectedProject, contextTickets, contextSprints]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const payload: any = {
        project_uuid: selectedProject.uuid,
        type,
        status,
        title,
        description: description || null,
        priority,
        story_points: storyPoints ? parseInt(storyPoints) : null,
        start_date: startDate || null,
        due_date: dueDate || null,
        assignee_uuid: assigneeUuid || null,
        epic_uuid: epicUuid || null,
        sprint_uuid: sprintUuid || null,
        parent_uuid: parentUuid || null
      };

      await api.post('/tickets', payload);

      setSuccessMsg(`Ticket "${title}" created successfully!`);

      // Reset form variables
      setTitle('');
      setDescription('');
      setStoryPoints('');
      setStartDate('');
      setDueDate('');
      setEpicUuid('');
      setSprintUuid('');
      setParentUuid('');

      if (!createAnother) {
        setTimeout(() => {
          onClose();
          window.location.reload(); // Reload current view to show new ticket
        }, 1000);
      } else {
        refreshWorkspaceData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create ticket. Please check input parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allowedTypes = selectedProject?.allowed_types || ['Story', 'Task', 'Bug', 'Epic', 'Subtask', 'Spike'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Create Issue</h2>
              <p className="text-xs text-slate-400 font-medium">Create a new Epic, Story, Task, Bug, or Spike globally.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-none">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs py-3.5 px-4 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs py-3.5 px-4 rounded-xl flex items-center gap-2.5">
              <Sparkles className="w-4.5 h-4.5 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Project Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project *</label>
            <select
              value={selectedProject?.uuid || ''}
              onChange={(e) => {
                const proj = projects.find(p => p.uuid === e.target.value);
                if (proj) setSelectedProject(proj);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
              required
            >
              {projects.map(p => (
                <option key={p.uuid} value={p.uuid}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Work Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                required
              >
                {allowedTypes.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                required
              >
                <option value="To Do">To Do</option>
                <option value="Ready Reopen">Ready Reopen</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review ( CR )">In Review ( CR )</option>
                <option value="Ready for QA">Ready for QA</option>
                <option value="QA">QA</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Summary *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Develop new registration API endpoint"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope, objectives, and acceptance criteria of this task..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                required
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Story Points */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Story Points</label>
              <input
                type="number"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="e.g. 5"
                min={0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* From Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Date (Due Date)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assignee</label>
              <select
                value={assigneeUuid}
                onChange={(e) => setAssigneeUuid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
              >
                <option value="">Unassigned</option>
                {(() => {
                  const filteredMembers = members.filter(m => m.role?.id === 3 || m.role?.slug === 'org_user');
                  const me = filteredMembers.find(m => m.uuid === loggedInUser?.uuid);
                  const others = filteredMembers.filter(m => m.uuid !== loggedInUser?.uuid);
                  return (
                    <>
                      {me && (
                        <option key={me.uuid} value={me.uuid}>
                          {me.name} (me)
                        </option>
                      )}
                      {others.map(m => (
                        <option key={m.uuid} value={m.uuid}>
                          {m.name}
                        </option>
                      ))}
                    </>
                  );
                })()}
              </select>
            </div>

            {/* Parent Ticket (for subtasks/links) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Issue</label>
              <select
                value={parentUuid}
                onChange={(e) => setParentUuid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
              >
                <option value="">None</option>
                {parentIssues.map(p => (
                  <option key={p.uuid} value={p.uuid}>{p.key} - {p.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Linked Epic & Sprint (Only visible if the current work type is not Epic) */}
          {type !== 'Epic' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Linked Epic</label>
                <select
                  value={epicUuid}
                  onChange={(e) => setEpicUuid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="">No Epic (Standalone)</option>
                  {epics.map(epic => (
                    <option key={epic.uuid} value={epic.uuid}>{epic.key} - {epic.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sprint</label>
                <select
                  value={sprintUuid}
                  onChange={(e) => setSprintUuid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                >
                  <option value="">None (Backlog)</option>
                  {sprints.map((s: any) => (
                    <option key={s.uuid} value={s.uuid}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-2xl">
          <label className="flex items-center gap-2 text-xs text-slate-600 font-bold select-none cursor-pointer">
            <input
              type="checkbox"
              checked={createAnother}
              onChange={(e) => setCreateAnother(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
            />
            Create another
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedProject}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
