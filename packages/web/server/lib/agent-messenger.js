import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import os from "os";

const MESSAGE_PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

const MESSAGE_STATUS = {
  PENDING: "pending",
  DELIVERED: "delivered",
  FAILED: "failed",
  RETRYING: "retrying",
};

const MAX_QUEUE_SIZE = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MESSAGE_PERSISTENCE_DIR = path.join(
  os.homedir(),
  ".config",
  "openchamber",
  "agent-messages",
);

class AgentMessenger extends EventEmitter {
  constructor() {
    super();
    this.messageQueues = new Map();
    this.pendingDeliveries = new Map();
    this.retryTimers = new Map();
    this.isProcessing = false;
  }

  async initialize() {
    await this.ensurePersistenceDirectory();
    await this.loadPersistedMessages();
  }

  async ensurePersistenceDirectory() {
    try {
      await fs.mkdir(MESSAGE_PERSISTENCE_DIR, { recursive: true });
    } catch (error) {
      console.error("[agent-messenger] Failed to create persistence directory:", error);
    }
  }

  async loadPersistedMessages() {
    try {
      const entries = await fs.readdir(MESSAGE_PERSISTENCE_DIR);
      let loadedCount = 0;

      for (const entry of entries) {
        if (entry.endsWith(".json")) {
          try {
            const filePath = path.join(MESSAGE_PERSISTENCE_DIR, entry);
            const data = await fs.readFile(filePath, "utf8");
            const message = JSON.parse(data);

            if (message.status === MESSAGE_STATUS.PENDING || message.status === MESSAGE_STATUS.RETRYING) {
              const queueKey = this.getQueueKey(message.targetAgentId, message.worktree);
              if (!this.messageQueues.has(queueKey)) {
                this.messageQueues.set(queueKey, []);
              }

              this.messageQueues.get(queueKey).push(message);
              loadedCount++;
            } else {
              await this.deletePersistedMessage(message.id);
            }
          } catch (error) {
            console.warn(`[agent-messenger] Failed to load message from ${entry}:`, error.message);
          }
        }
      }

      if (loadedCount > 0) {
        console.log(`[agent-messenger] Loaded ${loadedCount} pending messages from disk`);
        this.startProcessing();
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.error("[agent-messenger] Failed to load persisted messages:", error);
      }
    }
  }

  getQueueKey(agentId, worktree) {
    return `${worktree || "default"}:${agentId}`;
  }

  createMessage(type, sourceAgentId, targetAgentId, payload, options = {}) {
    const {
      priority = MESSAGE_PRIORITY.NORMAL,
      worktree = null,
      timeout = 30000,
      metadata = {},
    } = options;

    const message = {
      id: crypto.randomUUID(),
      type,
      sourceAgentId,
      targetAgentId,
      worktree,
      payload,
      priority,
      status: MESSAGE_STATUS.PENDING,
      createdAt: Date.now(),
      timeout,
      retryCount: 0,
      metadata,
    };

    return message;
  }

