# HIVE MEMORY - Shared Architectural Decisions

## Agent Manager (Worktrees) - Phase 2: UI Implementation

### Sub-Task 3: Agent Spawn Interface - COMPLETE (2026-02-04)

#### UI Pattern: Multi-Field Form in Dialog

**Decision**: Compound component pattern (Dialog + ConfigForm)

**Rationale**:
- Separation of concerns: Dialog handles open/close, form handles validation
- Reusability: ConfigForm can be used elsewhere
- Testability: Each component can be tested independently
- Consistency with existing patterns (e.g., chat components)

**Implementation Details**:
- `AgentSpawnDialog`: Main container, manages open/close state
- `AgentConfigForm`: All form fields and validation logic
- Props lifting: Dialog passes config/onChange to form
- Theme tokens used throughout: interactive-hover, surface-elevated, primary

#### UI Pattern: Skills Multi-Select

**Decision**: Checkbox list with scrollable container

**Rationale**:
- Skills catalog can have many items (scrollable needed)
- Checkbox allows multi-selection
- Truncation for long descriptions (line-clamp-2)
- Hover state for better UX (interactive-hover/30)

**Implementation Details**:
- Skills sourced from `useSkillsCatalogStore`
- Uses `skillDir` as ID (unique per catalog source)
- Displays `frontmatterName || skillName` for name
- Limited height (max-h-48) with overflow-y-auto

#### UI Pattern: Branch Naming Strategy

**Decision**: Conditional input based on strategy dropdown

**Rationale**:
- Branch names vary by strategy (auto vs prefix vs custom)
- Shows only relevant input field
- User feedback: different placeholder for each strategy

**Implementation Details**:
- Strategies: auto, prefix, custom
- Custom input shown for prefix/custom modes
- Placeholder changes based on mode (e.g., "feature/billing" vs "e.g., feature/billing-payment-integration")

#### Data Pattern: Agent Runtime Store

**Decision**: Separate Zustand store from `useAgentsStore`

**Rationale**:
- `useAgentsStore` manages agent configurations (SDK agents)
- `agentStore` manages agent runtime (spawned agents/worktrees)
- Different lifecycles and data shapes
- Separation prevents conflicts and confusion

**Implementation Details**:
- Store name: `agent-runtime-store`
- Persisted: filter, sort, projectDirectory preferences
- Not persisted: agents array (fresh from API)
- Computed selectors: getFilteredAgents, getStats

---

### Sub-Task 5: Worktree Visualization - COMPLETE (2026-02-04)

#### Library Decision
**Decision**: Custom SVG-based tree visualization (no external graph library)

**Rationale**:
- No graph library available in project dependencies
- React Flow would add significant new dependencies
- For tree visualization, custom SVG is lightweight and sufficient
- Maintains consistency with existing UI patterns
- Easier to maintain long-term with no external library updates

**Implementation Details**:
- Pure React + SVG implementation
- No external dependencies added
- Zoom/pan via SVG transforms
- Node positioning calculated in useMemo
- Status colors via theme tokens
- Interactive nodes with hover/click handlers

---

## Agent Manager (Worktrees) - Phase 1: Backend Foundation

### Sub-Task 2: Agent Isolation Layer - COMPLETE (2026-02-04)

---

## Architectural Decisions

### 1. Agent Registry Design

**Decision**: Event-driven agent lifecycle management with disk persistence

**Rationale**:
- Event-driven architecture allows multiple services to react to agent state changes
- In-memory Map provides O(1) lookups for common operations
- Disk persistence ensures agents survive server restarts
- Auto-cleanup prevents unbounded growth of registry

**Implementation Details**:
- Storage: `Map<agentId, AgentData>` in memory
- Persistence: `.openchamber/agents/registry.json`
- Events: `agent:registered`, `agent:updated`, `agent:unregistered`, `agent:*:->:*`
- Cleanup: Removes completed/failed agents after 24 hours

