# Agent Worktree API

Complete API reference for the Agent Manager worktree parallelization feature.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require valid authentication with the OpenChamber server.

## Endpoints

### Agents

#### GET /agents

Get all agents with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `active`, `completed`, `failed`, `terminating`)
- `projectDirectory` (optional): Filter by project directory

**Response:**
```json
{
  "agents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Test Agent 1",
      "type": "subagent",
      "status": "active",
      "projectDirectory": "/path/to/project",
      "worktreePath": "/path/to/project/.opencode/worktrees/agent-id",
      "branchName": "agent/test-agent-1-abc12345",
      "baseBranch": "main",
      "task": "Test task description",
      "processId": 12345,
      "createdAt": 1704067200000,
      "startedAt": 1704067205000,
      "completedAt": null,
      "error": null
    }
  ]
}
```

#### GET /agents/:id

Get details for a specific agent.

**Path Parameters:**
- `id`: Agent UUID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Test Agent 1",
  "type": "subagent",
  "status": "active",
  "projectDirectory": "/path/to/project",
  "worktreePath": "/path/to/project/.opencode/worktrees/agent-id",
  "branchName": "agent/test-agent-1-abc12345",
  "baseBranch": "main",
  "task": "Test task description",
  "processId": 12345,
  "createdAt": 1704067200000,
  "startedAt": 1704067205000,
  "completedAt": null,
  "error": null,
  "metadata": {}
}
```

#### POST /agents

Spawn one or more new agents.

**Request Body:**
```json
{
  "projectDirectory": "/path/to/project",
  "agentName": "Refactoring Agent",
  "agentType": "subagent",
  "task": "Refactor authentication module",
  "branchName": null,
  "baseBranch": "main",
  "agentCount": 3
}
```

**Parameters:**
- `projectDirectory` (required): Path to the git repository
- `agentName` (required): Base name for the agent group
- `agentType` (optional, default: "subagent"): Type of agent
- `task` (optional): Description of the task
- `branchName` (optional): Custom branch name (auto-generated if not provided)
- `baseBranch` (optional, default: "main"): Base branch to create worktree from
- `agentCount` (optional, default: 1): Number of agents to spawn (1-10)

**Response:**
```json
{
  "agents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Refactoring Agent",
      "type": "subagent",
      "status": "pending",
      "projectDirectory": "/path/to/project",
      "worktreePath": "/path/to/project/.opencode/worktrees/agent-id",
      "branchName": "agent/refactoring-agent-abc12345",
      "baseBranch": "main",
      "task": "Refactor authentication module",
      "createdAt": 1704067200000
    }
  ],
  "count": 1
}
```

#### DELETE /agents/:id

Terminate and remove an agent.

**Path Parameters:**
- `id`: Agent UUID

**Response:**
```json
{
  "success": true
}
```

#### GET /agents/:id/logs

Get logs for a specific agent.

**Path Parameters:**
- `id`: Agent UUID

**Query Parameters:**
- `lines` (optional, default: 100): Number of log lines to return
- `offset` (optional, default: 0): Line offset for pagination

**Response:**
```json
{
  "logs": [
    {
      "timestamp": 1704067200000,
      "level": "info",
      "message": "Agent started"
    },
    {
      "timestamp": 1704067201000,
      "level": "debug",
      "message": "Processing task..."
    }
  ],
  "totalLines": 245
}
```

#### GET /agents/:id/stats

Get resource usage statistics for an agent.

**Path Parameters:**
- `id`: Agent UUID

**Response:**
```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "pid": 12345,
  "status": "active",
  "uptime": 125000,
  "maxMemory": 256.5,
  "currentMemory": 234.1,
  "currentCpu": 45.2,
  "avgCpu": 52.3
}
```

### Worktrees

#### GET /worktrees

Get all worktrees for a project.

**Query Parameters:**
- `projectDirectory` (required): Path to the project

**Response:**
```json
{
  "worktrees": [
    {
      "worktree": "/path/to/project/.opencode/worktrees/agent-id",
      "commit": "abc123def456",
      "branch": "agent/test-agent-1",
      "detached": false,
      "agentId": "550e8400-e29b-41d4-a716-446655440000",
      "agentName": "Test Agent 1",
      "status": "active"
    }
  ]
}
```

#### GET /worktrees/:worktreeId/diff

Get git diff for a specific worktree.

**Path Parameters:**
- `worktreeId`: Worktree ID

**Response:**
```json
{
  "worktreeId": "worktree-id",
  "baseBranch": "main",
  "files": [
    {
      "path": "src/auth.js",
      "status": "modified",
      "additions": 25,
      "deletions": 12
    }
  ],
  "diff": "diff --git a/src/auth.js b/src/auth.js\n..."
}
```

### Consolidations

#### POST /consolidations

Initiate a new consolidation for merging agent results.

**Request Body:**
```json
{
  "projectDirectory": "/path/to/project",
  "baseBranch": "main",
  "agentIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "strategy": "auto"
}
```

**Parameters:**
- `projectDirectory` (required): Path to the project
- `baseBranch` (required): Target base branch
- `agentIds` (required): Array of agent IDs to consolidate
- `strategy` (optional, default: "auto"): Merge strategy (`auto`, `voting`, `manual`, `union`)

**Response:**
```json
{
  "id": "consolidation-1704067200000-abc123",
  "projectDirectory": "/path/to/project",
  "baseBranch": "main",
  "agentIds": [...],
  "strategy": "auto",
  "status": "pending",
  "createdAt": 1704067200000,
  "startedAt": null,
  "completedAt": null
}
```

#### POST /consolidations/:id/analyze

Analyze agent results to detect conflicts and generate merge preview.

**Path Parameters:**
- `id`: Consolidation ID

**Request Body:**
```json
{
  "agentResults": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Test Agent 1",
      "worktreePath": "/path/to/worktree",
      "branch": "agent/test-agent-1"
    }
  ]
}
```

**Response:**
```json
{
  "consolidationId": "consolidation-1704067200000-abc123",
  "totalFiles": 15,
  "autoMergeable": 12,
  "conflictingFiles": 3,
  "files": [
    {
      "path": "src/auth.js",
      "diff": "...",
      "hunks": [...],
      "metrics": {
        "lineCount": 150,
        "avgLineLength": 45,
        "maxLineLength": 120,
        "complexity": 15,
        "hasComments": true
      },
      "testCoverage": {
        "isTestFile": false,
        "testCount": 0,
        "testLineRatio": 0.15
      },
      "scores": {
        "consistency": 0.8,
        "testCoverage": 0.15,
        "codeQuality": 0.9,
        "efficiency": 0.85,
        "total": 0.75
      },
      "agentId": "550e8400-e29b-41d4-a716-446655440000",
      "agentName": "Test Agent 1"
    }
  ],
  "conflicts": [
    {
      "path": "src/config.js",
      "conflicts": [
        {
          "type": "exact",
          "agentA": "550e8400-e29b-41d4-a716-446655440000",
          "agentB": "660e8400-e29b-41d4-a716-446655440001",
          "hunkA": {...},
          "hunkB": {...},
          "overlap": {
            "start": 45,
            "end": 52
          }
        }
      ]
    }
  ],
  "recommendedStrategy": "voting"
}
```

#### POST /consolidations/:id/resolve

Resolve conflicts and create merge plan.

**Path Parameters:**
- `id`: Consolidation ID

**Request Body:**
```json
{
  "resolutions": [
    {
      "path": "src/auth.js",
      "action": "merge",
      "sourceAgent": "550e8400-e29b-41d4-a716-446655440000",
      "sourceBranch": "agent/test-agent-1"
    },
    {
      "path": "src/utils.js",
      "action": "reject"
    }
  ]
}
```

**Response:**
```json
{
  "consolidationId": "consolidation-1704067200000-abc123",
  "strategy": "auto",
  "resolutions": [...],
  "filesToMerge": [...],
  "filesToReject": [...]
}
```

#### POST /consolidations/:id/export

Execute the merge and export to target branch.

**Path Parameters:**
- `id`: Consolidation ID

**Request Body:**
```json
{
  "targetBranch": "main",
  "commitMessage": "Merge agent results from consolidation consolidation-1704067200000-abc123"
}
```

**Response:**
```json
{
  "consolidationId": "consolidation-1704067200000-abc123",
  "merged": [
    "src/auth.js",
    "src/config.js"
  ],
  "failed": [],
  "errors": [],
  "commitHash": "abc123def456"
}
```

#### GET /consolidations/:id

Get details for a specific consolidation.

**Path Parameters:**
- `id`: Consolidation ID

**Response:**
```json
{
  "id": "consolidation-1704067200000-abc123",
  "projectDirectory": "/path/to/project",
  "baseBranch": "main",
  "agentIds": [...],
  "strategy": "auto",
  "status": "completed",
  "createdAt": 1704067200000,
  "startedAt": 1704067210000,
  "completedAt": 1704067300000,
  "agentResults": [...],
  "conflicts": [],
  "preview": {...},
  "mergePlan": {...},
  "mergeResult": {...}
}
```

#### DELETE /consolidations/:id

Delete a consolidation.

**Path Parameters:**
- `id`: Consolidation ID

**Response:**
```json
{
  "success": true
}
```

### Swarm

#### POST /swarm/barrier

Create a synchronization barrier.

**Request Body:**
```json
{
  "barrierId": "barrier-1",
  "expectedAgents": ["agent-1", "agent-2", "agent-3"],
  "timeoutMs": 300000
}
```

**Response:**
```json
{
  "barrierId": "barrier-1",
  "status": "waiting",
  "readyAgents": [],
  "expectedCount": 3
}
```

#### POST /swarm/barrier/:barrierId/signal

Signal that an agent has reached the barrier.

**Path Parameters:**
- `barrierId`: Barrier ID

**Request Body:**
```json
{
  "agentId": "agent-1"
}
```

**Response:**
```json
{
  "success": true,
  "readyCount": 1,
  "totalCount": 3
}
```

#### POST /swarm/election

Conduct a leader election.

**Request Body:**
```json
{
  "electionId": "election-1",
  "candidates": ["agent-1", "agent-2", "agent-3"],
  "timeoutMs": 30000
}
```

**Response:**
```json
{
  "electionId": "election-1",
  "status": "in_progress",
  "candidates": ["agent-1", "agent-2", "agent-3"]
}
```

#### POST /swarm/election/:electionId/vote

Cast a vote in an election.

**Path Parameters:**
- `electionId`: Election ID

**Request Body:**
```json
{
  "voterId": "agent-1",
  "candidateId": "agent-2"
}
```

**Response:**
```json
{
  "success": true,
  "votes": [
    ["agent-1", "agent-2"]
  ]
}
```

#### POST /swarm/partition

Partition a task across multiple agents.

**Request Body:**
```json
{
  "partitionId": "task-1",
  "task": {
    "type": "refactor",
    "target": "auth module"
  },
  "agentCount": 3,
  "strategy": "round-robin"
}
```

**Response:**
```json
{
  "partitionId": "task-1",
  "partitions": [
    {
      "partitionId": "task-1-0",
      "agentIndex": 0,
      "task": {
        "type": "refactor",
        "target": "auth module",
        "partitionIndex": 0,
        "totalPartitions": 3
      }
    }
  ],
  "strategy": "round-robin",
  "agentCount": 3
}
```

## Event Types

### Server-Sent Events (SSE)

The following events are streamed via SSE:

#### agent:spawned
```json
{
  "type": "agent:spawned",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "agentName": "Test Agent 1",
  "worktreePath": "/path/to/worktree",
  "pid": 12345,
  "timestamp": 1704067200000
}
```

#### agent:status_changed
```json
{
  "type": "agent:status_changed",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "oldStatus": "active",
  "newStatus": "completed",
  "timestamp": 1704067200000
}
```

#### agent:log
```json
{
  "type": "agent:log",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "level": "info",
  "message": "Task completed",
  "timestamp": 1704067200000
}
```

#### agent:error
```json
{
  "type": "agent:error",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Process exited with code 1",
  "timestamp": 1704067200000
}
```

#### consolidation:completed
```json
{
  "type": "consolidation:completed",
  "consolidationId": "consolidation-1704067200000-abc123",
  "totalFiles": 15,
  "mergedFiles": 15,
  "conflictCount": 0,
  "timestamp": 1704067200000
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Agent or worktree not found |
| 409 | Conflict - Worktree already exists |
| 429 | Too Many Requests - Agent limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Git operations failed |

## Error Response Format

```json
{
  "error": {
    "code": "AGENT_LIMIT_EXCEEDED",
    "message": "Maximum of 10 concurrent active agents reached",
    "details": {
      "current": 10,
      "limit": 10
    }
  }
}
```

## Rate Limiting

- Agent spawning: 10 requests per minute
- Consolidation: 5 requests per minute
- Other endpoints: 100 requests per minute

## WebSocket API

For real-time updates, connect via WebSocket:

```
ws://localhost:3000/ws/agents
```

### WebSocket Messages

#### Subscribe to Agent Updates
```json
{
  "type": "subscribe",
  "topic": "agent:*"
}
```

#### Subscribe to Specific Agent
```json
{
  "type": "subscribe",
  "topic": "agent:550e8400-e29b-41d4-a716-446655440000"
}
```

#### Unsubscribe
```json
{
  "type": "unsubscribe",
  "topic": "agent:*"
}
```

## TypeScript Types

```typescript
interface Agent {
  id: string;
  name: string;
  type: 'subagent' | 'leader' | 'follower';
  status: 'pending' | 'active' | 'completed' | 'failed' | 'terminating';
  projectDirectory: string;
  worktreePath: string;
  branchName: string;
  baseBranch: string;
  task?: string;
  processId?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface Consolidation {
  id: string;
  projectDirectory: string;
  baseBranch: string;
  agentIds: string[];
  strategy: 'auto' | 'voting' | 'manual' | 'union';
  status: 'pending' | 'analyzing' | 'analyzed' | 'ready' | 'completed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  agentResults?: AgentResult[];
  conflicts?: Conflict[];
  preview?: MergePreview;
  mergePlan?: MergePlan;
  mergeResult?: MergeResult;
}

interface AgentStats {
  agentId: string;
  pid: number;
  status: string;
  uptime: number;
  maxMemory: number;
  currentMemory: number;
  currentCpu: number;
  avgCpu: number;
}
```

## See Also

- [Feature Guide](../features/agent-manager.md)
- [Agent Isolation](../features/agent-isolation.md)
- [Swarm Orchestration](../features/swarm-orchestration.md)
