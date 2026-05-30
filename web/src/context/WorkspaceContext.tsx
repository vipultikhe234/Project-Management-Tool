import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export interface TicketType {
  uuid: string;
  key: string;
  title: string;
  description: string;
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

export interface SprintType {
  uuid: string;
  board_uuid?: string;
  project_uuid?: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  goal: string | null;
  status: string;
  tickets_count: number;
  created_at?: string;
}

export interface ProjectType {
  uuid: string;
  key: string;
  name: string;
  allowed_types?: string[];
  boards: Array<{ uuid: string; name: string }>;
  members?: Array<{ uuid: string; name: string; avatar: string }>;
  organization_uuid?: string;
}

interface WorkspaceContextProps {
  projects: ProjectType[];
  activeProject: ProjectType | null;
  sprints: SprintType[];
  tickets: TicketType[];
  epics: TicketType[];
  loading: boolean;
  setActiveProject: (project: ProjectType | null) => void;
  refreshWorkspaceData: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectType | null>(null);
  const [sprints, setSprints] = useState<SprintType[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [epics, setEpics] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const orgUuid = localStorage.getItem('selected_org_uuid') || user?.organizations?.[0]?.uuid || '';

  const refreshWorkspaceData = async () => {
    if (!orgUuid) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/workspace/bootstrap', {
        params: { organization_uuid: orgUuid }
      });
      const data = response.data.data;
      const fetchedProjects = data.projects || [];
      setProjects(fetchedProjects);
      setSprints(data.sprints || []);
      
      const allTickets = data.tickets || [];
      setTickets(allTickets);
      setEpics(allTickets.filter((t: TicketType) => t.type === 'Epic'));

      // Resolve active project
      if (fetchedProjects.length > 0) {
        setActiveProject(prev => {
          if (!prev) {
            if (fetchedProjects.length > 1) {
              const allMembers = Array.from(
                new Map(fetchedProjects.flatMap((p: any) => p.members || []).map((m: any) => [m.uuid, m])).values()
              );
              return {
                uuid: 'all',
                key: 'ALL',
                name: 'All Projects',
                boards: [],
                members: allMembers
              } as any;
            }
            return fetchedProjects[0];
          }
          const found = fetchedProjects.find((p: any) => p.uuid === prev.uuid);
          return found || fetchedProjects[0];
        });
      }
    } catch (err) {
      console.error('Failed to bootstrap workspace data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspaceData();
  }, [orgUuid]);

  return (
    <WorkspaceContext.Provider value={{
      projects,
      activeProject,
      sprints,
      tickets,
      epics,
      loading,
      setActiveProject,
      refreshWorkspaceData
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