### 2. Process Isolation Strategy

**Decision**: Git worktrees + child_process with isolated environment

**Rationale**:
- Git worktrees provide filesystem isolation (separate working directory)
- Node.js child_process provides process namespace isolation
- Environment variable isolation prevents cross-agent contamination
- Maintains shared Git object database for efficient storage

**Implementation Details**:
- Worktree location: `<project>/.opencode/worktrees/<agentId>`
- Isolated env vars: `AGENT_ID`, `AGENT_WORKTREE`, `AGENT_ISOLATED`
- Process limits: 512MB memory, 30 minutes timeout

### 3. Resource Monitoring

**Decision**: Platform-specific process monitoring with periodic checks

**Rationale**:
- Windows requires PowerShell for process stats
- Unix systems use /proc filesystem
- Periodic checks (5s) balance accuracy vs overhead
- Memory limits prevent runaway processes

**Implementation Details**:
- Windows: `Get-Process -Id <pid>` via PowerShell
- Unix: `/proc/<pid>/stat` and `/proc/<pid>/statm`
- Sampling: 5 second intervals, 60 sample rolling window for CPU
- Enforcement: Auto-terminate on memory limit exceed

### 4. Communication Protocol

**Decision**: stdin/stdout pipes with line-delimited JSON

**Rationale**:
- Pipes are built into Node.js child_process
- Line-delimited messages simplify parsing
- JSON provides structured data exchange
- Enables bidirectional communication

**Implementation Details**:
- Agent stdin: Line-delimited messages
- Agent stdout: Line-delimited JSON responses
- Agent stderr: Error messages/logs
- Events: `agent:stdout`, `agent:stderr`, `agent:message-sent`

### 5. Error Handling & Auto-Cleanup

**Decision**: Comprehensive error handling with automatic resource cleanup

**Rationale**:
- Processes can crash unexpectedly
- Orphaned processes waste resources
- Failed worktrees need removal
- Registry must stay in sync

**Implementation Details**:
- Process exit handlers: Update registry, cleanup monitors
- Error handlers: Mark agent as failed, cleanup worktree
- Timeout handlers: Terminate after 30 minutes
- Resource limit handlers: Terminate on memory exceed

---

## Data Models

### Agent Registry Entry

```typescript
interface AgentData {
  id: string;                 // UUID
  worktree: string;           // Path to worktree
  branch: string;             // Git branch name
  status: 'pending' | 'active' | 'completed' | 'failed' | 'terminating';
  skillset: string[];         // Array of skill IDs
  persona: string;            // Persona name
  pid: number | null;        // Process ID
  startTime: number;          // Unix timestamp
  endTime: number | null;     // Unix timestamp
  exitCode: number | null;    // Process exit code
  exitSignal: string | null;  // Process exit signal
  metadata: Record<string, any>; // Additional metadata
}
```

---

## Integration Notes

### With git-worktree-service.js

- `agent-registry.js` is independent (no dependencies)
- `agent-isolation.js` uses:
  - `spawnWorktreeAgent()` - Creates worktree and agent
  - `startAgentProcess()` - Spawns child process in worktree
  - `terminateAgent()` - Terminates and cleans up
  - `completeAgent()` - Marks as successful
  - `failAgent()` - Marks as failed

### Coordination Protocol

1. **Spawn Flow**:
   - `git-worktree-service.spawnAgent()` creates worktree
   - `agent-isolation.spawnAgentInIsolation()` sets up env + spawns process
   - `agent-registry.register()` records agent metadata

2. **Monitor Flow**:
   - `agent-isolation` monitors process resources
   - On exit/error: updates `git-worktree-service` + `agent-registry`

3. **Terminate Flow**:
   - `agent-isolation.terminateAgent()` kills process
   - `git-worktree-service.terminateAgent()` removes worktree
   - `agent-registry.unregister()` removes from registry

---

## Open Decisions / Future Work

