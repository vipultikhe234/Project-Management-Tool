import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Link2, 
  Share2, 
  MoreHorizontal, 
  Edit3,
  Rocket,
  Plus, 
  Calendar,
  Loader2,
  Trash2,
  Star,
  X,
  Maximize2,
  Lock,
  Eye,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return '';
  let normalizedStr = dateStr;
  if (!normalizedStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalizedStr)) {
    if (normalizedStr.includes(' ')) {
      normalizedStr = normalizedStr.replace(' ', 'T') + 'Z';
    } else if (normalizedStr.includes('-') && normalizedStr.length === 10) {
      normalizedStr = normalizedStr + 'T00:00:00Z';
    }
  }
  const date = new Date(normalizedStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (isNaN(diffMs)) {
    return dateStr;
  }

  if (diffMs < 0) {
    return 'just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

interface TicketComment {
  uuid: string;
  body: string;
  user: {
    uuid: string;
    name: string;
    avatar: string;
  };
  created_at: string;
}

interface TicketWorkLogItem {
  uuid: string;
  hours: number;
  log_date: string;
  description: string | null;
  created_at: string;
  user: {
    uuid: string;
    name: string;
  };
}

interface TicketDetail {
  uuid: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  story_points: number | null;
  start_date: string | null;
  due_date: string | null;
  work_logs: Record<string, number> | null;
  work_logs_list?: TicketWorkLogItem[];
  assignee: {
    uuid: string;
    name: string;
    avatar: string;
  } | null;
  reporter: {
    uuid: string;
    name: string;
    avatar: string;
  } | null;
  code_reviewer: {
    uuid: string;
    name: string;
    avatar: string;
  } | null;
  project?: {
    uuid: string;
    name: string;
    organization_uuid?: string;
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
  subtasks: Array<{
    uuid: string;
    key: string;
    title: string;
    status: string;
    priority: string;
  }>;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

interface IssueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueUuid: string;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({ isOpen, onClose, issueUuid }) => {
  const [issue, setIssue] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [epics, setEpics] = useState<Array<{ uuid: string; key: string; title: string }>>([]);
  const [loadingEpics, setLoadingEpics] = useState(false);
  const [sprints, setSprints] = useState<Array<{ uuid: string; name: string; status: string }>>([]);
  const [loadingSprints, setLoadingSprints] = useState(false);

  // In-place edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  // Work logging states
  const [logWorkStr, setLogWorkStr] = useState('');
  const [logWorkDate, setLogWorkDate] = useState('');
  const [loggingWork, setLoggingWork] = useState(false);
  const [isTimeTrackingModalOpen, setIsTimeTrackingModalOpen] = useState(false);
  const [tempRemainingStr, setTempRemainingStr] = useState('0m');

  // Activity feed & Individual logs states
  const [activeActivityTab, setActiveActivityTab] = useState<'All' | 'Comments' | 'History' | 'Work log'>('Comments');
  const [historyLogs, setHistoryLogs] = useState<Array<{ uuid: string; action: string; created_at: string; user: { name: string } }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingWorkLogUuid, setEditingWorkLogUuid] = useState<string | null>(null);
  const [editingWorkLogHours, setEditingWorkLogHours] = useState('');
  const [editingWorkLogDesc, setEditingWorkLogDesc] = useState('');

  // Organization users for Assignee and Code Reviewer select lists
  const [orgUsers, setOrgUsers] = useState<Array<{ 
    uuid: string; 
    name: string; 
    role?: {
      id: number;
      name: string;
      slug: string;
    } | null;
  }>>([]);
  const [loadingOrgUsers, setLoadingOrgUsers] = useState(false);

  const [usersLoaded, setUsersLoaded] = useState(false);
  const [sprintsLoaded, setSprintsLoaded] = useState(false);
  const [epicsLoaded, setEpicsLoaded] = useState(false);

  // Get user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Guest' };

  useEffect(() => {
    if (isOpen && issueUuid) {
      setUsersLoaded(false);
      setSprintsLoaded(false);
      setEpicsLoaded(false);
      setOrgUsers([]);
      setSprints([]);
      setEpics([]);
      fetchIssueDetails();
      // Record recently viewed event
      api.post(`/tickets/${issueUuid}/view`).catch(err => console.error('Failed to record ticket view', err));
    }
  }, [isOpen, issueUuid]);

  useEffect(() => {
    if (isOpen && issueUuid && (activeActivityTab === 'All' || activeActivityTab === 'History')) {
      setLoadingHistory(true);
      api.get(`/tickets/${issueUuid}/activity-logs`)
        .then(res => {
          setHistoryLogs(res.data.data || []);
        })
        .catch(err => console.error('Failed to fetch activity logs', err))
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, issueUuid, activeActivityTab]);

  useEffect(() => {
    if (isTimeTrackingModalOpen && issue) {
      const logs = issue.work_logs || {};
      const totalLogged = Object.values(logs).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
      const dateRange = getDatesInRange(issue.start_date, issue.due_date);
      const totalEstimated = dateRange.length * 8;
      const remainingHours = Math.max(totalEstimated - totalLogged, 0);
      setTempRemainingStr(formatHoursToJira(remainingHours));
    }
  }, [isTimeTrackingModalOpen, issue]);

  const handleToggleStar = async () => {
    if (!issue) return;
    try {
      const originalStarred = issue.is_starred;
      // Optimistic update
      setIssue({ ...issue, is_starred: !originalStarred });
      const response = await api.post(`/tickets/${issue.uuid}/star`);
      setIssue({ ...issue, is_starred: response.data.is_starred });
    } catch (err) {
      console.error('Failed to toggle star status', err);
    }
  };

  const fetchIssueDetails = async () => {
    setLoading(true);
    try {
      const issueRes = await api.get(`/tickets/${issueUuid}`);
      const data = issueRes.data.data;
      setIssue(data);
      setTempTitle(data.title || '');
      setTempDesc(data.description || '');
      setComments(data.comments || []);
      if (data.start_date) {
        setLogWorkDate(data.start_date.substring(0, 10));
      } else {
        setLogWorkDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to fetch ticket details', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSprintsOnce = async () => {
    if (sprintsLoaded || loadingSprints || !issue?.project?.uuid) return;
    setLoadingSprints(true);
    try {
      const sprintsRes = await api.get('/sprints', {
        params: { project_uuid: issue.project.uuid }
      });
      setSprints(sprintsRes.data.data || []);
      setSprintsLoaded(true);
    } catch (err) {
      console.error('Failed to fetch sprints for issue detail', err);
    } finally {
      setLoadingSprints(false);
    }
  };

  const fetchEpicsOnce = async () => {
    if (epicsLoaded || loadingEpics || !issue?.project?.uuid) return;
    setLoadingEpics(true);
    try {
      const res = await api.get('/tickets', {
        params: { project_uuid: issue.project.uuid, type: 'Epic' }
      });
      setEpics(res.data.data || []);
      setEpicsLoaded(true);
    } catch (err) {
      console.error('Failed to fetch epics', err);
    } finally {
      setLoadingEpics(false);
    }
  };

  const fetchOrgUsers = async () => {
    if (usersLoaded || loadingOrgUsers || !issue?.project?.organization_uuid) return;
    setLoadingOrgUsers(true);
    try {
      const res = await api.get('/users', {
        params: {
          organization_uuid: issue.project.organization_uuid,
          per_page: 100
        }
      });
      setOrgUsers(res.data.data || []);
      setUsersLoaded(true);
    } catch (err) {
      console.error('Failed to fetch organization users', err);
    } finally {
      setLoadingOrgUsers(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!issue || !tempTitle.trim()) return;
    setSavingTitle(true);
    try {
      const response = await api.put(`/tickets/${issue.uuid}`, {
        title: tempTitle,
        project_uuid: issue.project?.uuid
      });
      setIssue({ ...issue, title: response.data.data.title });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title', err);
      alert('Failed to update issue title');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveDesc = async () => {
    if (!issue) return;
    setSavingDesc(true);
    try {
      const response = await api.put(`/tickets/${issue.uuid}`, {
        description: tempDesc,
        project_uuid: issue.project?.uuid
      });
      setIssue({ ...issue, description: response.data.data.description });
      setIsEditingDesc(false);
    } catch (err) {
      console.error('Failed to update description', err);
      alert('Failed to update issue description');
    } finally {
      setSavingDesc(false);
    }
  };

  const [generatingAiDesc, setGeneratingAiDesc] = useState(false);
  const handleAiGenerateDesc = async () => {
    if (!issue) return;
    setGeneratingAiDesc(true);
    try {
      const response = await api.post('/ai/generate-description', {
        title: issue.title,
        type: issue.type
      });
      setTempDesc(response.data.data.text);
      setIsEditingDesc(true);
    } catch (err) {
      console.error('Failed to generate description using Gemini AI', err);
    } finally {
      setGeneratingAiDesc(false);
    }
  };

  const [analyzingBug, setAnalyzingBug] = useState(false);
  const handleAiAnalyzeBug = async () => {
    if (!issue) return;
    setAnalyzingBug(true);
    try {
      const response = await api.post('/ai/analyze-bug', {
        title: issue.title,
        steps_to_reproduce: issue.description || '',
        environment: 'Staging'
      });
      // Append suggested fix as a comment
      const commentRes = await api.post(`/tickets/${issue.uuid}/comments`, {
        body: response.data.data.analysis
      });
      setComments([commentRes.data.data, ...comments]);
      alert('AI Bug Analysis successfully appended to ticket comments!');
    } catch (err) {
      console.error('Failed to analyze bug', err);
    } finally {
      setAnalyzingBug(false);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue || !newSubtaskTitle.trim()) return;
    setCreatingSubtask(true);
    try {
      await api.post('/tickets', {
        project_uuid: issue.project?.uuid,
        title: newSubtaskTitle,
        parent_uuid: issue.uuid,
        type: 'Subtask',
        status: 'To Do',
        priority: 'Medium'
      });
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
      fetchIssueDetails();
    } catch (err) {
      console.error('Failed to create subtask', err);
      alert('Failed to create subtask');
    } finally {
      setCreatingSubtask(false);
    }
  };

  const handleEpicChange = async (epicUuid: string) => {
    if (!issue) return;
    try {
      await api.put(`/tickets/${issue.uuid}`, {
        epic_uuid: epicUuid || null,
        project_uuid: issue.project?.uuid
      });
      fetchIssueDetails();
    } catch (err) {
      console.error('Failed to update epic', err);
      alert('Failed to update epic');
    }
  };

  const handleSprintChange = async (sprintUuid: string) => {
    if (!issue) return;
    try {
      setIssue({
        ...issue,
        sprint: sprintUuid
          ? { uuid: sprintUuid, name: sprints.find(s => s.uuid === sprintUuid)?.name || '', status: 'future' }
          : null
      });
      await api.put(`/tickets/${issue.uuid}`, {
        sprint_uuid: sprintUuid || null,
        project_uuid: issue.project?.uuid
      });
      fetchIssueDetails();
    } catch (err) {
      console.error('Failed to update sprint', err);
      alert('Failed to update sprint');
      fetchIssueDetails();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!issue) return;
    try {
      // Optimistic update
      setIssue({ ...issue, status: newStatus });
      await api.put(`/tickets/${issue.uuid}`, {
        status: newStatus,
        project_uuid: issue.project?.uuid
      });
    } catch (err) {
      console.error('Failed to update status', err);
      fetchIssueDetails();
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!issue) return;
    try {
      setIssue({ ...issue, priority: newPriority });
      await api.put(`/tickets/${issue.uuid}`, {
        priority: newPriority,
        project_uuid: issue.project?.uuid
      });
    } catch (err) {
      console.error('Failed to update priority', err);
      fetchIssueDetails();
    }
  };



  const handleAssigneeChange = async (assigneeUuid: string) => {
    if (!issue) return;
    try {
      const updatedAssignee = assigneeUuid 
        ? orgUsers.find(u => u.uuid === assigneeUuid) || (issue.assignee?.uuid === assigneeUuid ? issue.assignee : null)
        : null;
      
      setIssue({
        ...issue,
        assignee: updatedAssignee ? { uuid: updatedAssignee.uuid, name: updatedAssignee.name, avatar: '' } : null
      });

      await api.put(`/tickets/${issue.uuid}`, {
        assignee_uuid: assigneeUuid || null,
        project_uuid: issue.project?.uuid
      });
      fetchIssueDetails();
    } catch (err) {
      console.error('Failed to update assignee', err);
      alert('Failed to update assignee');
      fetchIssueDetails();
    }
  };

  const handleCodeReviewerChange = async (reviewerUuid: string) => {
    if (!issue) return;
    try {
      const updatedReviewer = reviewerUuid 
        ? orgUsers.find(u => u.uuid === reviewerUuid) || ((issue.code_reviewer || issue.reporter)?.uuid === reviewerUuid ? (issue.code_reviewer || issue.reporter) : null)
        : null;

      setIssue({
        ...issue,
        code_reviewer: updatedReviewer ? { uuid: updatedReviewer.uuid, name: updatedReviewer.name, avatar: '' } : null,
        reporter: updatedReviewer ? { uuid: updatedReviewer.uuid, name: updatedReviewer.name, avatar: '' } : null
      });

      await api.put(`/tickets/${issue.uuid}`, {
        code_reviewer_uuid: reviewerUuid || null,
        project_uuid: issue.project?.uuid
      });
      fetchIssueDetails();
    } catch (err) {
      console.error('Failed to update code reviewer', err);
      alert('Failed to update code reviewer');
      fetchIssueDetails();
    }
  };

  const getSelectableUsers = (currentUser?: { uuid: string; name: string } | null) => {
    // Only show users with role 3 (org_user)
    const list = orgUsers.filter(u => u.role?.id === 3 || u.role?.slug === 'org_user');
    
    // Add current user to list if not present, to prevent dropdown from displaying blank/None
    if (currentUser && !list.some(u => u.uuid === currentUser.uuid)) {
      const foundUser = orgUsers.find(u => u.uuid === currentUser.uuid);
      list.push(foundUser || { uuid: currentUser.uuid, name: currentUser.name });
    }
    
    const me = list.find(u => u.uuid === user?.uuid);
    const others = list.filter(u => u.uuid !== user?.uuid);
    
    const sortedList = [];
    if (me) {
      sortedList.push({
        ...me,
        name: `${me.name} (me)`
      });
    }
    sortedList.push(...others);
    return sortedList;
  };

  const handleDateChange = async (field: 'start_date' | 'due_date', val: string) => {
    if (!issue) return;
    try {
      const updatedValue = val || null;
      setIssue({
        ...issue,
        [field]: updatedValue
      });
      await api.put(`/tickets/${issue.uuid}`, {
        [field]: updatedValue,
        project_uuid: issue.project?.uuid
      });
      fetchIssueDetails();
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
      alert(`Failed to update ${field}`);
      fetchIssueDetails();
    }
  };

  const parseTimeToHours = (inputStr: string): number => {
    const clean = inputStr.trim().toLowerCase();
    if (!clean) return 0;
    
    let totalHours = 0;
    
    // Match days e.g. "1d", "1.5d", "2 days"
    const dayRegex = /(\d*\.?\d+)\s*(?:d|day|days)/g;
    let match;
    while ((match = dayRegex.exec(clean)) !== null) {
      totalHours += parseFloat(match[1]) * 8; // 1 day = 8 hr
    }
    
    // Match hours e.g. "2h", "8 hr", "0.5h"
    const hourRegex = /(\d*\.?\d+)\s*(?:h|hr|hour|hours)/g;
    dayRegex.lastIndex = 0;
    hourRegex.lastIndex = 0;
    while ((match = hourRegex.exec(clean)) !== null) {
      totalHours += parseFloat(match[1]);
    }
    
    // Fallback: if it's just a number, treat as hours
    if (totalHours === 0 && !isNaN(parseFloat(clean))) {
      totalHours = parseFloat(clean);
    }
    
    return totalHours;
  };

  const formatHoursToJira = (hours: number): string => {
    if (hours <= 0) return '0m';
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (remainingHours > 0) {
      const wholeHours = Math.floor(remainingHours);
      const minutes = Math.round((remainingHours - wholeHours) * 60);
      if (wholeHours > 0) parts.push(`${wholeHours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
    }
    return parts.length > 0 ? parts.join(' ') : '0m';
  };

  const getDatesInRange = (startDateStr?: string | null, endDateStr?: string | null) => {
    if (!startDateStr || !endDateStr) return [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    
    const dates: string[] = [];
    const curr = new Date(start);
    let safetyCount = 0;
    while (curr <= end && safetyCount < 30) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      safetyCount++;
    }
    return dates;
  };

  const handleLogWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue || !logWorkStr.trim()) return;

    const hours = parseTimeToHours(logWorkStr);
    if (hours <= 0) {
      alert('Please enter a valid time (e.g. 2h, 1d, 8h, 1.5d)');
      return;
    }

    const targetDate = logWorkDate || new Date().toISOString().split('T')[0];

    setLoggingWork(true);
    try {
      const response = await api.post(`/tickets/${issue.uuid}/work-logs`, {
        hours,
        log_date: targetDate,
        description: `Logged spent time: ${logWorkStr}`,
      });

      setIssue(response.data.data);
      setLogWorkStr('');
      setIsTimeTrackingModalOpen(false);
      
      // If active tab is History or All, trigger refresh
      if (activeActivityTab === 'All' || activeActivityTab === 'History') {
        const historyRes = await api.get(`/tickets/${issue.uuid}/activity-logs`);
        setHistoryLogs(historyRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to log work', err);
      alert('Failed to log work');
    } finally {
      setLoggingWork(false);
    }
  };

  const handleUpdateWorkLog = async (workLogUuid: string, updatedHoursStr: string, updatedDesc: string) => {
    if (!issue) return;
    const hours = parseTimeToHours(updatedHoursStr);
    if (hours <= 0) {
      alert('Please enter a valid time (e.g. 2h, 1d)');
      return;
    }

    try {
      const response = await api.put(`/work-logs/${workLogUuid}`, {
        hours,
        log_date: logWorkDate || new Date().toISOString().split('T')[0],
        description: updatedDesc || `Updated spent time: ${updatedHoursStr}`,
      });

      setIssue(response.data.data);
      setEditingWorkLogUuid(null);
      
      if (activeActivityTab === 'All' || activeActivityTab === 'History') {
        const historyRes = await api.get(`/tickets/${issue.uuid}/activity-logs`);
        setHistoryLogs(historyRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to update work log', err);
      alert('Failed to update work log');
    }
  };

  const handleDeleteWorkLog = async (workLogUuid: string) => {
    if (!issue || !confirm('Are you sure you want to delete this work log?')) return;
    try {
      const response = await api.delete(`/work-logs/${workLogUuid}`);
      setIssue(response.data.data);
      
      if (activeActivityTab === 'All' || activeActivityTab === 'History') {
        const historyRes = await api.get(`/tickets/${issue.uuid}/activity-logs`);
        setHistoryLogs(historyRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to delete work log', err);
      alert('Failed to delete work log');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !issue) return;
    
    setSubmittingComment(true);
    try {
      const response = await api.post(`/tickets/${issue.uuid}/comments`, {
        body: newComment
      });
      setComments([response.data.data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!issue) return;
    if (!confirm('Are you sure you want to delete this issue? This cannot be undone.')) return;

    try {
      await api.delete(`/tickets/${issue.uuid}`);
      onClose();
    } catch (err) {
      alert('Failed to delete issue');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col h-[95vh] lg:h-[85vh] max-h-[95vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Modal Header Controls (Lock, Watch, Share, More, Maximize, Close) */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 md:gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-0">
            {issue && issue.type !== 'Epic' && (
              <>
                <span className="flex items-center gap-1 min-w-0">
                  {issue.epic ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-wide truncate max-w-[70px] sm:max-w-[120px]" title={issue.epic.title}>
                      {issue.epic.title}
                    </span>
                  ) : (
                    <span className="text-slate-400 shrink-0">No Epic</span>
                  )}
                  <select
                    value={issue.epic?.uuid || ''}
                    onChange={(e) => handleEpicChange(e.target.value)}
                    onFocus={fetchEpicsOnce}
                    className="bg-transparent text-[9px] font-bold text-indigo-600 outline-none cursor-pointer border-none p-0 select-none uppercase tracking-widest shrink-0"
                  >
                    <option value="">Link epic</option>
                    {issue.epic && !epics.some(e => e.uuid === issue.epic?.uuid) && (
                      <option value={issue.epic.uuid}>{issue.epic.title} ({issue.epic.key || ''})</option>
                    )}
                    {epics.map(epic => (
                      <option key={epic.uuid} value={epic.uuid}>{epic.title} ({epic.key})</option>
                    ))}
                  </select>
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              </>
            )}
            {issue && (
              <span className="text-slate-900 flex items-center gap-1.5 min-w-0 truncate">
                <span className={cn(
                  "w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-black text-white shrink-0 shadow-sm",
                  issue.type === 'Bug' ? "bg-rose-500" :
                  issue.type === 'Story' ? "bg-emerald-500" :
                  issue.type === 'Epic' ? "bg-purple-500" :
                  issue.type === 'Spike' ? "bg-amber-500" :
                  "bg-indigo-500"
                )}>
                  {issue.type[0]}
                </span>
                <span className="font-mono text-xs font-bold text-slate-500 shrink-0">{issue.key}</span>
              </span>
            )}
          </div>
 
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {issue && (
              <button 
                onClick={handleToggleStar} 
                className="p-1.5 text-slate-400 hover:text-amber-500 hover:scale-110 active:scale-95 transition-all duration-200"
                title={issue.is_starred ? "Starred issue" : "Star issue"}
              >
                <Star className={cn("w-4 h-4", issue.is_starred ? "fill-amber-400 text-amber-400" : "")} />
              </button>
            )}
            <button className="hidden md:inline-flex p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"><Lock className="w-4 h-4" /></button>
            <button className="hidden md:inline-flex p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"><Eye className="w-4 h-4" /></button>
            <button className="hidden md:inline-flex p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"><Share2 className="w-4 h-4" /></button>
            {issue && (
              <button onClick={handleDeleteIssue} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all" title="Delete Ticket">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button className="hidden md:inline-flex p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"><MoreHorizontal className="w-4 h-4" /></button>
            <div className="hidden md:block w-[1px] h-6 bg-slate-200 mx-1"></div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
 
        {/* Modal Non-Scrollable Body */}
        <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-slate-500 font-medium">Fetching ticket details...</p>
            </div>
          ) : !issue ? (
            <div className="py-20 text-center">
              <h2 className="text-xl font-bold text-slate-800">Issue not found</h2>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4 lg:gap-8 items-stretch flex-1 min-h-0 overflow-y-auto lg:overflow-hidden scrollbar-none">
              
              {/* Main Content Area (Scrolls independently on desktop) */}
              <div className="col-span-12 lg:col-span-8 overflow-y-visible lg:overflow-y-auto h-auto lg:h-full pr-0 lg:pr-4 pb-4 lg:pb-12 space-y-6 lg:space-y-8 scrollbar-none">
                
                {/* Title edit block */}
                {isEditingTitle ? (
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={handleSaveTitle}
                      disabled={savingTitle || !tempTitle.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shrink-0"
                    >
                      Save
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setTempTitle(issue.title);
                        setIsEditingTitle(false);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold active:scale-95 transition-all shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h1 
                    onClick={() => {
                      setTempTitle(issue.title);
                      setIsEditingTitle(true);
                    }}
                    className="text-2xl font-bold text-slate-900 leading-tight hover:bg-slate-50 px-2 py-1 -mx-2 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100 group flex items-center justify-between"
                    title="Click to edit title"
                  >
                    <span>{issue.title}</span>
                    <Edit3 className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h1>
                )}

                <div className="space-y-6">


                  {/* Description editing block */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                        Description
                        {generatingAiDesc && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                      </h3>
                      <div className="flex items-center gap-3">
                        {issue.type === 'Bug' && (
                          <button
                            type="button"
                            onClick={handleAiAnalyzeBug}
                            disabled={analyzingBug}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition-colors"
                            title="Analyze bug parameters with Gemini AI"
                          >
                            <Sparkles className="w-3 h-3" /> {analyzingBug ? 'Analyzing...' : 'Analyze Bug'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAiGenerateDesc}
                          disabled={generatingAiDesc}
                          className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 transition-colors"
                          title="Generate description with Gemini AI"
                        >
                          <Sparkles className="w-3 h-3" /> Generate with AI
                        </button>
                        {!isEditingDesc && (
                          <button 
                            onClick={() => {
                              setTempDesc(issue.description || '');
                              setIsEditingDesc(true);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    {isEditingDesc ? (
                      <div className="space-y-3">
                        <textarea
                          value={tempDesc}
                          onChange={(e) => setTempDesc(e.target.value)}
                          placeholder="Add a description..."
                          rows={4}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveDesc}
                            disabled={savingDesc}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempDesc(issue.description || '');
                              setIsEditingDesc(false);
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setTempDesc(issue.description || '');
                          setIsEditingDesc(true);
                        }}
                        className="prose prose-slate max-w-none hover:bg-slate-50/50 p-4 -mx-4 rounded-xl cursor-pointer border border-transparent hover:border-slate-100 transition-colors"
                        title="Click to edit description"
                      >
                        <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-line">
                          {issue.description || 'No description provided. Click to add one.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Subtasks inline creator */}
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Subtasks</h3>
                    </div>
                    
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/10">
                      {issue.subtasks && issue.subtasks.length > 0 ? (
                        issue.subtasks.map(sub => (
                          <div key={sub.uuid} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <span className="flex items-center gap-3">
                              <span className="font-mono text-xs font-bold text-slate-400">{sub.key}</span>
                              <span className="text-sm font-semibold text-slate-700">{sub.title}</span>
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                              sub.status === 'Done' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              sub.status === 'In Progress' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                              sub.status === 'In Review ( CR )' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              sub.status === 'Ready Reopen' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                              sub.status === 'Ready for QA' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                              sub.status === 'QA' ? "bg-sky-50 text-sky-600 border border-sky-100" :
                              "bg-slate-100 text-slate-500"
                            )}>{sub.status}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-400 text-xs italic font-medium">No subtasks. Create one below.</div>
                      )}

                      <div className="p-4 bg-slate-50/30 border-t border-slate-100">
                        {isAddingSubtask ? (
                          <form onSubmit={handleCreateSubtask} className="flex gap-2 items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide shrink-0">
                              Subtask
                            </span>
                            <input
                              type="text"
                              value={newSubtaskTitle}
                              onChange={(e) => setNewSubtaskTitle(e.target.value)}
                              placeholder="Name this subtask..."
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                              autoFocus
                              required
                            />
                            <button
                              type="submit"
                              disabled={creatingSubtask || !newSubtaskTitle.trim()}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shrink-0 shadow-sm"
                            >
                              {creatingSubtask ? 'Adding...' : 'Create'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewSubtaskTitle('');
                                setIsAddingSubtask(false);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all shrink-0"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingSubtask(true)}
                            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add subtask
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Activity stream and Discussion tabs */}
                  <div className="pt-6 border-t border-slate-100 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">Activity</span>
                        {(['All', 'Comments', 'History', 'Work log'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveActivityTab(tab)}
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                              activeActivityTab === tab 
                                ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conditional comment form: only when Comments or All is active */}
                    {(activeActivityTab === 'All' || activeActivityTab === 'Comments') && (
                      <form onSubmit={handleAddComment} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                          {user.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <textarea 
                              placeholder="Add a comment..." 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none"
                              required
                            ></textarea>
                            <div className="absolute bottom-3 right-3 flex gap-2 shrink-0">
                              <button 
                                type="submit" 
                                disabled={submittingComment}
                                className="whitespace-nowrap px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                              >
                                {submittingComment ? 'Posting...' : 'Submit'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Stream Content renderer */}
                    <div className="space-y-4">
                      
                      {/* Comments feed */}
                      {(activeActivityTab === 'All' || activeActivityTab === 'Comments') && (
                        <div className="space-y-4">
                          {activeActivityTab === 'Comments' && comments.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4 font-medium italic">No comments posted yet.</p>
                          )}
                          {comments.map(c => (
                            <div key={c.uuid} className="flex items-start gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                                {c.user.name[0]}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">{c.user.name}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{c.created_at}</span>
                                </div>
                                <div className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line">
                                  {c.body}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* History / Audit feed */}
                      {(activeActivityTab === 'All' || activeActivityTab === 'History') && (
                        <div className="space-y-3">
                          {loadingHistory ? (
                            <div className="text-center py-4">
                              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mx-auto" />
                            </div>
                          ) : activeActivityTab === 'History' && historyLogs.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 font-medium italic">No audit history recorded yet.</p>
                          ) : (
                            historyLogs.map(log => (
                              <div key={log.uuid} className="text-xs font-medium text-slate-600 pl-4 border-l-2 border-slate-200 py-1.5 flex justify-between items-center">
                                <span className="text-slate-700">
                                  <span className="font-bold text-slate-900">{log.user?.name || 'System'}</span> {log.action}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold shrink-0">{log.created_at}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Work Log feed (Who, How much time, When) */}
                      {(activeActivityTab === 'All' || activeActivityTab === 'Work log') && (
                        <div className="space-y-4">
                          {activeActivityTab === 'Work log' && (!issue.work_logs_list || issue.work_logs_list.length === 0) && (
                            <p className="text-xs text-slate-400 text-center py-4 font-medium italic">No work logs logged yet.</p>
                          )}
                          {issue.work_logs_list?.map(log => {
                            const isEditingThis = editingWorkLogUuid === log.uuid;
                            return (
                              <div key={log.uuid} className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-none">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                  {getInitials(log.user.name)}
                                </div>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      {isEditingThis ? (
                                        <div className="space-y-3 bg-white p-3 border border-slate-100 rounded-xl shadow-sm mt-1">
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Time spent</label>
                                              <input 
                                                type="text"
                                                value={editingWorkLogHours}
                                                onChange={(e) => setEditingWorkLogHours(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                                                required
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Comment</label>
                                              <input 
                                                type="text"
                                                value={editingWorkLogDesc}
                                                onChange={(e) => setEditingWorkLogDesc(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex justify-end gap-2 pt-1 border-t border-slate-50">
                                            <button
                                              type="button"
                                              onClick={() => setEditingWorkLogUuid(null)}
                                              className="px-2.5 py-1 hover:bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold transition-all"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateWorkLog(log.uuid, editingWorkLogHours, editingWorkLogDesc)}
                                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold transition-all shadow-sm"
                                            >
                                              Save
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-0.5">
                                          <div className="text-xs text-slate-700">
                                            <span className="font-bold text-slate-900">{log.user.name}</span>
                                            {' '}logged <span className="font-semibold text-slate-900">{formatHoursToJira(log.hours)}</span>
                                          </div>
                                          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                                            {formatRelativeTime(log.created_at)}
                                          </div>
                                          <div className="flex gap-2 text-[10px] font-bold text-indigo-600 select-none pt-0.5">
                                            <button 
                                              onClick={() => {
                                                setEditingWorkLogUuid(log.uuid);
                                                setEditingWorkLogHours(`${log.hours}h`);
                                                setEditingWorkLogDesc(log.description || '');
                                              }}
                                              className="hover:text-indigo-800 hover:underline cursor-pointer"
                                            >
                                              Edit
                                            </button>
                                            <span className="text-slate-300">•</span>
                                            <button 
                                              onClick={() => handleDeleteWorkLog(log.uuid)}
                                              className="text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                          {log.description && 
                                           !log.description.startsWith('Logged spent time:') && 
                                           !log.description.startsWith('Updated spent time:') && (
                                            <p className="text-xs text-slate-500 leading-normal italic mt-1 pl-2 border-l border-slate-200">
                                              "{log.description}"
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              </div>

              {/* Sidebar Info Area (Scrolls independently on desktop) */}
              <div className="col-span-12 lg:col-span-4 overflow-y-visible lg:overflow-y-auto h-auto lg:h-full pr-0 lg:pr-2 pb-6 lg:pb-12 space-y-6 scrollbar-none">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</h3>
                     <select 
                      value={issue.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
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
                  
                  <div className="space-y-4">
                    {/* Assignee */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assignee</p>
                      <div className="pt-1 flex items-center gap-2">
                        {issue.assignee && (
                          <div 
                            className="w-7 h-7 rounded-full bg-indigo-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm shrink-0"
                            title={issue.assignee.name}
                          >
                            {getInitials(issue.assignee.name)}
                          </div>
                        )}
                        <select
                          value={issue.assignee?.uuid || ''}
                          onChange={(e) => handleAssigneeChange(e.target.value)}
                          onFocus={fetchOrgUsers}
                          className="bg-white border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none w-full shadow-sm text-slate-700 cursor-pointer hover:bg-slate-50/50 transition-colors"
                        >
                          <option value="">Unassigned</option>
                          {getSelectableUsers(issue.assignee).map(u => (
                            <option key={u.uuid} value={u.uuid}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Code Reviewer */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Code Reviewer</p>
                      <div className="pt-1 flex items-center gap-2">
                        {(() => {
                          const reviewer = issue.code_reviewer || issue.reporter;
                          return (
                            <>
                              {reviewer && (
                                <div 
                                  className="w-7 h-7 rounded-full bg-indigo-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm shrink-0"
                                  title={reviewer.name}
                                >
                                  {getInitials(reviewer.name)}
                                </div>
                              )}
                              <select
                                value={reviewer?.uuid || ''}
                                onChange={(e) => handleCodeReviewerChange(e.target.value)}
                                onFocus={fetchOrgUsers}
                                className="bg-white border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none w-full shadow-sm text-slate-700 cursor-pointer hover:bg-slate-50/50 transition-colors"
                              >
                                <option value="">No reviewer</option>
                                {getSelectableUsers(reviewer).map(u => (
                                  <option key={u.uuid} value={u.uuid}>{u.name}</option>
                                ))}
                              </select>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* From Date */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">From Date</p>
                      <div className="pt-1">
                        <input 
                          type="date"
                          value={issue.start_date ? issue.start_date.substring(0, 10) : ''}
                          onChange={(e) => handleDateChange('start_date', e.target.value)}
                          className="bg-white border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none w-full shadow-sm text-slate-700"
                        />
                      </div>
                    </div>

                    {/* To Date */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">To Date (Due Date)</p>
                      <div className="pt-1">
                        <input 
                          type="date"
                          value={issue.due_date ? issue.due_date.substring(0, 10) : ''}
                          onChange={(e) => handleDateChange('due_date', e.target.value)}
                          className="bg-white border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none w-full shadow-sm text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Time tracking Row (Clicking this opens the gorgeous sub-modal overlay!) */}
                    <div 
                      onClick={() => setIsTimeTrackingModalOpen(true)}
                      className="space-y-1 hover:bg-slate-200/40 p-2 -mx-2 rounded-xl cursor-pointer transition-colors group select-none"
                      title="Click to track time"
                    >
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time tracking</p>
                      {(() => {
                        const logs = issue.work_logs || {};
                        const totalLogged = Object.values(logs).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                        const dateRange = getDatesInRange(issue.start_date, issue.due_date);
                        const totalEstimated = dateRange.length * 8; // 8h per day
                        const pct = totalEstimated > 0 ? Math.min((totalLogged / totalEstimated) * 100, 100) : 0;
                        
                        return (
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>{totalLogged > 0 ? `${totalLogged}h logged` : 'No time logged'}</span>
                              {totalEstimated > 0 && (
                                <span className="text-slate-400 font-medium">({totalEstimated}h est.)</span>
                              )}
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300/10">
                              <div 
                                className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Sprint */}
                    {issue.type !== 'Epic' && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sprint</p>
                        <div className="pt-1">
                          {loadingSprints ? (
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 py-1">
                              <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" /> Loading sprints...
                            </div>
                          ) : (
                            <select 
                              value={issue.sprint?.uuid || ''}
                              onChange={(e) => handleSprintChange(e.target.value)}
                              onFocus={fetchSprintsOnce}
                              className="bg-white border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none w-full shadow-sm animate-in fade-in"
                            >
                              <option value="">None (Backlog)</option>
                              {issue.sprint && !sprints.some(s => s.uuid === issue.sprint?.uuid) && (
                                <option value={issue.sprint.uuid}>{issue.sprint.name} ({issue.sprint.status || ''})</option>
                              )}
                              {sprints.map(s => (
                                <option key={s.uuid} value={s.uuid}>{s.name} ({s.status})</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Estimate */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estimate</p>
                      <div className="flex items-center gap-2 pt-1 font-bold text-sm text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {issue.story_points ?? '0'} Points
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Time Tracking Sub-Modal Overlay */}
      {isTimeTrackingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Time tracking</h3>
              <button 
                onClick={() => setIsTimeTrackingModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {(() => {
                if (!issue) return null;
                const logs = issue.work_logs || {};
                const totalLogged = Object.values(logs).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                const dateRange = getDatesInRange(issue.start_date, issue.due_date);
                const totalEstimated = dateRange.length * 8; // 8h per day
                const pct = totalEstimated > 0 ? Math.min((totalLogged / totalEstimated) * 100, 100) : 0;
                
                return (
                  <div className="space-y-2">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{totalLogged}h logged</span>
                      <span>{totalEstimated > 0 ? `${Math.max(totalEstimated - totalLogged, 0)}h remaining` : ''}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Shorthand Form Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Time spent</label>
                  <input 
                    type="text"
                    placeholder="e.g. 1d, 8h, 2h 30m"
                    value={logWorkStr}
                    onChange={(e) => setLogWorkStr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Time remaining</label>
                  <input 
                    type="text"
                    value={tempRemainingStr || '0m'}
                    onChange={(e) => setTempRemainingStr(e.target.value)}
                    placeholder="e.g. 1d, 4h"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Shorthand Instructions */}
              <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <p className="font-semibold text-slate-600 mb-1">Use the format: 2w 4d 6h 45m</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-medium text-slate-500">
                  <span>• w = weeks</span>
                  <span>• d = days</span>
                  <span>• h = hours</span>
                  <span>• m = minutes</span>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button 
                type="button"
                onClick={() => setIsTimeTrackingModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleLogWork}
                disabled={loggingWork || !logWorkStr.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                {loggingWork ? 'Saving...' : 'Save'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
