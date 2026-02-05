import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorktreeGraph, type AgentNode } from '../../components/agents/WorktreeGraph';

vi.mock('@/contexts/useThemeSystem', () => ({
  useThemeSystem: vi.fn(() => ({
    currentTheme: {
      colors: {
        surface: {
          background: '#ffffff',
          foreground: '#000000',
          muted: '#f5f5f5',
          mutedForeground: '#888888',
          elevated: '#fafafa',
        },
        status: {
          success: '#10b981',
          successBackground: '#d1fae5',
          info: '#3b82f6',
          infoBackground: '#dbeafe',
          error: '#ef4444',
          errorBackground: '#fee2e2',
          warning: '#f59e0b',
          warningBackground: '#fef3c7',
        },
        interactive: {
          border: '#e5e7eb',
          borderHover: '#d1d5db',
        },
        primary: {
          base: '#3b82f6',
        },
      },
    },
  })),
}));

describe('WorktreeGraph', () => {
  const mockAgents: AgentNode[] = [
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

  const mockOnNodeClick = vi.fn();
  const mockOnNodeHover = vi.fn();

  describe('rendering', () => {
    it('should render SVG element', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      expect(svg).toBeInTheDocument();
    });

    it('should render base branch node', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should render agent nodes', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 3')).toBeInTheDocument();
    });

    it('should render branch names on agent nodes', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('agent/test-agent-1')).toBeInTheDocument();
      expect(screen.getByText('agent/test-agent-2')).toBeInTheDocument();
      expect(screen.getByText('agent/test-agent-3')).toBeInTheDocument();
    });

    it('should render edges between base and agent nodes', () => {
      const { container } = render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render arrowheads on edges', () => {
      const { container } = render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const markers = container.querySelectorAll('marker');
      expect(markers.length).toBeGreaterThan(0);
    });
  });

  describe('node interactions', () => {
    it('should call onNodeClick when clicking an agent node', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(mockOnNodeClick).toHaveBeenCalledWith(
            expect.objectContaining({ id: mockAgents[0].id })
          );
        });
      }
    });

    it('should call onNodeHover when hovering over an agent node', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.mouseEnter(nodes[1]);
        
        await waitFor(() => {
          expect(mockOnNodeHover).toHaveBeenCalledWith(
            expect.objectContaining({ id: mockAgents[0].id })
          );
        });
      }
    });

    it('should call onNodeHover with null when leaving a node', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.mouseEnter(nodes[1]);
        fireEvent.mouseLeave(nodes[1]);
        
        await waitFor(() => {
          expect(mockOnNodeHover).toHaveBeenCalledWith(null);
        });
      }
    });

    it('should display node details when clicked', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        });
      }
    });
  });

  describe('zoom controls', () => {
    it('should render zoom in button', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      expect(zoomInButton).toBeInTheDocument();
    });

    it('should render zoom out button', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const zoomOutButton = screen.getByLabelText(/zoom out/i);
      expect(zoomOutButton).toBeInTheDocument();
    });

    it('should render reset view button', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const resetButton = screen.getByLabelText(/reset/i);
      expect(resetButton).toBeInTheDocument();
    });

    it('should display current zoom level', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should increase zoom level when clicking zoom in', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      fireEvent.click(zoomInButton);

      expect(screen.getByText('120%')).toBeInTheDocument();
    });

    it('should decrease zoom level when clicking zoom out', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const zoomOutButton = screen.getByLabelText(/zoom out/i);
      fireEvent.click(zoomOutButton);

      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should reset zoom when clicking reset button', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      fireEvent.click(zoomInButton);

      const resetButton = screen.getByLabelText(/reset/i);
      fireEvent.click(resetButton);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should respect minimum zoom level', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const zoomOutButton = screen.getByLabelText(/zoom out/i);
      
      for (let i = 0; i < 20; i++) {
        fireEvent.click(zoomOutButton);
      }

      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should respect maximum zoom level', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      
      for (let i = 0; i < 20; i++) {
        fireEvent.click(zoomInButton);
      }

      expect(screen.getByText('300%')).toBeInTheDocument();
    });
  });

  describe('pan controls', () => {
    it('should pan when dragging the canvas', async () => {
      const { container } = render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = container.querySelector('svg');
      if (svg) {
        fireEvent.mouseDown(svg);
        fireEvent.mouseMove(svg, { clientX: 50, clientY: 50 });
        fireEvent.mouseUp(svg);

        const transformGroup = container.querySelector('g[transform*="translate"]');
        expect(transformGroup).toBeInTheDocument();
      }
    });

    it('should update pan position on mouse move', async () => {
      const { container } = render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = container.querySelector('svg');
      if (svg) {
        fireEvent.mouseDown(svg);
        fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 });
        fireEvent.mouseUp(svg);

        const transformGroup = container.querySelector('g[transform*="translate"]');
        expect(transformGroup).toHaveAttribute('transform', expect.stringContaining('translate'));
      }
    });

    it('should stop panning on mouse up', async () => {
      const { container } = render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = container.querySelector('svg');
      if (svg) {
        fireEvent.mouseDown(svg);
        fireEvent.mouseMove(svg, { clientX: 50, clientY: 50 });
        fireEvent.mouseUp(svg);
        fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 });

        const transformGroup = container.querySelector('g[transform*="translate"]');
        const transform = transformGroup?.getAttribute('transform');
        const x = transform?.match(/translate\(([^,]+)/)?.[1];
        expect(x).not.toContain('150');
      }
    });
  });

  describe('status indicators', () => {
    it('should display correct status color for active agents', () => {
      const activeAgents: AgentNode[] = [
        {
          ...mockAgents[0],
          status: 'active',
        },
      ];

      render(
        <WorktreeGraph
          baseBranch="main"
          agents={activeAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should display correct status color for completed agents', () => {
      const completedAgents: AgentNode[] = [
        {
          ...mockAgents[1],
          status: 'completed',
        },
      ];

      render(
        <WorktreeGraph
          baseBranch="main"
          agents={completedAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should display correct status color for failed agents', () => {
      const failedAgents: AgentNode[] = [
        {
          ...mockAgents[2],
          status: 'failed',
        },
      ];

      render(
        <WorktreeGraph
          baseBranch="main"
          agents={failedAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  describe('node details panel', () => {
    it('should not display panel initially', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.queryByText('Status:')).not.toBeInTheDocument();
    });

    it('should display panel after clicking node', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(screen.getByText('Status:')).toBeInTheDocument();
        });
      }
    });

    it('should display agent name in panel', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        });
      }
    });

    it('should display agent status in panel', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(screen.getByText('active')).toBeInTheDocument();
        });
      }
    });

    it('should display branch name in panel', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(screen.getByText('Branch:')).toBeInTheDocument();
          expect(screen.getByText('agent/test-agent-1')).toBeInTheDocument();
        });
      }
    });

    it('should close panel when clicking close button', async () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={mockAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(screen.getByText('Status:')).toBeInTheDocument();
        });

        const closeButton = screen.getByLabelText(/close/i);
        fireEvent.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByText('Status:')).not.toBeInTheDocument();
        });
      }
    });

    it('should display error message for failed agents', async () => {
      const failedAgents: AgentNode[] = [
        {
          ...mockAgents[2],
          status: 'failed',
          error: 'Process error',
        },
      ];

      render(
        <WorktreeGraph
          baseBranch="main"
          agents={failedAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      const svg = screen.getByRole('img');
      const nodes = svg.querySelectorAll('g[transform*="translate"]');
      
      if (nodes.length > 1) {
        fireEvent.click(nodes[1]);
        
        await waitFor(() => {
          expect(screen.getByText('Process error')).toBeInTheDocument();
        });
      }
    });
  });

  describe('edge cases', () => {
    it('should render empty graph with no agents', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={[]}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should render graph with single agent', () => {
      render(
        <WorktreeGraph
          baseBranch="main"
          agents={[mockAgents[0]]}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should handle agents with optional fields missing', () => {
      const minimalAgents: AgentNode[] = [
        {
          id: 'agent-1',
          name: 'Minimal Agent',
          type: 'subagent',
          status: 'pending',
          branchName: 'agent/minimal',
          baseBranch: 'main',
          worktreePath: '/path/minimal',
          createdAt: Date.now(),
        },
      ];

      render(
        <WorktreeGraph
          baseBranch="main"
          agents={minimalAgents}
          onNodeClick={mockOnNodeClick}
          onNodeHover={mockOnNodeHover}
        />
      );

      expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
    });
  });
});
