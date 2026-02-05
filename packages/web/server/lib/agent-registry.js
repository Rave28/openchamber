import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";

const AGENT_REGISTRY_FILE = ".openchamber/agents/registry.json";
const MAX_REGISTRY_SIZE = 1000;
const VALID_STATUSES = new Set(["pending", "active", "completed", "failed", "terminating"]);

class AgentRegistry extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.isDirty = false;
    this.persistenceLock = Promise.resolve();
  }

  async initialize(directory) {
    this.directory = directory;
    this.registryPath = path.join(directory, AGENT_REGISTRY_FILE);
    await this.loadFromDisk();
  }

  normalizeAgentData(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const worktree = typeof raw.worktree === "string" ? raw.worktree.trim() : "";
    const branch = typeof raw.branch === "string" ? raw.branch.trim() : "";
    const status = typeof raw.status === "string" ? raw.status.trim() : "";
    const skillset =
      Array.isArray(raw.skillset) && raw.skillset.every((s) => typeof s === "string")
        ? raw.skillset.map((s) => s.trim())
        : [];
    const persona = typeof raw.persona === "string" ? raw.persona.trim() : "";

    if (!id || !worktree || !VALID_STATUSES.has(status)) {
      return null;
    }

    return {
      id,
      worktree,
      branch,
      status,
      skillset,
      persona,
      pid: typeof raw.pid === "number" && raw.pid > 0 ? raw.pid : null,
      startTime: typeof raw.startTime === "number" && raw.startTime > 0 ? raw.startTime : null,
      endTime: typeof raw.endTime === "number" && raw.endTime > 0 ? raw.endTime : null,
      exitCode: typeof raw.exitCode === "number" ? raw.exitCode : null,
      exitSignal: typeof raw.exitSignal === "string" ? raw.exitSignal : null,
      metadata: typeof raw.metadata === "object" && raw.metadata !== null ? raw.metadata : {},
    };
  }

  async loadFromDisk() {
    try {
      const data = await fs.readFile(this.registryPath, "utf8");
      const parsed = JSON.parse(data);

      if (!Array.isArray(parsed)) {
        console.warn("[agent-registry] Invalid registry format, resetting");
        this.agents.clear();
        return;
      }

      this.agents.clear();
      for (const entry of parsed) {
        const normalized = this.normalizeAgentData(entry);
        if (normalized) {
          this.agents.set(normalized.id, normalized);
        }
      }

      console.log(`[agent-registry] Loaded ${this.agents.size} agents from disk`);
    } catch (error) {
      if (error?.code === "ENOENT") {
        console.log("[agent-registry] No existing registry found");
        this.agents.clear();
        return;
      }
      console.error("[agent-registry] Failed to load registry:", error);
      this.agents.clear();
    }
  }

  async persistToDisk() {
    await this.persistenceLock;

    this.persistenceLock = (async () => {
      try {
        await fs.mkdir(path.dirname(this.registryPath), { recursive: true });

        const entries = Array.from(this.agents.values());
        const data = JSON.stringify(entries, null, 2);
        await fs.writeFile(this.registryPath, data, "utf8");

        this.isDirty = false;
      } catch (error) {
        console.error("[agent-registry] Failed to persist registry:", error);
        throw error;
      }
    })();

    return this.persistenceLock;
  }

  markDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.persistToDisk().catch((err) => {
        console.error("[agent-registry] Background persistence failed:", err);
      });
    }
  }

  async register(agentData) {
    const normalized = this.normalizeAgentData(agentData);
    if (!normalized) {
      throw new Error("Invalid agent data");
    }

    if (this.agents.size >= MAX_REGISTRY_SIZE) {
      await this.cleanupOldAgents();
    }

    const existing = this.agents.get(normalized.id);
    const previousStatus = existing?.status;

    normalized.startTime = normalized.startTime || Date.now();
    this.agents.set(normalized.id, normalized);

    this.emit("agent:registered", normalized);
    if (previousStatus && previousStatus !== normalized.status) {
      this.emit(`agent:${previousStatus}:->:${normalized.status}`, normalized);
    }

    this.markDirty();
    return normalized;
  }

  async update(id, updates) {
    const existing = this.agents.get(id);
    if (!existing) {
      throw new Error(`Agent ${id} not found`);
    }

    const normalizedUpdates = {};

    if (typeof updates.status === "string" && VALID_STATUSES.has(updates.status)) {
      const previousStatus = existing.status;
      normalizedUpdates.status = updates.status;

      if (previousStatus !== updates.status) {
        this.emit(`agent:${previousStatus}:->:${updates.status}`, { ...existing, ...normalizedUpdates });
      }
    }

    if (typeof updates.pid === "number" && updates.pid > 0) {
      normalizedUpdates.pid = updates.pid;
    }

    if (typeof updates.startTime === "number" && updates.startTime > 0) {
      normalizedUpdates.startTime = updates.startTime;
    }

    if (typeof updates.endTime === "number" && updates.endTime > 0) {
      normalizedUpdates.endTime = updates.endTime;
    }

    if (typeof updates.exitCode === "number") {
      normalizedUpdates.exitCode = updates.exitCode;
    }

    if (typeof updates.exitSignal === "string") {
      normalizedUpdates.exitSignal = updates.exitSignal;
    }

    if (Array.isArray(updates.skillset) && updates.skillset.every((s) => typeof s === "string")) {
      normalizedUpdates.skillset = updates.skillset.map((s) => s.trim());
    }

    if (typeof updates.persona === "string") {
      normalizedUpdates.persona = updates.persona.trim();
    }

    if (typeof updates.metadata === "object" && updates.metadata !== null) {
      normalizedUpdates.metadata = { ...existing.metadata, ...updates.metadata };
    }

    const updated = { ...existing, ...normalizedUpdates };
    this.agents.set(id, updated);
    this.emit("agent:updated", updated);

    this.markDirty();
    return updated;
  }

  async unregister(id) {
    const existing = this.agents.get(id);
    if (!existing) {
      return null;
    }

    this.agents.delete(id);
    this.emit("agent:unregistered", existing);

    this.markDirty();
    return existing;
  }

  get(id) {
    return this.agents.get(id) || null;
  }

  getAll() {
    return Array.from(this.agents.values());
  }

  getByStatus(status) {
    if (!VALID_STATUSES.has(status)) {
      return [];
    }
    return Array.from(this.agents.values()).filter((agent) => agent.status === status);
  }

  getByBranch(branch) {
    const normalized = branch.trim();
    return Array.from(this.agents.values()).filter((agent) => agent.branch === normalized);
  }

  getByWorktree(worktreePath) {
    const normalized = path.resolve(worktreePath);
    return Array.from(this.agents.values()).filter((agent) => {
      const agentWorktree = path.resolve(agent.worktree);
      return agentWorktree === normalized || agentWorktree.startsWith(normalized + path.sep);
    });
  }

  getActiveAgents() {
    return this.getByStatus("active");
  }

  getPendingAgents() {
    return this.getByStatus("pending");
  }

  getFailedAgents() {
    return this.getByStatus("failed");
  }

  async cleanupOldAgents() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    const toRemove = [];

    for (const [id, agent] of this.agents) {
      const isTerminated = agent.status === "completed" || agent.status === "failed" || agent.status === "terminating";
      const endTime = agent.endTime || now;
      const age = now - endTime;

      if (isTerminated && age > maxAge) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      const agent = this.agents.get(id);
      this.agents.delete(id);
      this.emit("agent:pruned", agent);
    }

    if (toRemove.length > 0) {
      console.log(`[agent-registry] Pruned ${toRemove.length} old agents`);
      this.markDirty();
    }
  }

  async cleanupWorktreeAgents(worktreePath) {
    const agents = this.getByWorktree(worktreePath);
    const removed = [];

    for (const agent of agents) {
      if (agent.status === "active" || agent.status === "pending") {
        await this.update(agent.id, { status: "terminating" });
      }
      const unregistered = await this.unregister(agent.id);
      if (unregistered) {
        removed.push(unregistered);
      }
    }

    return removed;
  }

  getCountByStatus() {
    const counts = {};
    for (const status of VALID_STATUSES) {
      counts[status] = 0;
    }
    for (const agent of this.agents.values()) {
      counts[agent.status] = (counts[agent.status] || 0) + 1;
    }
    return counts;
  }

  getSummary() {
    const counts = this.getCountByStatus();
    return {
      total: this.agents.size,
      active: counts.active,
      pending: counts.pending,
      completed: counts.completed,
      failed: counts.failed,
      terminating: counts.terminating,
    };
  }
}

let globalRegistry = null;

export async function getRegistry(directory) {
  if (!globalRegistry) {
    globalRegistry = new AgentRegistry();
    await globalRegistry.initialize(directory);
  }
  return globalRegistry;
}

export function resetRegistry() {
  globalRegistry = null;
}

export async function createAgentRegistry(directory) {
  const registry = new AgentRegistry();
  await registry.initialize(directory);
  return registry;
}

export { AgentRegistry };