  async send(message, agentRegistry) {
    const queueKey = this.getQueueKey(message.targetAgentId, message.worktree);

    if (!this.messageQueues.has(queueKey)) {
      this.messageQueues.set(queueKey, []);
    }

    const queue = this.messageQueues.get(queueKey);

    if (queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Message queue full for agent ${message.targetAgentId}`);
    }

    queue.push(message);
    queue.sort((a, b) => a.priority - b.priority);

    await this.persistMessage(message);

    console.log(`[agent-messenger] Message queued: ${message.id} (${message.type}) -> ${message.targetAgentId}`);

    this.emit("message:queued", message);

    this.startProcessing();

    return message;
  }

  async broadcast(type, sourceAgentId, payload, options = {}) {
    const {
      worktree = null,
      agentRegistry,
      excludeAgentIds = [],
      priority = MESSAGE_PRIORITY.NORMAL,
    } = options;

    if (!agentRegistry) {
      throw new Error("agentRegistry is required for broadcast");
    }

    const agents = worktree
      ? agentRegistry.getByWorktree(worktree)
      : agentRegistry.getActiveAgents();

    const targetAgents = agents.filter((agent) => !excludeAgentIds.includes(agent.id));

    const messages = [];

    for (const agent of targetAgents) {
      const message = this.createMessage(
        type,
        sourceAgentId,
        agent.id,
        payload,
        { priority, worktree: agent.worktree, ...options }
      );

      try {
        await this.send(message, agentRegistry);
        messages.push(message);
      } catch (error) {
        console.error(`[agent-messenger] Failed to queue broadcast message for ${agent.id}:`, error);
      }
    }

    console.log(`[agent-messenger] Broadcast queued: ${messages.length} messages`);

    return messages;
  }

  startProcessing() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processQueue();
  }

  async processQueue() {
    while (this.isProcessing) {
      let processed = false;

      for (const [queueKey, queue] of this.messageQueues.entries()) {
        if (queue.length === 0) {
          continue;
        }

        const message = queue[0];

        if (message.status !== MESSAGE_STATUS.PENDING && message.status !== MESSAGE_STATUS.RETRYING) {
          queue.shift();
          processed = true;
          continue;
        }

        const success = await this.deliverMessage(message);

        if (success) {
          queue.shift();
          processed = true;
        } else if (message.retryCount >= MAX_RETRIES) {
          message.status = MESSAGE_STATUS.FAILED;
          message.error = "Max retries exceeded";
          await this.persistMessage(message);
          this.emit("message:failed", message);
          queue.shift();
          processed = true;
        } else {
          message.status = MESSAGE_STATUS.RETRYING;
          message.retryCount++;
          await this.persistMessage(message);

          const delay = RETRY_DELAY_MS * Math.pow(2, message.retryCount - 1);

          if (!this.retryTimers.has(message.id)) {
            const timer = setTimeout(() => {
              this.retryTimers.delete(message.id);
              message.status = MESSAGE_STATUS.PENDING;
            }, delay);
            this.retryTimers.set(message.id, timer);
          }

          break;
        }
      }

      if (!processed) {
        this.isProcessing = false;
        break;
      }
    }
  }

  async deliverMessage(message) {
    try {
      this.emit("message:delivering", message);

      const result = await this.emit("message:send", message);

      if (result && result.delivered) {
        message.status = MESSAGE_STATUS.DELIVERED;
        message.deliveredAt = Date.now();
        await this.persistMessage(message);

        await this.deletePersistedMessage(message.id);
        this.emit("message:delivered", message);

        console.log(`[agent-messenger] Message delivered: ${message.id} (${message.type})`);

        return true;
      }

      return false;
    } catch (error) {
      console.error(`[agent-messenger] Delivery failed for ${message.id}:`, error);
      message.error = error.message;
      await this.persistMessage(message);
      this.emit("message:error", message, error);
      return false;
    }
  }

  async persistMessage(message) {
    try {
      const filePath = path.join(MESSAGE_PERSISTENCE_DIR, `${message.id}.json`);
      const data = JSON.stringify(message, null, 2);
      await fs.writeFile(filePath, data, "utf8");
    } catch (error) {
      console.error(`[agent-messenger] Failed to persist message ${message.id}:`, error);
    }
  }

  async deletePersistedMessage(messageId) {
    try {
      const filePath = path.join(MESSAGE_PERSISTENCE_DIR, `${messageId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.error(`[agent-messenger] Failed to delete persisted message ${messageId}:`, error);
      }
    }
  }

  async markDelivered(messageId) {
    const timer = this.retryTimers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(messageId);
    }

    for (const [queueKey, queue] of this.messageQueues.entries()) {
      const message = queue.find((m) => m.id === messageId);
      if (message) {
        message.status = MESSAGE_STATUS.DELIVERED;
        message.deliveredAt = Date.now();
        await this.persistMessage(message);
        await this.deletePersistedMessage(messageId);
        this.emit("message:delivered", message);
        return message;
      }
    }

