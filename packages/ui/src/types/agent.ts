export type AgentStatus = 'pending' | 'active' | 'completed' | 'failed' | 'terminating';

export interface AgentData {
  id: string;
  worktree: string;
  branch: string;
  baseBranch?: string;
  status: AgentStatus;
  skillset: string[];
  persona: string;
  pid: number | null;
  startTime: number | null;
  endTime: number | null;
  exitCode: number | null;
  exitSignal: string | null;
  metadata: {
    task?: string;
    projectDirectory?: string;
    baseBranch?: string;
    resourceUsage?: {
      memory?: number;
      cpu?: number;
    };
    [key: string]: string | number | boolean | null | undefined | {
      memory?: number;
      cpu?: number;
    };
  };
}

export interface AgentStats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  failed: number;
  terminating: number;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export type LogLevelFilter = 'all' | 'info' | 'warn' | 'error';