1. **Process Containerization**: Consider Docker containers for stronger isolation (Phase 2)
2. **Resource Scheduling**: Implement priority-based CPU/memory allocation
3. **Agent Communication**: Add message passing API for agent-to-agent communication
4. **Metrics Export**: Expose Prometheus metrics for monitoring
5. **Graceful Shutdown**: Implement SIGTERM handling for clean agent shutdown

---

## Agent Manager (Worktrees) - Phase 3: Result Consolidation

### Sub-Task 7: Result Consolidation Service - COMPLETE (2026-02-04)

#### Merge Strategy Decision
**Decision**: Multiple merge strategies (auto, voting, manual, union)

**Rationale**:
- Different conflict types require different resolution approaches
- Auto-merge for non-conflicting changes improves UX
- Voting allows agent consensus-based decisions
- Manual resolution provides full user control
- Union for non-code files (docs, configs) preserves all changes

**Implementation Details**:
- AUTO: Merge changes with no overlapping hunks
- VOTING: Select result with highest quality score
- MANUAL: User chooses per-file via UI
- UNION: Merge all unique changes (for imports/exports)

#### Quality Scoring Algorithm
**Decision**: Weighted scoring across multiple dimensions

**Rationale**:
- Single metric doesn't capture result quality holistically
- Consistency across agents indicates reliability
- Test coverage ensures maintainability
- Code quality metrics prevent technical debt
- Efficiency scores reward concise solutions

**Implementation Details**:
- Weights: consistency=0.3, testCoverage=0.25, codeQuality=0.3, efficiency=0.15
- Code quality factors: line length (max 120), cyclomatic complexity (< 20), comments
- Efficiency factors: net change ratio, execution time

#### Conflict Detection Strategy
**Decision**: Multi-level conflict detection (diff hunk + pattern matching)

**Rationale**:
- Diff hunk analysis catches same-line conflicts accurately
- Pattern matching catches import/export conflicts
- AST-like parsing detects structural conflicts
- Different detection methods for different conflict types

**Implementation Details**:
- Same line: Hunk overlap analysis (oldStart/oldEnd comparison)
- Delete/modify: Diff header parsing (deleted file mode vs @@ hunk)
- Import/export: Regex pattern matching (import x from, export const y)
- Structural: Function/class/interface pattern matching

#### State Persistence Strategy
**Decision**: File-based state with in-memory caching

**Rationale**:
- Consolidations must survive server restarts
- In-memory caching improves performance (TTL: 5s)
- File storage enables cross-process coordination
- Atomic writes prevent corruption

**Implementation Details**:
- Consolidation state: `~/.config/openchamber/consolidation-state.json`
- Conflict state: `~/.config/openchamber/conflict-state.json`
- Cache invalidation: 5 second TTL
- Atomic writes: Write to temp then rename

#### UI Theme Token Compliance
**Decision**: ALL UI colors must use theme tokens (CRITICAL)

**Rationale**:
- Theme system ensures consistency across OpenChamber
- Automatic dark/light mode switching
- User-customizable themes
- Avoids hardcoded color values

**Implementation Details**:
- Surface colors: surface.elevated, surface.foreground, surface.muted, surface.mutedForeground
- Interactive colors: interactive.border, interactive.hover, interactive.selection
- Status colors: status.warning, status.error, status.info, status.success
- NO hardcoded hex colors or Tailwind color classes

#### Integration with Existing Components
**Decision**: Reuse existing diff viewer (PierreDiffViewer)

**Rationale**:
- PierreDiffViewer already handles syntax highlighting
- Side-by-side and unified diff modes already implemented
- Avoids duplicating complex diff rendering logic
- Consistent UX across application

**Implementation Details**:
- ResultMergePanel uses PierreDiffViewer for diff display
- Language detection matches BranchDiffView implementation
- Diff data passed as original/modified content strings
- View mode toggle (side-by-side / unified)

---

_Last Updated: 2026-02-04_
