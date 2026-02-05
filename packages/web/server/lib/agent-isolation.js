import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { spawn as spawnWorktreeAgent, startAgentProcess, terminateAgent, failAgent, completeAgent } from "./git-worktree-service.js";

const AGENT_ISOLATION_LOG = path.join(
  os.homedir(),
  ".config",
  "openchamber",
  "agent-isolation.log",
);

const MAX_CONCURRENT_AGENTS = 10;
const AGENT_TIMEOUT_MS = 30 * 60 * 1000;
const AGENT_MEMORY_LIMIT_MB = 512;
const RESOURCE_CHECK_INTERVAL = 5000;

class AgentIsolation extends EventEmitter {
  constructor() {
    super();
    this.activeProcesses = new Map();
    this.resourceMonitors = new Map();
    this.isMonitoring = false;
  }

  async spawnAgentInIsolation(params) {
    const {
      projectDirectory,
      agentName,
      task,
      command = "node",
      args = [],
      env = {},
      persona = null,
      skillset = [],
      branchName = null,
      baseBranch = "main",
    } = params;

    const activeCount = this.activeProcesses.size;
    if (activeCount >= MAX_CONCURRENT_AGENTS) {
      throw new Error(`Maximum concurrent agents (${MAX_CONCURRENT_AGENTS}) reached`);
    }

    let agentId = null;
    let worktreePath = null;

    try {
      const agent = await spawnWorktreeAgent({
        projectDirectory,
        agentName,
        agentType: "subagent",
        task,
        branchName,
        baseBranch,
      });

      agentId = agent.id;
      worktreePath = agent.worktreePath;

      this.emit("agent:spawning", { agentId, agentName, worktreePath });

      const isolatedEnv = this.buildIsolatedEnv(env, agentId, worktreePath);

      const childProcess = await startAgentProcess(agentId, command, args, {
        cwd: worktreePath,
        env: isolatedEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.activeProcesses.set(agentId, childProcess);

      this.setupProcessHandlers(agentId, childProcess);
      await this.startResourceMonitoring(agentId, childProcess);

      this.emit("agent:spawned", { agentId, agentName, worktreePath, pid: childProcess.pid });

      return {
        agentId,
        pid: childProcess.pid,
        worktreePath,
        branchName: agent.branchName,
        status: "active",
      };
    } catch (error) {
      this.emit("agent:spawn-failed", { agentId, error: error.message });

      if (agentId) {
        await failAgent(agentId, error);
      }

      throw error;
    }
  }

  buildIsolatedEnv(baseEnv, agentId, worktreePath) {
    const isolatedEnv = {
      ...process.env,
      ...baseEnv,
      AGENT_ID: agentId,
      AGENT_WORKTREE: worktreePath,
      AGENT_ISOLATED: "1",
      NODE_ENV: "production",
    };

    isolatedEnv.PATH = `${worktreePath}${path.delimiter}${isolatedEnv.PATH}`;

    return isolatedEnv;
  }

  setupProcessHandlers(agentId, childProcess) {
    const timeoutHandle = setTimeout(() => {
      this.emit("agent:timeout", { agentId });
      this.terminateAgent(agentId, "timeout");
    }, AGENT_TIMEOUT_MS);

    childProcess.once("exit", async (code, signal) => {
      clearTimeout(timeoutHandle);
      this.activeProcesses.delete(agentId);
      await this.stopResourceMonitoring(agentId);

      this.emit("agent:exit", { agentId, code, signal });

      try {
        if (code === 0) {
          await completeAgent(agentId, { exitCode: 0 });
        } else {
          await failAgent(agentId, new Error(`Process exited with code ${code}, signal: ${signal}`));
        }
      } catch (error) {
        console.error(`[agent-isolation] Failed to update agent ${agentId} on exit:`, error);
      }
    });

    childProcess.on("error", async (error) => {
      clearTimeout(timeoutHandle);
      this.activeProcesses.delete(agentId);
      await this.stopResourceMonitoring(agentId);

      this.emit("agent:error", { agentId, error: error.message });

      try {
        await failAgent(agentId, error);
      } catch (updateError) {
        console.error(`[agent-isolation] Failed to update agent ${agentId} on error:`, updateError);
      }
    });

    childProcess.stdout?.on("data", (data) => {
      this.emit("agent:stdout", { agentId, data: data.toString() });
    });

    childProcess.stderr?.on("data", (data) => {
      this.emit("agent:stderr", { agentId, data: data.toString() });
    });
  }

  async startResourceMonitoring(agentId, childProcess) {
    if (!childProcess.pid) {
      return;
    }

    const monitor = {
      interval: null,
      startTime: Date.now(),
      maxMemory: 0,
      cpuSamples: [],
    };

    const checkResources = async () => {
      try {
        const stats = await this.getProcessStats(childProcess.pid);
        monitor.maxMemory = Math.max(monitor.maxMemory, stats.memoryMB);
        monitor.cpuSamples.push(stats.cpuPercent);

        if (monitor.cpuSamples.length > 60) {
          monitor.cpuSamples.shift();
        }

        if (stats.memoryMB > AGENT_MEMORY_LIMIT_MB) {
          console.warn(`[agent-isolation] Agent ${agentId} exceeded memory limit: ${stats.memoryMB}MB > ${AGENT_MEMORY_LIMIT_MB}MB`);
          await this.terminateAgent(agentId, "memory_limit_exceeded");
        }
      } catch (error) {
        console.warn(`[agent-isolation] Failed to get stats for agent ${agentId}:`, error.message);
      }
    };

    monitor.interval = setInterval(checkResources, RESOURCE_CHECK_INTERVAL);
    this.resourceMonitors.set(agentId, monitor);

    if (!this.isMonitoring) {
      this.isMonitoring = true;
    }
  }

  async stopResourceMonitoring(agentId) {
    const monitor = this.resourceMonitors.get(agentId);
    if (!monitor) {
      return;
    }

    if (monitor.interval) {
      clearInterval(monitor.interval);
    }

    this.resourceMonitors.delete(agentId);

    if (this.resourceMonitors.size === 0) {
      this.isMonitoring = false;
    }

    return {
      duration: Date.now() - monitor.startTime,
      maxMemory: monitor.maxMemory,
      avgCpu: monitor.cpuSamples.length > 0
        ? monitor.cpuSamples.reduce((a, b) => a + b, 0) / monitor.cpuSamples.length
        : 0,
    };
  }

  async getProcessStats(pid) {
    const platform = os.platform();
    let memoryMB = 0;
    let cpuPercent = 0;

    try {
      if (platform === "win32") {
        const { exec } = await import("child_process");
        const util = await import("util");
        const execAsync = util.promisify(exec);

        const { stdout } = await execAsync(
          `powershell "Get-Process -Id ${pid} | Select-Object WorkingSet, CPU | ConvertTo-Json"`
        );
        const data = JSON.parse(stdout);
        memoryMB = (data.WorkingSet || 0) / (1024 * 1024);
        cpuPercent = data.CPU || 0;
      } else {
        const statPath = `/proc/${pid}/stat`;
        const statmPath = `/proc/${pid}/statm`;

        const [statData, statmData] = await Promise.all([
          fs.readFile(statPath, "utf8").catch(() => ""),
          fs.readFile(statmPath, "utf8").catch(() => ""),
        ]);

        if (statmData) {
          const residentPages = parseInt(statmData.split(" ")[1] || "0", 10);
          const pageSize = os.pageSize();
          memoryMB = (residentPages * pageSize) / (1024 * 1024);
        }

        if (statData) {
          const parts = statData.split(" ");
          const utime = parseInt(parts[13] || "0", 10);
          const stime = parseInt(parts[14] || "0", 10);
          const totalTime = utime + stime;
          const seconds = Date.now() / 1000;
          cpuPercent = (totalTime / seconds) * 100;
        }
      }
    } catch (error) {
      console.warn(`[agent-isolation] Failed to get process stats for pid ${pid}:`, error.message);
    }

    return {
      pid,
      memoryMB: Math.round(memoryMB * 100) / 100,
      cpuPercent: Math.round(cpuPercent * 100) / 100,
    };
  }

  async terminateAgent(agentId, reason = "user_initiated") {
    const childProcess = this.activeProcesses.get(agentId);
    if (!childProcess) {
      console.warn(`[agent-isolation] Agent ${agentId} not found in active processes`);
      return { success: false, reason: "not_found" };
    }

    this.emit("agent:terminating", { agentId, reason });

    try {
      await terminateAgent(agentId);
      return { success: true, reason };
    } catch (error) {
      console.error(`[agent-isolation] Failed to terminate agent ${agentId}:`, error);
      return { success: false, reason: error.message };
    }
  }

  async sendToAgent(agentId, message) {
    const childProcess = this.activeProcesses.get(agentId);
    if (!childProcess) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!childProcess.stdin) {
      throw new Error(`Agent ${agentId} has no stdin stream`);
    }

    const data = typeof message === "string" ? message : JSON.stringify(message);
    childProcess.stdin.write(data + "\n");

    this.emit("agent:message-sent", { agentId, size: data.length });
  }

  getActiveAgents() {
    return Array.from(this.activeProcesses.entries()).map(([agentId, process]) => ({
      agentId,
      pid: process.pid,
      status: "active",
      uptime: process.pid ? Date.now() : 0,
    }));
  }

  async getAgentStats(agentId) {
    const childProcess = this.activeProcesses.get(agentId);
    if (!childProcess) {
      return null;
    }

    const monitor = this.resourceMonitors.get(agentId);

    let processStats = { pid: childProcess.pid, memoryMB: 0, cpuPercent: 0 };
    if (childProcess.pid) {
      try {
        processStats = await this.getProcessStats(childProcess.pid);
      } catch {
      }
    }

    return {
      agentId,
      pid: childProcess.pid,
      status: "active",
      uptime: monitor ? Date.now() - monitor.startTime : 0,
      maxMemory: monitor?.maxMemory || 0,
      currentMemory: processStats.memoryMB,
      currentCpu: processStats.cpuPercent,
      avgCpu: monitor?.cpuSamples?.length > 0
        ? monitor.cpuSamples.reduce((a, b) => a + b, 0) / monitor.cpuSamples.length
        : 0,
    };
  }

  async getAllAgentStats() {
    const agentIds = Array.from(this.activeProcesses.keys());
    const stats = await Promise.all(
      agentIds.map((id) => this.getAgentStats(id))
    );
    return stats.filter(Boolean);
  }

  async cleanupAll() {
    const agentIds = Array.from(this.activeProcesses.keys());

    for (const agentId of agentIds) {
      try {
        await this.terminateAgent(agentId, "shutdown");
      } catch (error) {
        console.error(`[agent-isolation] Failed to cleanup agent ${agentId}:`, error);
      }
    }

    for (const agentId of agentIds) {
      await this.stopResourceMonitoring(agentId);
    }

    return { cleaned: agentIds.length };
  }
}

let globalIsolation = null;

export async function getAgentIsolation() {
  if (!globalIsolation) {
    globalIsolation = new AgentIsolation();
  }
  return globalIsolation;
}

export function resetAgentIsolation() {
  globalIsolation = null;
}

export async function createAgentIsolation() {
  const isolation = new AgentIsolation();
  return isolation;
}

export { AgentIsolation };
