import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentIsolation, getAgentIsolation, resetAgentIsolation } from '../lib/agent-isolation.js';
import { spawnWorktreeAgent, startAgentProcess, terminateAgent, failAgent, completeAgent } from '../lib/git-worktree-service.js';

vi.mock('../lib/git-worktree-service.js', () => ({
  spawnWorktreeAgent: vi.fn(),
  startAgentProcess: vi.fn(),
  terminateAgent: vi.fn(),
  failAgent: vi.fn(),
  completeAgent: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('agent-isolation', () => {
  let isolation;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAgentIsolation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AgentIsolation class', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
    });

    it('should initialize with empty state', () => {
      expect(isolation.activeProcesses.size).toBe(0);
      expect(isolation.resourceMonitors.size).toBe(0);
      expect(isolation.isMonitoring).toBe(false);
    });

    it('should be an EventEmitter', () => {
      expect(isolation.on).toBeDefined();
      expect(isolation.emit).toBeDefined();
      expect(isolation.off).toBeDefined();
    });
  });

  describe('spawnAgentInIsolation', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      spawnWorktreeAgent.mockResolvedValue({
        id: 'test-agent-1',
        worktreePath: '/test/worktree',
        branchName: 'agent/test',
      });
    });

    it('should spawn an agent in isolation', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn() },
      };
      startAgentProcess.mockResolvedValue(mockChildProcess);

      const result = await isolation.spawnAgentInIsolation({
        projectDirectory: '/test/project',
        agentName: 'Test Agent',
        task: 'Test task',
        command: 'node',
        args: ['script.js'],
      });

      expect(result.agentId).toBe('test-agent-1');
      expect(result.pid).toBe(12345);
      expect(result.worktreePath).toBe('/test/worktree');
      expect(result.status).toBe('active');
    });

    it('should build isolated environment variables', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn() },
      };
      startAgentProcess.mockImplementation((id, cmd, args, options) => {
        expect(options.env.AGENT_ID).toBe('test-agent-1');
        expect(options.env.AGENT_WORKTREE).toBe('/test/worktree');
        expect(options.env.AGENT_ISOLATED).toBe('1');
        return Promise.resolve(mockChildProcess);
      });

      await isolation.spawnAgentInIsolation({
        projectDirectory: '/test/project',
        agentName: 'Test Agent',
        task: 'Test task',
      });
    });

    it('should enforce maximum concurrent agents', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn() },
      };
      startAgentProcess.mockResolvedValue(mockChildProcess);

      for (let i = 0; i < 10; i++) {
        spawnWorktreeAgent.mockResolvedValue({
          id: `agent-${i}`,
          worktreePath: `/worktree/${i}`,
          branchName: `branch-${i}`,
        });
        await isolation.spawnAgentInIsolation({
          projectDirectory: '/test/project',
          agentName: `Agent ${i}`,
        });
      }

      await expect(
        isolation.spawnAgentInIsolation({
          projectDirectory: '/test/project',
          agentName: 'Agent 11',
        })
      ).rejects.toThrow('Maximum concurrent agents');
    });

    it('should handle spawn failures gracefully', async () => {
      spawnWorktreeAgent.mockRejectedValue(new Error('Spawn failed'));

      await expect(
        isolation.spawnAgentInIsolation({
          projectDirectory: '/test/project',
          agentName: 'Test Agent',
        })
      ).rejects.toThrow('Spawn failed');
    });

    it('should cleanup on spawn failure', async () => {
      spawnWorktreeAgent.mockRejectedValue(new Error('Spawn failed'));

      try {
        await isolation.spawnAgentInIsolation({
          projectDirectory: '/test/project',
          agentName: 'Test Agent',
        });
      } catch (error) {
        expect(failAgent).toHaveBeenCalled();
      }
    });

    it('should emit agent:spawning event', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn() },
      };
      startAgentProcess.mockResolvedValue(mockChildProcess);

      const emitSpy = vi.spyOn(isolation, 'emit');

      await isolation.spawnAgentInIsolation({
        projectDirectory: '/test/project',
        agentName: 'Test Agent',
      });

      expect(emitSpy).toHaveBeenCalledWith('agent:spawning', {
        agentId: 'test-agent-1',
        agentName: 'Test Agent',
        worktreePath: '/test/worktree',
      });
    });

    it('should emit agent:spawned event on success', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn() },
      };
      startAgentProcess.mockResolvedValue(mockChildProcess);

      const emitSpy = vi.spyOn(isolation, 'emit');

      await isolation.spawnAgentInIsolation({
        projectDirectory: '/test/project',
        agentName: 'Test Agent',
      });

      expect(emitSpy).toHaveBeenCalledWith('agent:spawned', expect.objectContaining({
        agentId: 'test-agent-1',
        pid: 12345,
      }));
    });

    it('should emit agent:spawn-failed event on error', async () => {
      spawnWorktreeAgent.mockRejectedValue(new Error('Spawn failed'));

      const emitSpy = vi.spyOn(isolation, 'emit');

      try {
        await isolation.spawnAgentInIsolation({
          projectDirectory: '/test/project',
          agentName: 'Test Agent',
        });
      } catch (error) {
        expect(emitSpy).toHaveBeenCalledWith('agent:spawn-failed', expect.objectContaining({
          error: 'Spawn failed',
        }));
      }
    });
  });

  describe('setupProcessHandlers', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
    });

    it('should handle process exit with code 0', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            setTimeout(() => handler(0, null), 0);
          }
        }),
        once: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };

      isolation.setupProcessHandlers('agent-1', mockChildProcess);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(completeAgent).toHaveBeenCalledWith('agent-1', { exitCode: 0 });
    });

    it('should handle process exit with non-zero code', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            setTimeout(() => handler(1, null), 0);
          }
        }),
        once: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };

      isolation.setupProcessHandlers('agent-1', mockChildProcess);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(failAgent).toHaveBeenCalledWith('agent-1', expect.any(Error));
    });

    it('should handle process errors', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Process error')), 0);
          }
        }),
        once: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };

      isolation.setupProcessHandlers('agent-1', mockChildProcess);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(failAgent).toHaveBeenCalledWith('agent-1', expect.any(Error));
    });

    it('should handle stdout data', () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        once: vi.fn(),
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('test output'));
            }
          }),
        },
        stderr: { on: vi.fn() },
      };

      const emitSpy = vi.spyOn(isolation, 'emit');

      isolation.setupProcessHandlers('agent-1', mockChildProcess);

      expect(emitSpy).toHaveBeenCalledWith('agent:stdout', {
        agentId: 'agent-1',
        data: 'test output',
      });
    });

    it('should handle stderr data', () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        once: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('test error'));
            }
          }),
        },
      };

      const emitSpy = vi.spyOn(isolation, 'emit');

      isolation.setupProcessHandlers('agent-1', mockChildProcess);

      expect(emitSpy).toHaveBeenCalledWith('agent:stderr', {
        agentId: 'agent-1',
        data: 'test error',
      });
    });
  });

  describe('resource monitoring', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      vi.mocked(require('fs/promises').readFile).mockResolvedValue('12345 0 0 0 0 0 0 0');
    });

    it('should start monitoring for a new agent', async () => {
      const mockChildProcess = { pid: 12345 };

      await isolation.startResourceMonitoring('agent-1', mockChildProcess);

      expect(isolation.resourceMonitors.has('agent-1')).toBe(true);
      expect(isolation.isMonitoring).toBe(true);
    });

    it('should not start monitoring if no pid', async () => {
      const mockChildProcess = { pid: null };

      await isolation.startResourceMonitoring('agent-1', mockChildProcess);

      expect(isolation.resourceMonitors.has('agent-1')).toBe(false);
    });

    it('should stop monitoring for an agent', async () => {
      const mockChildProcess = { pid: 12345 };

      await isolation.startResourceMonitoring('agent-1', mockChildProcess);
      const stats = await isolation.stopResourceMonitoring('agent-1');

      expect(isolation.resourceMonitors.has('agent-1')).toBe(false);
      expect(stats).toHaveProperty('duration');
      expect(stats).toHaveProperty('maxMemory');
      expect(stats).toHaveProperty('avgCpu');
    });

    it('should update isMonitoring when last monitor stops', async () => {
      const mockChildProcess1 = { pid: 12345 };
      const mockChildProcess2 = { pid: 12346 };

      await isolation.startResourceMonitoring('agent-1', mockChildProcess1);
      await isolation.startResourceMonitoring('agent-2', mockChildProcess2);
      expect(isolation.isMonitoring).toBe(true);

      await isolation.stopResourceMonitoring('agent-1');
      expect(isolation.isMonitoring).toBe(true);

      await isolation.stopResourceMonitoring('agent-2');
      expect(isolation.isMonitoring).toBe(false);
    });
  });

  describe('terminateAgent', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn() },
      };
      isolation.activeProcesses.set('agent-1', mockChildProcess);
      terminateAgent.mockResolvedValue({ success: true });
    });

    it('should terminate an active agent', async () => {
      const result = await isolation.terminateAgent('agent-1', 'user_initiated');

      expect(result).toEqual({ success: true, reason: 'user_initiated' });
      expect(terminateAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should return error for non-existent agent', async () => {
      const result = await isolation.terminateAgent('non-existent', 'user_initiated');

      expect(result).toEqual({ success: false, reason: 'not_found' });
    });

    it('should emit agent:terminating event', async () => {
      const emitSpy = vi.spyOn(isolation, 'emit');

      await isolation.terminateAgent('agent-1', 'user_initiated');

      expect(emitSpy).toHaveBeenCalledWith('agent:terminating', {
        agentId: 'agent-1',
        reason: 'user_initiated',
      });
    });
  });

  describe('sendToAgent', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: {
          write: vi.fn(),
        },
      };
      isolation.activeProcesses.set('agent-1', mockChildProcess);
    });

    it('should send a message to an agent', () => {
      isolation.sendToAgent('agent-1', 'test message');

      const childProcess = isolation.activeProcesses.get('agent-1');
      expect(childProcess.stdin.write).toHaveBeenCalledWith('test message\n');
    });

    it('should stringify object messages', () => {
      isolation.sendToAgent('agent-1', { type: 'test', data: 'value' });

      const childProcess = isolation.activeProcesses.get('agent-1');
      expect(childProcess.stdin.write).toHaveBeenCalledWith('{"type":"test","data":"value"}\n');
    });

    it('should throw error for non-existent agent', () => {
      expect(() => {
        isolation.sendToAgent('non-existent', 'test');
      }).toThrow('Agent non-existent not found');
    });

    it('should throw error if agent has no stdin', () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };
      isolation.activeProcesses.set('agent-2', mockChildProcess);

      expect(() => {
        isolation.sendToAgent('agent-2', 'test');
      }).toThrow('Agent agent-2 has no stdin stream');
    });

    it('should emit agent:message-sent event', () => {
      const emitSpy = vi.spyOn(isolation, 'emit');

      isolation.sendToAgent('agent-1', 'test message');

      expect(emitSpy).toHaveBeenCalledWith('agent:message-sent', {
        agentId: 'agent-1',
        size: 12,
      });
    });
  });

  describe('getActiveAgents', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      isolation.activeProcesses.set('agent-1', { pid: 12345 });
      isolation.activeProcesses.set('agent-2', { pid: 12346 });
    });

    it('should return list of active agents', () => {
      const agents = isolation.getActiveAgents();

      expect(agents).toHaveLength(2);
      expect(agents[0].agentId).toBe('agent-1');
      expect(agents[1].agentId).toBe('agent-2');
      expect(agents[0].status).toBe('active');
    });
  });

  describe('getAgentStats', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      isolation.activeProcesses.set('agent-1', { pid: 12345 });
      isolation.resourceMonitors.set('agent-1', {
        startTime: Date.now() - 5000,
        maxMemory: 100,
        cpuSamples: [10, 20, 30],
      });
    });

    it('should return stats for an agent', async () => {
      vi.mocked(require('fs/promises').readFile).mockResolvedValue('12345 0 0 0 0 0 0 0');

      const stats = await isolation.getAgentStats('agent-1');

      expect(stats.agentId).toBe('agent-1');
      expect(stats.pid).toBe(12345);
      expect(stats.status).toBe('active');
      expect(stats.maxMemory).toBe(100);
      expect(stats.avgCpu).toBe(20);
    });

    it('should return null for non-existent agent', async () => {
      const stats = await isolation.getAgentStats('non-existent');

      expect(stats).toBeNull();
    });
  });

  describe('getAllAgentStats', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      isolation.activeProcesses.set('agent-1', { pid: 12345 });
      isolation.activeProcesses.set('agent-2', { pid: 12346 });
    });

    it('should return stats for all agents', async () => {
      vi.mocked(require('fs/promises').readFile).mockResolvedValue('12345 0 0 0 0 0 0 0');

      const stats = await isolation.getAllAgentStats();

      expect(stats).toHaveLength(2);
    });
  });

  describe('cleanupAll', () => {
    beforeEach(() => {
      isolation = new AgentIsolation();
      isolation.activeProcesses.set('agent-1', { pid: 12345 });
      isolation.activeProcesses.set('agent-2', { pid: 12346 });
      isolation.resourceMonitors.set('agent-1', { interval: { clearInterval: vi.fn() } });
      isolation.resourceMonitors.set('agent-2', { interval: { clearInterval: vi.fn() } });
      terminateAgent.mockResolvedValue({ success: true });
    });

    it('should terminate all active agents', async () => {
      await isolation.cleanupAll();

      expect(terminateAgent).toHaveBeenCalledTimes(2);
      expect(isolation.activeProcesses.size).toBe(0);
    });

    it('should stop all resource monitors', async () => {
      await isolation.cleanupAll();

      expect(isolation.resourceMonitors.size).toBe(0);
    });

    it('should return count of cleaned agents', async () => {
      const result = await isolation.cleanupAll();

      expect(result.cleaned).toBe(2);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', async () => {
      const instance1 = await getAgentIsolation();
      const instance2 = await getAgentIsolation();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', async () => {
      const instance1 = await getAgentIsolation();
      resetAgentIsolation();
      const instance2 = await getAgentIsolation();

      expect(instance1).not.toBe(instance2);
    });
  });
});
