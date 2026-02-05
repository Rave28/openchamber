---
name: swarm-orchestration
description: Directives for managing multiple subagents across parallel worktrees.
---

# Swarm Orchestration Skill

Use this skill when a task is too large for a single agent or requires parallel execution across different domains (e.g. backend and frontend).

## Core Logic

1. **Task Decomposition**: Split the main request into discrete, independent sub-tasks.
2. **Parallel Spawning**: For each sub-task, spawn a specialized subagent in a new git worktree.
3. **Communication Protocol**:
   - Each subagent must commit with a descriptive message and gitmoji.
   - Subagents must report their worktree path back to the Orchestrator.
4. **Integration**: The Orchestrator is responsible for pulling all sub-branches into a single `integration-branch` for final review.

## Phase 3: Swarm Coordination Protocol

### Message Bus & Event System

The swarm uses a publish/subscribe message bus for inter-agent communication across worktrees.

**Available Message Types:**
- `spawn` - Notify agents of new member (broadcast)
- `barrier_sync` - Wait for checkpoint synchronization
- `leader_election` - Choose coordinator via voting
- `task_partition` - Divide work among parallel agents
- `status_update` - Report progress to dashboard
- `result` - Share output with coordinator
- `error` - Report failure to all agents

### Barrier Synchronization

Use barriers to ensure all agents reach a checkpoint before proceeding.

```javascript
// Coordinator creates a barrier
const barrierId = "checkout-phase-1";
const agents = ["agent-1", "agent-2", "agent-3"];

const barrierPromise = coordinator.createBarrier(barrierId, agents);

// Each agent signals when ready
await coordinator.signalBarrier(myAgentId, barrierId);

// Wait for all agents to complete
const result = await barrierPromise;
// result: { barrierId, success, readyAgents, completedAt }
```

**Use cases:**
- Wait for all agents to complete initial analysis
- Synchronize before merging worktrees
- Coordinate database migrations across services

### Leader Election

Agents vote to select a coordinator for multi-agent decisions.

```javascript
// Initiate election
const electionId = "coordinator-vote-1";
const candidates = ["agent-1", "agent-2", "agent-3"];

const electionPromise = coordinator.conductElection(electionId, candidates);

// Each agent votes
await coordinator.castVote(electionId, myAgentId, preferredCandidate);

// Wait for winner
const result = await electionPromise;
// result: { electionId, winner, votes, completedAt }
```

**Use cases:**
- Select agent to perform final integration
- Choose agent to handle shared resource access
- Resolve conflicts between opposing agents

### Task Partitioning

Divide work among parallel agents using supported strategies.

```javascript
// Partition task using round-robin strategy
const partitions = coordinator.partitionTask(
  "process-files-1",
  { task: "analyze-files", directory: "/src" },
  4, // agent count
  "round-robin"
);

// partitions: [
//   { partitionId: "process-files-1-0", agentIndex: 0, task: {...} },
//   { partitionId: "process-files-1-1", agentIndex: 1, task: {...} },
//   ...
// ]
```

**Supported Strategies:**
- `round-robin` - Distribute work evenly (default)
- `hash` - Consistent hashing for affinity

### Worktree-Aware Message Routing

Send messages to specific worktrees or broadcast across all.

```javascript
// Send to specific agent in worktree
const message = messenger.createMessage(
  "status_update",
  "orchestrator-id",
  "target-agent-id",
  { progress: 75, status: "in-progress" },
  { worktree: "/path/to/worktree", priority: "high" }
);

await messenger.send(message, agentRegistry);

// Broadcast to all agents in worktree
await messenger.broadcast(
  "status_update",
  "orchestrator-id",
  { checkpoint: "ready" },
  { worktree: "/path/to/worktree", agentRegistry }
);
```

**Message Priorities:**
- `CRITICAL` - Must deliver immediately (0)
- `HIGH` - Important messages (1)
- `NORMAL` - Standard communication (2)
- `LOW` - Non-urgent updates (3)

### Message Retry Mechanism

Failed messages are automatically retried with exponential backoff.

```javascript
// Configure retry behavior (in agent-messenger.js)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // doubles each retry

// Monitor delivery status
messenger.on("message:delivered", (message) => {
  console.log(`Message ${message.id} delivered`);
});

messenger.on("message:failed", (message, error) => {
  console.error(`Message ${message.id} failed:`, error);
});
```

### Event System Integration

Swarm events can be forwarded to the UI via SSE for real-time monitoring.

```javascript
// Subscribe to swarm events
coordinator.subscribe("spawn", (message) => {
  // Forward to dashboard via SSE
  sse.send({
    type: "agent_spawned",
    data: message.payload
  });
});

coordinator.subscribe("barrier_sync", (message) => {
  if (message.payload.action === "completed") {
    // Notify dashboard all agents ready
    sse.send({
      type: "barrier_complete",
      data: message.payload
    });
  }
});
```

## Coordination Patterns

### Pattern 1: Parallel Analysis with Barrier

```
1. Orchestrator spawns 3 agents for different modules
2. Each agent analyzes its module
3. Agents signal barrier when analysis complete
4. Orchestrator waits for barrier
5. Once barrier completes, proceed to integration
```

### Pattern 2: Leader Election for Integration

```
1. All agents complete their work
2. Orchestrator initiates leader election
3. Agents vote for most suitable integrator
4. Winner performs final merge and testing
5. Other agents acknowledge and clean up
```

### Pattern 3: Task Partitioning for Bulk Processing

```
1. Orchestrator receives large batch task
2. Partitions task into N sub-tasks
3. Spawns N agents with partitioned work
4. Agents work in parallel
5. Results collected and consolidated
```

### Pattern 4: Worktree-Specific Broadcasting

```
1. Orchestrator needs to notify all backend agents
2. Broadcasts message with worktree filter
3. Only agents in backend worktree receive
4. Other worktrees unaffected
```

## Sub-Task Template

- **Task**: [Title]
- **Target Files**: [Paths]
- **Specialist**: [E.g. VibeCoder, UI-Expert, SRE-Agent]
- **Coordination**: [Barrier/Election/Partition strategy]

## Phase 3 Success Criteria

- [ ] Message bus created with publish/subscribe pattern
- [ ] Barrier sync primitive implemented
- [ ] Leader election algorithm documented/implemented
- [ ] Worktree-aware message routing
- [ ] Event system for agent lifecycle
- [ ] Retry mechanism for failed messages
- [ ] Skill documentation updated
- [ ] TypeScript compilation passes (or valid JS with JSDoc)
- [ ] ESLint passes

## Implementation Details

**Files:**
- `packages/web/server/lib/swarm-coordinator.js` - Core coordination primitives
- `packages/web/server/lib/agent-messenger.js` - Message transport with retry
- Updated `SKILL.md` - This documentation

**Integration Points:**
- Agent Registry: Look up agents by worktree
- Agent Isolation: Pipe messages to agent stdin/stdout
- UI: Forward events via SSE for dashboard
- Server API: Expose coordination endpoints

_Vibe: Command & Control, Parallelized, Scalable._
