import React from 'react';
import { useThemeSystem } from '@/contexts/useThemeSystem';
import { AgentCard } from './AgentCard';
import { cn } from '@/lib/utils';
import type { AgentData } from '@/types/agent';

interface AgentDashboardProps {
  agents: AgentData[];
  onTerminate: (agentId: string) => Promise<void>;
  onViewLogs?: (agentId: string) => void;
}

const EmptyState = () => {
  const { currentTheme } = useThemeSystem();

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4"
      style={{ backgroundColor: currentTheme.colors.surface.background }}
    >
      <div
        className="w-20 h-20 mb-4 rounded-full"
        style={{
          backgroundColor: currentTheme.colors.surface.muted,
          border: `1px solid ${currentTheme.colors.interactive.border}`,
        }}
      >
        <div className="flex items-center justify-center h-full">
          <svg
            className="w-10 h-10"
            style={{ color: currentTheme.colors.surface.mutedForeground }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        </div>
      </div>
      <p
        className="text-sm"
        style={{ color: currentTheme.colors.surface.mutedForeground }}
      >
        No active agents
      </p>
      <p
        className="text-xs mt-1 text-center max-w-xs"
        style={{ color: currentTheme.colors.surface.mutedForeground }}
      >
        Spawn agents from the Agent Manager to begin parallel development
      </p>
    </div>
  );
};

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  agents,
  onTerminate,
  onViewLogs,
}) => {
  const { currentTheme } = useThemeSystem();

  if (agents.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="p-4 space-y-4"
      style={{ backgroundColor: currentTheme.colors.surface.background }}
    >
      <div
        className={cn(
          'grid gap-4',
          'grid-cols-1',
          'sm:grid-cols-2',
          'lg:grid-cols-3',
          'xl:grid-cols-4',
          '2xl:grid-cols-5'
        )}
      >
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onTerminate={onTerminate}
            onViewLogs={onViewLogs}
          />
        ))}
      </div>
    </div>
  );
};

export default AgentDashboard;
