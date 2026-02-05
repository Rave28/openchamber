import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentDashboard } from '../../components/agents/AgentDashboard';
import type { AgentData } from '../../types/agent';

vi.mock('@/contexts/useThemeSystem', () => ({
  useThemeSystem: vi.fn(() => ({
    currentTheme: {
      colors: {
        surface: {
          background: '#ffffff',
          foreground: '#000000',
          muted: '#f5f5f5',
          mutedForeground: '#888888',
        },
      },
    },
  })),
}));

vi.mock('./AgentCard', () => ({
  AgentCard: ({ agent, onTerminate, onViewLogs }: any) => (
    <div data-testid={`agent-card-${agent.id}`}>
      <span data-testid="agent-name">{agent.name}</span>
      <span data-testid="agent-status">{agent.status}</span>
      <button onClick={() => onTerminate?.(agent.id)} data-testid="terminate-button">
        Terminate
      </button>
      {onViewLogs && (
        <button onClick={() => onViewLogs?.(agent.id)} data-testid="view-logs-button">
          View Logs
        </button>
      )}
    </div>
  ),
}));

describe('AgentDashboard', () => {
  const mockAgents: AgentData[] = [
    {
      id: 'agent-1',
      name: 'Test Agent 1',
      type: 'subagent',
      status: 'active',
      branchName: 'agent/test-agent-1',
      baseBranch: 'main',
      worktreePath: '/test/worktree-1',
      task: 'Test task 1',
      createdAt: Date.now(),
      startedAt: Date.now(),
    },
    {
      id: 'agent-2',
      name: 'Test Agent 2',
      type: 'subagent',
      status: 'completed',
      branchName: 'agent/test-agent-2',
      baseBranch: 'main',
      worktreePath: '/test/worktree-2',
      task: 'Test task 2',
      createdAt: Date.now() - 60000,
      startedAt: Date.now() - 60000,
      completedAt: Date.now(),
    },
    {
      id: 'agent-3',
      name: 'Test Agent 3',
      type: 'subagent',
      status: 'failed',
      branchName: 'agent/test-agent-3',
      baseBranch: 'main',
      worktreePath: '/test/worktree-3',
      task: 'Test task 3',
      error: 'Process error',
      createdAt: Date.now() - 120000,
      startedAt: Date.now() - 120000,
      completedAt: Date.now(),
    },
  ];

  const mockOnTerminate = vi.fn();
  const mockOnViewLogs = vi.fn();

  describe('rendering', () => {
    it('should render empty state when no agents', () => {
      render(
        <AgentDashboard
          agents={[]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByText('No active agents')).toBeInTheDocument();
    });

    it('should render empty state description', () => {
      render(
        <AgentDashboard
          agents={[]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByText('Spawn agents from Agent Manager to begin parallel development')).toBeInTheDocument();
    });

    it('should render agent cards when agents exist', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByTestId('agent-card-agent-1')).toBeInTheDocument();
      expect(screen.getByTestId('agent-card-agent-2')).toBeInTheDocument();
      expect(screen.getByTestId('agent-card-agent-3')).toBeInTheDocument();
    });

    it('should render agent names', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 3')).toBeInTheDocument();
    });

    it('should render agent statuses', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onTerminate when terminate button clicked', async () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const terminateButton = screen.getByTestId('terminate-button');
      fireEvent.click(terminateButton);

      expect(mockOnTerminate).toHaveBeenCalledWith('agent-1');
    });

    it('should call onViewLogs when view logs button clicked', async () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const viewLogsButton = screen.getByTestId('view-logs-button');
      fireEvent.click(viewLogsButton);

      expect(mockOnViewLogs).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('responsive grid behavior', () => {
    it('should render single column on mobile', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const container = screen.getByTestId('agent-dashboard').parentElement;
      expect(container).toHaveClass('grid-cols-1');
    });

    it('should render 2 columns on tablet (sm breakpoint)', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const container = screen.getByTestId('agent-dashboard').parentElement;
      expect(container).toHaveClass('sm:grid-cols-2');
    });

    it('should render 3 columns on large desktop (lg breakpoint)', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const container = screen.getByTestId('agent-dashboard').parentElement;
      expect(container).toHaveClass('lg:grid-cols-3');
    });

    it('should render 4 columns on extra large desktop (xl breakpoint)', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const container = screen.getByTestId('agent-dashboard').parentElement;
      expect(container).toHaveClass('xl:grid-cols-4');
    });

    it('should render 5 columns on 2xl breakpoint', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const container = screen.getByTestId('agent-dashboard').parentElement;
      expect(container).toHaveClass('2xl:grid-cols-5');
    });
  });

  describe('status indicators', () => {
    it('should display status indicator for active agents', () => {
      render(
        <AgentDashboard
          agents={[mockAgents[0]]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByTestId('agent-status')).toHaveTextContent('active');
    });

    it('should display status indicator for completed agents', () => {
      render(
        <AgentDashboard
          agents={[mockAgents[1]]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByTestId('agent-status')).toHaveTextContent('completed');
    });

    it('should display status indicator for failed agents', () => {
      render(
        <AgentDashboard
          agents={[mockAgents[2]]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByTestId('agent-status')).toHaveTextContent('failed');
    });
  });

  describe('theming', () => {
    it('should use theme colors for background', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const container = screen.getByTestId('agent-dashboard');
      expect(container).toHaveStyle({ backgroundColor: '#ffffff' });
    });
  });

  describe('accessibility', () => {
    it('should have accessible empty state message', () => {
      render(
        <AgentDashboard
          agents={[]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const emptyState = screen.getByRole('status');
      expect(emptyState).toBeInTheDocument();
    });

    it('should have accessible agent cards', () => {
      render(
        <AgentDashboard
          agents={mockAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      const cards = screen.getAllByTestId(/agent-card-/);
      cards.forEach(card => {
        expect(card).toBeVisible();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle large number of agents', () => {
      const manyAgents = Array.from({ length: 20 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        type: 'subagent' as const,
        status: 'active' as const,
        branchName: `agent/branch-${i}`,
        baseBranch: 'main',
        worktreePath: `/path/${i}`,
        task: `Task ${i}`,
        createdAt: Date.now(),
      }));

      render(
        <AgentDashboard
          agents={manyAgents}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getAllByTestId(/agent-card-/)).toHaveLength(20);
    });

    it('should handle agents without optional fields', () => {
      const minimalAgent: AgentData = {
        id: 'agent-minimal',
        name: 'Minimal Agent',
        type: 'subagent',
        status: 'pending',
        branchName: 'agent/minimal',
        baseBranch: 'main',
        worktreePath: '/path/minimal',
        createdAt: Date.now(),
      };

      render(
        <AgentDashboard
          agents={[minimalAgent]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByTestId('agent-card-agent-minimal')).toBeInTheDocument();
      expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
    });

    it('should handle agents with errors', () => {
      const failedAgent: AgentData = {
        id: 'agent-failed',
        name: 'Failed Agent',
        type: 'subagent',
        status: 'failed',
        branchName: 'agent/failed',
        baseBranch: 'main',
        worktreePath: '/path/failed',
        task: 'Test task',
        error: 'Critical error occurred',
        createdAt: Date.now(),
        completedAt: Date.now(),
      };

      render(
        <AgentDashboard
          agents={[failedAgent]}
          onTerminate={mockOnTerminate}
          onViewLogs={mockOnViewLogs}
        />
      );

      expect(screen.getByTestId('agent-status')).toHaveTextContent('failed');
    });
  });
});
