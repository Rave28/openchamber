# Agent Manager

The Agent Manager feature in OpenChamber enables parallel development using git worktrees. Spawn multiple autonomous AI agents to work on different aspects of your project simultaneously, then consolidate their results.

## Overview

The Agent Manager provides:

- **Parallel Agent Spawning**: Create multiple isolated worktrees for concurrent development
- **Real-time Monitoring**: Track agent status, progress, and resource usage
- **Worktree Visualization**: Interactive graph showing agent relationships
- **Result Consolidation**: Merge agent results with conflict resolution
- **Activity Stream**: Live logs and events from all agents

## Getting Started

### Prerequisites

- Git repository initialized with at least one commit
- Main branch (typically `main` or `master`)
- Sufficient disk space for multiple worktrees

### Spawning Agents

1. **Open Agent Manager**
   - Click the Agent Manager button in the sidebar
   - Or use the command palette: `Agent Manager: Spawn Agents`

2. **Configure Agents**
   - **Agent Name**: Base name for the agent group (e.g., "Refactoring Agent")
   - **Task**: Description of what the agents should accomplish
   - **Base Branch**: Starting branch (defaults to `main`)
   - **Agent Count**: Number of parallel agents to spawn (1-10)

3. **Spawn**
   - Click "Spawn Agents" to create the worktrees and start the agents
   - Each agent gets its own isolated git worktree on a unique branch

### Example: Parallel Refactoring

**Scenario**: Refactor authentication module across multiple files

1. Open Agent Manager
2. Configure:
   - Agent Name: "Auth Refactor"
   - Task: "Refactor the authentication module to use JWT tokens"
   - Base Branch: main
   - Agent Count: 3
3. Click Spawn

The system will:
- Create 3 git worktrees on branches: `agent/auth-refactor-*`
- Spawn 3 isolated AI agents
- Each agent works independently on the refactoring task
- Monitor all agents in real-time

## Monitoring Agents

### Agent Dashboard

The dashboard displays all active agents as cards:

![Agent Dashboard](../../assets/screenshots/agent-dashboard.png)

**Card Information:**
- **Agent Name**: Displayed at the top of each card
- **Status Indicator**: Color-coded status (active, completed, failed, terminating)
- **Branch**: Git branch name for the agent's worktree
- **Task**: Brief description of the assigned task
- **Progress**: Real-time progress indicator
- **Actions**: Terminate, View Logs buttons

**Status Colors:**
- 🟢 **Active**: Agent is currently working
- 🔵 **Completed**: Agent finished successfully
- 🔴 **Failed**: Agent encountered an error
- 🟡 **Terminating**: Agent is being shut down

### Worktree Graph

The Worktree Graph provides a visual representation of your agent swarm:

![Worktree Graph](../../assets/screenshots/worktree-graph.png)

**Features:**
- **Base Branch Node**: Shows the starting point (e.g., `main`)
- **Agent Nodes**: Each agent represented as a node connected to the base
- **Branch Names**: Displayed on each agent node
- **Status Icons**: Visual indicators for each agent's state
- **Interactive Controls**:
  - **Zoom**: +/- buttons and mouse wheel
  - **Pan**: Click and drag to move the view
  - **Reset**: Return to default view
  - **Click Node**: View detailed information panel

**Node Details Panel:**
- Agent name and status
- Branch name
- Creation time
- Start/End times (if applicable)
- Worktree path
- Error message (if failed)

### Activity Stream

Real-time log stream showing:
- Agent spawn events
- Process outputs (stdout/stderr)
- Status changes
- Error messages
- Completion events

The stream auto-scrolls to show the latest activity.

## Consolidating Results

When agents complete their work, you need to consolidate their results back into your main branch.

### Initiate Consolidation

1. Click "Consolidate Results" in the Agent Manager
2. The system analyzes all agent worktrees for changes
3. A merge preview is generated

### Merge Preview

![Merge Preview](../../assets/screenshots/merge-preview.png)

