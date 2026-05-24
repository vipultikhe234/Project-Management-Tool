import { Issue, Milestone, Activity, User, Organization } from './types';

export const ORGANIZATIONS: Organization[] = [
  {
    id: 'org1',
    name: 'TechFlow Systems',
    plan: 'Enterprise',
    status: 'Active',
    createdAt: 'Jan 12, 2024',
    logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop'
  },
  {
    id: 'org2',
    name: 'Luminal Design',
    plan: 'Pro',
    status: 'Active',
    createdAt: 'Mar 05, 2024',
    logo: 'https://images.unsplash.com/photo-1572044162444-ad60f128bde2?w=100&h=100&fit=crop'
  }
];

export const USERS: User[] = [
  {
    id: 'u1',
    name: 'Sarah Chen',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmM5B9rrevOHkZ65aRqr_qejWVhyviZhOHJTSBbXVxZ7rT_T-LS6gY5TXNhHdrYoYRbtPpkQO-RI4BRMoHZQAzhMf8Ra6MddWksiuMd5CMPU2JS1F72vqMEab02spKw95LBFz0nkJkmIez56_d9GabwB16ybXFg5pYxe3_YYjtYO6fiGkfuI1gOmaBzrWQHZAnyyRZarkPlalPqZtYisHKJnKf9BXcA6QoyFkgY9XoU7N0bDniEaGB8mOnFDE2vfyxx8_SAgcMQZ4',
    role: 'Product Manager',
    organizationId: 'org1'
  },
  {
    id: 'u2',
    name: 'Alex Rivera',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWCusQxRuc2A1u8ZCDQt9dSo12oGesHxrCQCIo2zxX5v0QEMLGEtF54It09HCA47rszhvTuszuYqUauyzTrK79i6XnA1wK5knvOmiICvSRKiG19oQrmvZjDN45___JdlrxOWFhzscF2UW4RJBRR4MxQkiGfOXksnc0eKHXdBUCVuXsPcDiUfZd0QsqDpHdv3vkLbteKwkld-8JPycHdz6mtZt5SYNvKHPvMttYgDC_upW8OE0D51Mwbb6HjfTfirJdajmE1Eng88I',
    role: 'Senior Developer',
    organizationId: 'org1'
  },
  {
    id: 'u3',
    name: 'James Smith',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7aZzPUhp8_H6o3H5CDZuAk3G1T8un70AaVYmNkjDZwdt29Z6YUqkoZMqK4ozcnvROQYK1Nk2uRxLwnvZu5yBqmtrcPDvbAsB6FDHTTt3-nXrKX-cWxXq2nxkWxx_uR2SUI-O3rd4d8EL8-WgElgn3HLKL0afMVkm_ReIQ5Gz3YmosfdXygmPNPpnDfsXaZxT-4EEmnWnc-vwXHT3rGvDrAPNlpJCZaLwgP89i2WHAqp1EFheiXF-Uh1BMtGltXHjdU1egehTAnvw',
    role: 'Frontend Lead',
    organizationId: 'org2'
  },
  {
    id: 'u4',
    name: 'Alice Morgan',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMmPu1TikaV42YPfbk-UwtDBN-I7ZAxLvBt7RteJJyBaTp0sehMsyCdn-UGzyCKQPFBJ2i8jbU4jid-NFpDf8KQOu1X-vJZcgqD3VyA-u_khwwsq0m5V83k381-5ZJPfDpfzbLf2wfXnEKGo_75N0GM-QIG61h-HotTv71bkwQZ-0iLBdObmPmUioA7q7FxBSYYpzT-vj8Qjxv901Mzpvmu9UXxgui12EzkGI3oIZ2xjJsprZy0Frx9c5aXS8kAFTbFjzAYFwIj0E',
    role: 'DevOps Engineer',
    organizationId: 'org2'
  }
];

export const ISSUES: Issue[] = [
  {
    id: '1',
    key: 'ALPHA-1024',
    title: 'Implementation of real-time WebSocket notifications',
    description: 'Currently, users must refresh their browsers to see task status updates. We need to implement a robust WebSocket infrastructure.',
    status: 'In Progress',
    priority: 'Critical',
    assignee: [USERS[0]],
    reporter: USERS[1],
    type: 'Story',
    points: 8,
    createdAt: '2 days ago',
    updatedAt: 'Today at 4:32 PM'
  },
  {
    id: '2',
    key: 'ALP-142',
    title: 'Implement SSO authentication with Azure AD',
    description: 'Necessary for enterprise clients requiring centralized identity management.',
    status: 'In Progress',
    priority: 'High',
    assignee: [USERS[2]],
    reporter: USERS[0],
    type: 'Task',
    points: 8,
    createdAt: '4 days ago',
    updatedAt: 'Yesterday'
  },
  {
    id: '3',
    key: 'TRK-402',
    title: 'Memory leak in dashboard widget rendering',
    description: 'Investigate leak in D3 chart components on resize.',
    status: 'In Progress',
    priority: 'Critical',
    assignee: [USERS[1], USERS[2]],
    reporter: USERS[3],
    type: 'Bug',
    createdAt: '3 days ago',
    updatedAt: '2 hours ago'
  },
  {
    id: '4',
    key: 'TRK-385',
    title: 'OAuth2.0 flow regression on mobile web',
    description: 'Redirects failing on iOS Safari in private mode.',
    status: 'Blocked',
    priority: 'High',
    assignee: [USERS[3]],
    reporter: USERS[1],
    type: 'Bug',
    createdAt: '5 days ago',
    updatedAt: 'Overdue'
  }
];

export const MILESTONES: Milestone[] = [
  {
    id: 'm1',
    title: 'Beta Launch: Project Alpha',
    description: 'Internal stakeholder review & stability testing.',
    date: '12',
    month: 'OCT',
    status: 'On Track',
    assignees: [USERS[0], USERS[1]]
  },
  {
    id: 'm2',
    title: 'V1.2 Feature Freeze',
    description: 'Finalizing logic for multi-tenant support.',
    date: '28',
    month: 'OCT',
    status: 'High Priority',
    assignees: [USERS[2]]
  },
  {
    id: 'm3',
    title: 'Stakeholder Review',
    description: 'Q4 Strategy alignment and budget approval',
    date: '04',
    month: 'NOV',
    status: 'Strategic'
  }
];

export const ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    user: USERS[0],
    action: 'updated Issue #402',
    target: 'Memory leak in dashboard',
    time: '2 minutes ago',
    type: 'edit'
  },
  {
    id: 'a2',
    user: USERS[1],
    action: 'completed "API Integration"',
    target: 'Backend Service',
    time: '45 minutes ago',
    type: 'check_circle'
  },
  {
    id: 'a3',
    user: { ...USERS[1], name: 'System' },
    action: 'flagged High Priority Bug #551',
    target: 'Production Alert',
    time: '3 hours ago',
    type: 'priority_high'
  }
];
