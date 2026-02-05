import React, { useMemo, useState } from 'react';
import { useThemeSystem } from '@/contexts/useThemeSystem';
import { cn } from '@/lib/utils';
import type { AgentData, AgentStatus } from '@/types/agent';

interface AgentCardProps {
  agent: AgentData;
  onTerminate: (agentId: string) => Promise<void>;
  onViewLogs?: (agentId: string) => void;
}

const STATUS_CONFIG: Record<AgentStatus, { color: string; label: string; pulse?: boolean }> = {
  pending: {
    color: 'var(--status-warning)',
    label: 'Pending',
    pulse: false,
  },
  active: {
    color: 'var(--status-success)',
    label: 'Active',
    pulse: true,
  },
  completed: {
    color: 'var(--status-info)',
    label: 'Completed',
    pulse: false,
  },
  failed: {
    color: 'var(--status-error)',
    label: 'Failed',
    pulse: false,
  },
  terminating: {
    color: 'var(--status-warning)',
    label: 'Terminating',
    pulse: false,
  },
};

const formatDuration = (startTime: number | null): string => {
  if (!startTime) return '--:--';

  const elapsed = Date.now() - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const truncateTask = (task: string, maxLength: number = 80): string => {
  if (!task) return 'No task description';
  if (task.length <= maxLength) return task;
  return task.slice(0, maxLength - 3) + '...';
};

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onTerminate,
  onViewLogs,
}) => {
  const { currentTheme } = useThemeSystem();
  const [isHovered, setIsHovered] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  const statusConfig = STATUS_CONFIG[agent.status];
  const canTerminate = agent.status === 'active' || agent.status === 'pending';
  const duration = useMemo(() => formatDuration(agent.startTime), [agent.startTime]);

  const handleTerminate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTerminating) return;

    setIsTerminating(true);
    try {
      await onTerminate(agent.id);
    } finally {
      setIsTerminating(false);
    }
  };

  const handleViewLogs = () => {
    onViewLogs?.(agent.id);
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:shadow-lg',
        'group overflow-hidden'
      )}
      style={{
        backgroundColor: currentTheme.colors.surface.elevated,
        borderColor: isHovered
          ? currentTheme.colors.interactive.borderHover
          : currentTheme.colors.interactive.border,
        backdropFilter: 'blur(8px)',
        boxShadow: isHovered
          ? `0 8px 30px ${currentTheme.colors.interactive.hover}`
          : `0 2px 8px ${currentTheme.colors.interactive.border}20`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {statusConfig.pulse && agent.status === 'active' && (
        <div
          className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: statusConfig.color }}
        />
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm truncate"
              style={{
                color: currentTheme.colors.surface.foreground,
                fontFamily: currentTheme.config?.fonts?.sans,
              }}
            >
              {agent.persona || agent.id.slice(0, 8)}
            </h3>
            <p
              className="text-xs mt-0.5 font-mono truncate"
              style={{ color: currentTheme.colors.surface.mutedForeground }}
            >
              {agent.id.slice(0, 12)}
            </p>
          </div>

          <div
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium flex-shrink-0',
              'transition-colors duration-200'
            )}
            style={{
              backgroundColor: `${statusConfig.color}20`,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.color}40`,
            }}
          >
            {statusConfig.label}
          </div>
        </div>

        <div className="space-y-2">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: currentTheme.colors.surface.mutedForeground }}
          >
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="truncate">
              <span className="font-medium">{agent.branch}</span>
              {agent.metadata.baseBranch && (
                <>
                  {' '}
                  <span style={{ color: currentTheme.colors.surface.mutedForeground }}>
                    ←
                  </span>{' '}
                  {agent.metadata.baseBranch}
                </>
              )}
            </span>
          </div>

          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: currentTheme.colors.surface.mutedForeground }}
          >
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{duration}</span>
          </div>

          {agent.skillset.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.skillset.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: currentTheme.colors.surface.muted,
                    color: currentTheme.colors.surface.mutedForeground,
                    border: `1px solid ${currentTheme.colors.interactive.border}`,
                  }}
                >
                  {skill}
                </span>
              ))}
              {agent.skillset.length > 3 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: currentTheme.colors.surface.muted,
                    color: currentTheme.colors.surface.mutedForeground,
                    border: `1px solid ${currentTheme.colors.interactive.border}`,
                  }}
                >
                  +{agent.skillset.length - 3}
                </span>
              )}
            </div>
          )}

          {agent.metadata.task && (
            <div
              className="text-xs pt-2 border-t"
              style={{
                color: currentTheme.colors.surface.mutedForeground,
                borderColor: currentTheme.colors.interactive.border,
              }}
            >
              <p className="line-clamp-2">
                {truncateTask(agent.metadata.task)}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleViewLogs}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium',
              'transition-all duration-200 ease-out',
              'hover:brightness-110 active:scale-95'
            )}
            style={{
              backgroundColor: currentTheme.colors.surface.muted,
              color: currentTheme.colors.surface.foreground,
              border: `1px solid ${currentTheme.colors.interactive.border}`,
            }}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Logs
          </button>

          {canTerminate && (
            <button
              onClick={handleTerminate}
              disabled={isTerminating}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium',
                'transition-all duration-200 ease-out',
                'hover:brightness-110 active:scale-95',
                isTerminating && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                backgroundColor: `${currentTheme.colors.status.error}20`,
                color: currentTheme.colors.status.error,
                border: `1px solid ${currentTheme.colors.status.error}40`,
              }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              {isTerminating ? 'Stopping...' : 'Terminate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