    return null;
  }

  async markFailed(messageId, error) {
    const timer = this.retryTimers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(messageId);
    }

    for (const [queueKey, queue] of this.messageQueues.entries()) {
      const message = queue.find((m) => m.id === messageId);
      if (message) {
        message.status = MESSAGE_STATUS.FAILED;
        message.error = error?.message || "Unknown error";
        message.failedAt = Date.now();
        await this.persistMessage(message);
        this.emit("message:failed", message, error);
        return message;
      }
    }

    return null;
  }

  getQueueStatus(agentId, worktree = null) {
    const queueKey = this.getQueueKey(agentId, worktree);
    const queue = this.messageQueues.get(queueKey) || [];

    return {
      total: queue.length,
      pending: queue.filter((m) => m.status === MESSAGE_STATUS.PENDING).length,
      retrying: queue.filter((m) => m.status === MESSAGE_STATUS.RETRYING).length,
      failed: queue.filter((m) => m.status === MESSAGE_STATUS.FAILED).length,
      byType: this.groupByType(queue),
    };
  }

  groupByType(queue) {
    const grouped = {};

    for (const message of queue) {
      grouped[message.type] = (grouped[message.type] || 0) + 1;
    }

    return grouped;
  }

  getAllQueueStatus() {
    const status = {
      totalQueues: this.messageQueues.size,
      totalMessages: 0,
      pendingMessages: 0,
      retryingMessages: 0,
      failedMessages: 0,
      queues: {},
    };

    for (const [queueKey, queue] of this.messageQueues.entries()) {
      const queueStatus = this.groupByType(queue);
      status.queues[queueKey] = {
        total: queue.length,
        pending: queue.filter((m) => m.status === MESSAGE_STATUS.PENDING).length,
        retrying: queue.filter((m) => m.status === MESSAGE_STATUS.RETRYING).length,
        failed: queue.filter((m) => m.status === MESSAGE_STATUS.FAILED).length,
        byType: queueStatus,
      };

      status.totalMessages += queue.length;
      status.pendingMessages += queueStatus.pending || 0;
      status.retryingMessages += queueStatus.retrying || 0;
      status.failedMessages += queueStatus.failed || 0;
    }

    return status;
  }

  async clearQueue(agentId, worktree = null) {
    const queueKey = this.getQueueKey(agentId, worktree);
    const queue = this.messageQueues.get(queueKey);

    if (!queue) {
      return { cleared: 0 };
    }

    for (const message of queue) {
      await this.deletePersistedMessage(message.id);

      const timer = this.retryTimers.get(message.id);
      if (timer) {
        clearTimeout(timer);
        this.retryTimers.delete(message.id);
      }
    }

    const cleared = queue.length;
    this.messageQueues.delete(queueKey);

    console.log(`[agent-messenger] Cleared queue for ${agentId} (${cleared} messages)`);

    return { cleared };
  }

  async clearAllQueues() {
    let cleared = 0;

    for (const [queueKey, queue] of this.messageQueues.entries()) {
      for (const message of queue) {
        await this.deletePersistedMessage(message.id);

        const timer = this.retryTimers.get(message.id);
        if (timer) {
          clearTimeout(timer);
          this.retryTimers.delete(message.id);
        }
      }

      cleared += queue.length;
    }

    this.messageQueues.clear();
    this.isProcessing = false;

    console.log(`[agent-messenger] Cleared all queues (${cleared} messages)`);

    return { cleared };
  }

  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueCount: this.messageQueues.size,
      pendingDeliveries: this.pendingDeliveries.size,
      retryCount: this.retryTimers.size,
      ...this.getAllQueueStatus(),
    };
  }
}

let globalMessenger = null;

export async function getAgentMessenger() {
  if (!globalMessenger) {
    globalMessenger = new AgentMessenger();
    await globalMessenger.initialize();
  }
  return globalMessenger;
}

export function resetAgentMessenger() {
  globalMessenger = null;
}

export async function createAgentMessenger() {
  const messenger = new AgentMessenger();
  await messenger.initialize();
  return messenger;
}

export { AgentMessenger, MESSAGE_PRIORITY, MESSAGE_STATUS };
