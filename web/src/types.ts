export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'To Do' | 'Ready Reopen' | 'In Progress' | 'In Review ( CR )' | 'Ready for QA' | 'QA' | 'Done' | 'Blocked' | 'Backlog' | 'Refining' | 'Triage';
export type IssueType = 'Story' | 'Bug' | 'Task';

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Suspended' | 'Pending';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
  organizationId?: string;
}

export interface Issue {
  id: string;
  key: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee: User[];
  reporter: User;
  type: IssueType;
  points?: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  date: string;
  month: string;
  status: 'Strategic' | 'High Priority' | 'Maintenance' | 'On Track';
  assignees?: User[];
}

export interface Activity {
  id: string;
  user: User;
  action: string;
  target: string;
  time: string;
  type: 'edit' | 'check_circle' | 'priority_high' | 'upload_file' | 'comment';
}
