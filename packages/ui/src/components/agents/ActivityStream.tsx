import React, { useEffect, useRef, useState } from 'react';
import { useThemeSystem } from '@/contexts/useThemeSystem';
import { cn } from '@/lib/utils';
import type { LogEntry, LogLevelFilter } from '@/types/agent';

interface ActivityStreamProps {
  logs: LogEntry[];
  logLevelFilter: LogLevelFilter;
  onLogLevelChange: (level: LogLevelFilter) => void;
  autoScroll?: boolean;
  maxHeight?: string;
}

const LOG_LEVEL_CONFIG = {
  info: {
    color: 'var(--status-info)',
    label: 'INFO',
  },
  warn: {
    color: 'var(--status-warning)',
    label: 'WARN',
  },
  error: {
    color: 'var(--status-error)',
    label: 'ERROR',
  },
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
};

const LogLevelBadge: React.FC<{ level: 'info' | 'warn' | 'error' }> = ({ level }) => {
  const config = LOG_LEVEL_CONFIG[level];
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {config.label}
    </span>
  );
};

export const ActivityStream: React.FC<ActivityStreamProps> = ({
  logs,
  logLevelFilter,
  onLogLevelChange,
  autoScroll = true,
  maxHeight = '400px',
}) => {
  const { currentTheme } = useThemeSystem();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const filteredLogs = React.useMemo(() => {
    if (logLevelFilter === 'all') return logs;
    return logs.filter((log) => log.level === logLevelFilter);
  }, [logs, logLevelFilter]);

  useEffect(() => {
    if (autoScroll && isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll, isAtBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(isNearBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{
        backgroundColor: currentTheme.colors.surface.elevated,
        borderColor: currentTheme.colors.interactive.border,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          borderColor: currentTheme.colors.interactive.border,
          backgroundColor: `${currentTheme.colors.surface.muted}30`,
        }}
      >
        <h3
          className="text-sm font-semibold"
          style={{
            color: currentTheme.colors.surface.foreground,
            fontFamily: currentTheme.config?.fonts?.sans,
          }}
        >
          Activity Stream
        </h3>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(['all', 'info', 'warn', 'error'] as LogLevelFilter[]).map((level) => (
              <button
                key={level}
                onClick={() => onLogLevelChange(level)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-all duration-200 ease-out',
                  logLevelFilter === level
                    ? 'brightness-110'
                    : 'hover:brightness-110'
                )}
                style={{
                  backgroundColor:
                    logLevelFilter === level
                      ? LOG_LEVEL_CONFIG[level === 'all' ? 'info' : level].color + '30'
                      : 'transparent',
                  color:
                    logLevelFilter === level
                      ? LOG_LEVEL_CONFIG[level === 'all' ? 'info' : level].color
                      : currentTheme.colors.surface.mutedForeground,
                  border:
                    logLevelFilter === level
                      ? `1px solid ${LOG_LEVEL_CONFIG[level === 'all' ? 'info' : level].color}50`
                      : `1px solid ${currentTheme.colors.interactive.border}`,
                }}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>

          {!isAtBottom && (
            <button
              onClick={scrollToBottom}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-all duration-200 ease-out',
                'hover:brightness-110 active:scale-95'
              )}
              style={{
                backgroundColor: currentTheme.colors.primary.base + '20',
                color: currentTheme.colors.primary.base,
                border: `1px solid ${currentTheme.colors.primary.base}40`,
              }}
            >
              ↓
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto px-4 py-3 space-y-1"
        style={{
          maxHeight,
          backgroundColor: currentTheme.colors.syntax.base.background,
          fontFamily: currentTheme.config?.fonts?.mono,
        }}
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8"
            style={{ color: currentTheme.colors.surface.mutedForeground }}
          >
            <svg
              className="w-8 h-8 mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-xs">No logs to display</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 py-1.5 px-2 rounded',
                'transition-all duration-150 ease-out',
                'hover:bg-[var(--interactive-hover)]50'
              )}
              style={{
                borderLeft: `2px solid ${LOG_LEVEL_CONFIG[log.level].color}`,
              }}
            >
              <span
                className="text-[10px] font-mono flex-shrink-0"
                style={{ color: currentTheme.colors.surface.mutedForeground }}
              >
                {formatTimestamp(log.timestamp)}
              </span>

              <LogLevelBadge level={log.level} />

              <span
                className="text-xs font-mono flex-1 break-all whitespace-pre-wrap"
                style={{ color: currentTheme.colors.syntax.base.foreground }}
              >
                {log.message}
              </span>

              {log.data && (
                <details className="group">
                  <summary
                    className="cursor-pointer text-[10px] font-mono ml-2"
                    style={{ color: currentTheme.colors.surface.mutedForeground }}
                  >
                    ▶
                  </summary>
                  <pre
                    className="mt-1 text-[10px] font-mono p-2 rounded overflow-x-auto"
                    style={{
                      backgroundColor: currentTheme.colors.surface.muted,
                      color: currentTheme.colors.syntax.base.foreground,
                      border: `1px solid ${currentTheme.colors.interactive.border}`,
                    }}
                  >
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityStream;
