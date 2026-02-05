import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  spawnAgent,
  getAllAgents,
  getAgent,
  terminateAgent,
  startAgentProcess,
  getAgentWorktrees,
  cleanupStaleAgents,
  AGENT_STATUS,
} from '../lib/git-worktree-service.js';
import { addWorktree, removeWorktree, getWorktrees } from '../lib/git-service.js';

vi.mock('../lib/git-service.js', () => ({
  addWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  getWorktrees: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(() => Promise.resolve()),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('process', () => ({
  kill: vi.fn(),
}));

describe('git-worktree-service', () => {
  const mockProjectDir = '/mock/project';
  const mockAgentName = 'Test Agent';
  const mockBaseBranch = 'main';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue('{"agents":[]}');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('spawnAgent', () => {
    it('should spawn a new agent with correct properties', async () => {
      addWorktree.mockResolvedValue({ success: true });

      const agent = await spawnAgent({
        projectDirectory: mockProjectDir,
        agentName: mockAgentName,
        agentType: 'subagent',
        task: 'Test task',
        baseBranch: mockBaseBranch,
      });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe(mockAgentName);
      expect(agent.type).toBe('subagent');
      expect(agent.status).toBe(AGENT_STATUS.ACTIVE);
      expect(agent.projectDirectory).toBe(mockProjectDir);
      expect(agent.baseBranch).toBe(mockBaseBranch);
      expect(agent.startedAt).toBeDefined();
    });

    it('should create a worktree with correct branch name', async () => {
      addWorktree.mockResolvedValue({ success: true });

      await spawnAgent({
        projectDirectory: mockProjectDir,
        agentName: mockAgentName,
        baseBranch: mockBaseBranch,
      });

      expect(addWorktree).toHaveBeenCalledWith(
        mockProjectDir,
        expect.stringContaining('.opencode/worktrees/'),
        expect.stringContaining('agent/test-agent-'),
        { createBranch: true, startPoint: mockBaseBranch }
      );
    });

    it('should use provided branch name if given', async () => {
      addWorktree.mockResolvedValue({ success: true });
      const customBranch = 'feature/custom-branch';

      const agent = await spawnAgent({
        projectDirectory: mockProjectDir,
        agentName: mockAgentName,
        branchName: customBranch,
        baseBranch: mockBaseBranch,
      });

      expect(agent.branchName).toBe(customBranch);
    });

    it('should throw error if projectDirectory is missing', async () => {
      await expect(
        spawnAgent({
          agentName: mockAgentName,
          baseBranch: mockBaseBranch,
        })
      ).rejects.toThrow('projectDirectory is required');
    });

    it('should throw error if agentName is missing', async () => {
      await expect(
        spawnAgent({
          projectDirectory: mockProjectDir,
          baseBranch: mockBaseBranch,
        })
      ).rejects.toThrow('agentName is required');
    });

    it('should fail if worktree creation fails', async () => {
      addWorktree.mockResolvedValue({ success: false });

      await expect(
        spawnAgent({
          projectDirectory: mockProjectDir,
          agentName: mockAgentName,
          baseBranch: mockBaseBranch,
        })
      ).rejects.toThrow('Failed to create worktree');
    });

    it('should enforce maximum concurrent agents limit', async () => {
      addWorktree.mockResolvedValue({ success: true });
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({
        agents: Array(10).fill(null).map((_, i) => ({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          type: 'subagent',
          status: AGENT_STATUS.ACTIVE,
          projectDirectory: mockProjectDir,
          worktreePath: `/path/${i}`,
          branchName: `branch-${i}`,
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
        }))
      }));

      await expect(
        spawnAgent({
          projectDirectory: mockProjectDir,
          agentName: mockAgentName,
          baseBranch: mockBaseBranch,
        })
      ).rejects.toThrow('Maximum of 10 concurrent active agents reached');
    });
  });

  describe('getAllAgents', () => {
    it('should return all agents', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'subagent',
          status: AGENT_STATUS.ACTIVE,
          projectDirectory: mockProjectDir,
          worktreePath: '/path/1',
          branchName: 'branch-1',
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
        },
      ];
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: mockAgents }));

      const agents = await getAllAgents();

      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('agent-1');
    });

    it('should filter by status', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'subagent',
          status: AGENT_STATUS.ACTIVE,
          projectDirectory: mockProjectDir,
          worktreePath: '/path/1',
          branchName: 'branch-1',
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'subagent',
          status: AGENT_STATUS.COMPLETED,
          projectDirectory: mockProjectDir,
          worktreePath: '/path/2',
          branchName: 'branch-2',
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
          completedAt: Date.now(),
        },
      ];
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: mockAgents }));

      const activeAgents = await getAllAgents({ status: AGENT_STATUS.ACTIVE });

      expect(activeAgents).toHaveLength(1);
      expect(activeAgents[0].status).toBe(AGENT_STATUS.ACTIVE);
    });

    it('should filter by projectDirectory', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'subagent',
          status: AGENT_STATUS.ACTIVE,
          projectDirectory: mockProjectDir,
          worktreePath: '/path/1',
          branchName: 'branch-1',
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'subagent',
          status: AGENT_STATUS.ACTIVE,
          projectDirectory: '/other/project',
          worktreePath: '/path/2',
          branchName: 'branch-2',
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
        },
      ];
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: mockAgents }));

      const projectAgents = await getAllAgents({ projectDirectory: mockProjectDir });

      expect(projectAgents).toHaveLength(1);
      expect(projectAgents[0].projectDirectory).toBe(mockProjectDir);
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', async () => {
      const agentId = 'agent-1';
      const mockAgents = [
        {
          id: agentId,
          name: 'Agent 1',
          type: 'subagent',
          status: AGENT_STATUS.ACTIVE,
          projectDirectory: mockProjectDir,
          worktreePath: '/path/1',
          branchName: 'branch-1',
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
        },
      ];
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: mockAgents }));

      const agent = await getAgent(agentId);

      expect(agent).toBeDefined();
      expect(agent.id).toBe(agentId);
    });

    it('should return null for non-existent agent', async () => {
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: [] }));

      const agent = await getAgent('non-existent');

      expect(agent).toBeNull();
    });
  });

  describe('terminateAgent', () => {
    it('should terminate an agent successfully', async () => {
      const agentId = 'agent-1';
      const mockAgent = {
        id: agentId,
        name: 'Agent 1',
        type: 'subagent',
        status: AGENT_STATUS.ACTIVE,
        projectDirectory: mockProjectDir,
        worktreePath: '/path/1',
        branchName: 'branch-1',
        baseBranch: mockBaseBranch,
        processId: 12345,
        createdAt: Date.now(),
      };
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: [mockAgent] }));
      vi.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();

      const result = await terminateAgent(agentId);

      expect(result).toEqual({ success: true });
      expect(require('process').kill).toHaveBeenCalledWith(12345);
      expect(removeWorktree).toHaveBeenCalledWith(mockProjectDir, '/path/1', { force: true });
    });

    it('should throw error for non-existent agent', async () => {
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: [] }));

      await expect(terminateAgent('non-existent')).rejects.toThrow('Agent not found');
    });

    it('should handle process kill errors gracefully', async () => {
      const agentId = 'agent-1';
      const mockAgent = {
        id: agentId,
        name: 'Agent 1',
        type: 'subagent',
        status: AGENT_STATUS.ACTIVE,
        projectDirectory: mockProjectDir,
        worktreePath: '/path/1',
        branchName: 'branch-1',
        baseBranch: mockBaseBranch,
        processId: 12345,
        createdAt: Date.now(),
      };
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: [mockAgent] }));
      vi.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();
      vi.spyOn(require('process'), 'kill').mockImplementation(() => {
        throw new Error('Process not found');
      });
      removeWorktree.mockResolvedValue({ success: true });

      const result = await terminateAgent(agentId);

      expect(result).toEqual({ success: true });
    });
  });

  describe('startAgentProcess', () => {
    it('should start a process for an active agent', async () => {
      const agentId = 'agent-1';
      const mockAgent = {
        id: agentId,
        name: 'Agent 1',
        type: 'subagent',
        status: AGENT_STATUS.ACTIVE,
        projectDirectory: mockProjectDir,
        worktreePath: '/path/1',
        branchName: 'branch-1',
        baseBranch: mockBaseBranch,
        createdAt: Date.now(),
      };
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: [mockAgent] }));
      vi.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();

      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };
      vi.mocked(require('child_process').spawn).mockReturnValue(mockChildProcess);

      const process = await startAgentProcess(agentId, 'node', ['script.js']);

      expect(process).toBeDefined();
      expect(process.pid).toBe(12345);
    });

    it('should throw error for non-existent agent', async () => {
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: [] }));

      await expect(startAgentProcess('non-existent', 'node')).rejects.toThrow('Agent not found');
    });

    it('should throw error if agent is not active', async () => {
      const agentId = 'agent-1';
      const mockAgent = {
        id: agentId,
        name: 'Agent 1',
        type: 'subagent',
        status: AGENT_STATUS.PENDING,
        projectDirectory: mockProjectDir,
        worktreePath: '/path/1',
        branchName: 'branch-1',
        baseBranch: mockBaseBranch,
        createdAt: Date.now(),
      };
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: [mockAgent] }));

      await expect(startAgentProcess(agentId, 'node')).rejects.toThrow('Agent is not in active status');
    });
  });

  describe('getAgentWorktrees', () => {
    it('should return worktrees for agents', async () => {
      const mockWorktrees = [
        {
          worktree: '/mock/project/.opencode/worktrees/agent-1',
          commit: 'abc123',
          branch: 'agent/test-agent',
        },
      ];
      getWorktrees.mockResolvedValue(mockWorktrees);
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({
        agents: [
          {
            id: 'agent-1',
            worktreePath: '/mock/project/.opencode/worktrees/agent-1',
            name: 'Test Agent',
            status: AGENT_STATUS.ACTIVE,
            branch: 'agent/test-agent',
          },
        ]
      }));

      const agentWorktrees = await getAgentWorktrees(mockProjectDir);

      expect(agentWorktrees).toHaveLength(1);
      expect(agentWorktrees[0].agentId).toBe('agent-1');
      expect(agentWorktrees[0].agentName).toBe('Test Agent');
    });

    it('should filter out non-agent worktrees', async () => {
      const mockWorktrees = [
        {
          worktree: '/mock/project/.opencode/worktrees/agent-1',
          commit: 'abc123',
          branch: 'agent/test-agent',
        },
        {
          worktree: '/mock/project/worktrees/other',
          commit: 'def456',
          branch: 'feature/other',
        },
      ];
      getWorktrees.mockResolvedValue(mockWorktrees);
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({
        agents: [
          {
            id: 'agent-1',
            worktreePath: '/mock/project/.opencode/worktrees/agent-1',
            name: 'Test Agent',
            status: AGENT_STATUS.ACTIVE,
            branch: 'agent/test-agent',
          },
        ]
      }));

      const agentWorktrees = await getAgentWorktrees(mockProjectDir);

      expect(agentWorktrees).toHaveLength(1);
    });
  });

  describe('cleanupStaleAgents', () => {
    it('should remove old completed/failed agents with no worktree', async () => {
      const oldDate = Date.now() - 25 * 60 * 60 * 1000;
      const mockAgents = [
        {
          id: 'old-agent',
          name: 'Old Agent',
          type: 'subagent',
          status: AGENT_STATUS.COMPLETED,
          projectDirectory: mockProjectDir,
          worktreePath: '/old/path',
          branchName: 'old-branch',
          baseBranch: mockBaseBranch,
          completedAt: oldDate,
        },
        {
          id: 'active-agent',
          name: 'Active Agent',
          type: 'subagent',
          status: AGENT_STATUS.ACTIVE,
          projectDirectory: mockProjectDir,
          worktreePath: '/active/path',
          branchName: 'active-branch',
          baseBranch: mockBaseBranch,
          createdAt: Date.now(),
        },
      ];
      getWorktrees.mockResolvedValue([]);
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: mockAgents }));
      vi.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();

      const result = await cleanupStaleAgents(mockProjectDir);

      expect(result.cleaned).toBe(1);
    });

    it('should not remove agents with existing worktrees', async () => {
      const oldDate = Date.now() - 25 * 60 * 60 * 1000;
      const mockAgents = [
        {
          id: 'old-agent',
          name: 'Old Agent',
          type: 'subagent',
          status: AGENT_STATUS.COMPLETED,
          projectDirectory: mockProjectDir,
          worktreePath: '/old/path',
          branchName: 'old-branch',
          baseBranch: mockBaseBranch,
          completedAt: oldDate,
        },
      ];
      getWorktrees.mockResolvedValue([{ worktree: '/old/path' }]);
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: mockAgents }));

      const result = await cleanupStaleAgents(mockProjectDir);

      expect(result.cleaned).toBe(0);
    });

    it('should not remove recent agents', async () => {
      const recentDate = Date.now() - 12 * 60 * 60 * 1000;
      const mockAgents = [
        {
          id: 'recent-agent',
          name: 'Recent Agent',
          type: 'subagent',
          status: AGENT_STATUS.COMPLETED,
          projectDirectory: mockProjectDir,
          worktreePath: '/recent/path',
          branchName: 'recent-branch',
          baseBranch: mockBaseBranch,
          completedAt: recentDate,
        },
      ];
      getWorktrees.mockResolvedValue([]);
      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(JSON.stringify({ agents: mockAgents }));

      const result = await cleanupStaleAgents(mockProjectDir);

      expect(result.cleaned).toBe(0);
    });
  });
});