The preview shows:

**Files Analysis:**
- **Auto-mergeable**: Files with no conflicts
- **Conflicting**: Files that need resolution
- **Rejected**: Files to exclude from merge

**File Details:**
- Changed files list
- Diff preview
- Conflict indicators
- Code quality scores

### Conflict Resolution

For conflicting files:

1. **View Diff**: Click on a conflicting file to see the changes
2. **Choose Resolution**:
   - **Merge**: Accept the changes from a specific agent
   - **Reject**: Exclude the file from the merge
   - **Manual Edit**: Open the file for manual resolution
3. **Apply Resolution**: Click to confirm your choice

**Resolution Strategies:**
- **Auto**: Accept all non-conflicting changes automatically
- **Voting**: Choose changes from agents with higher scores
- **Manual**: Review each conflict individually

### Export to Target Branch

After resolving all conflicts:

1. Click "Export" in the consolidation dialog
2. Choose target branch (default: `main`)
3. The system:
   - Applies all accepted changes
   - Creates a merge commit
   - Updates agent statuses to `completed`

## Advanced Features

### Resource Monitoring

Each agent's resource usage is tracked:
- **Memory**: Current and peak memory usage
- **CPU**: Average CPU utilization
- **Uptime**: Time since agent started

Memory limits are enforced:
- Default: 512 MB per agent
- Configurable in settings

### Timeout Handling

Agents that run too long are automatically terminated:
- Default timeout: 30 minutes
- Configurable in settings

### Swarm Coordination

For advanced scenarios, the swarm coordinator provides:
- **Barrier Synchronization**: Wait for multiple agents to reach a point
- **Leader Election**: Elect a leader for coordination tasks
- **Message Bus**: Inter-agent communication

### Task Partitioning

Automatically partition large tasks across agents:
- **Round-robin**: Distribute tasks evenly
- **Hash-based**: Consistent task assignment
- **Custom**: Define your own partitioning logic

## Troubleshooting

### Agent Won't Start

**Symptoms**: Agent status stuck on "pending"

**Solutions:**
1. Check if you've reached the agent limit (10 concurrent)
2. Verify git worktree support: `git worktree list`
3. Check disk space for worktree creation
4. Review logs for error messages

### Agent Fails Immediately

**Symptoms**: Agent status shows "failed" shortly after spawning

**Solutions:**
1. Check the agent's error message in the card details
2. Verify the base branch exists
3. Check file permissions in the project directory
4. Review activity stream for process errors

### Merge Conflicts Persist

**Symptoms**: Unable to resolve merge conflicts

**Solutions:**
1. Use "Manual Edit" to resolve conflicts in the file
2. Accept changes from one agent at a time
3. Consider rejecting problematic files
4. Re-run consolidation after fixing issues

### Worktree Cleanup

**Symptoms**: Stale worktrees taking up space

**Solutions:**
1. Use "Cleanup Stale Agents" in Agent Manager
2. Manually remove worktrees: `git worktree remove <path>`
3. The system automatically cleans up worktrees after 24 hours

## API Reference

See [API Documentation](../api/agent-worktree-api.md) for detailed API usage.

## Best Practices

1. **Start Small**: Begin with 2-3 agents for learning
2. **Clear Tasks**: Provide detailed task descriptions
3. **Monitor Progress**: Check the dashboard regularly
4. **Resolve Conflicts Early**: Review conflicts as they appear
5. **Backup First**: Always ensure your main branch is backed up
6. **Review Changes**: Carefully review the merge preview before exporting

## Limitations

- Maximum 10 concurrent agents
- 512 MB memory limit per agent
- 30 minute timeout per agent
- Git repository must have at least one commit
- Worktrees cannot contain `.git` subdirectories

## See Also

- [API Documentation](../api/agent-worktree-api.md)
- [Swarm Orchestration](swarm-orchestration.md)
- [Agent Isolation](agent-isolation.md)
