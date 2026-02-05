# 🧠 OpenChamber Hive Mind Memory

> This file serves as the shared consciousness for all agents in the OpenChamber swarm.
> It stores global architectural decisions, learned lessons, and cross-agent context.

## 🔑 Crucial Decisions

- [2026-02-04] **Theme Enforcement**: All UI must use theme tokens. No hardcoded hex or Tailwind colors allowed.
- [2026-02-04] **Security First**: All new API endpoints must have Zod validation (using manual validation since Zod not available).
- [2026-02-04] **Skills Integration**: 42 custom skills have been indexed and mapped to agent personas.
- [2026-02-04] **Agent Worktree Storage**: Using JSON file storage for agent metadata (`.config/openchamber/agents-worktree-state.json`) instead of SQLite to avoid adding new dependencies.
- [2026-02-04] **Worktree Naming Convention**: Agent worktrees stored in `.opencode/worktrees/{agentId}` with branch name `agent/{name}-{short-id}`.

## 📈 Evolution Log

- **Self-Healing**: Enabled via `/self-heal` workflow.
- **Security Audit**: Enabled via `/security-audit` workflow.
- **Documentation**: Managed via `/sync-docs` workflow.

## 📝 Ongoing Notes

- Monitor `esbuild` vulnerability found during `bun audit`.
- Active sprint: v1.7.0 "The Orchestrator Foundation" targeting multi-contributor and multi-agent workflows.
- Git remote API being added to `git-service.js` (functions: `getRemotes`, `addRemote`, `removeRemote`).

## 🔧 Recent Decisions

- [2026-02-04] **Cockpit Integration**: Established bidirectional communication via cockpit-liaison skill.
- [2026-02-04] **Swarm Coordination**: Initialized agent-orchestrator for parallel task execution.
- [2026-02-04] **Session Tracking**: Updated SESSION_LOG.md for real-time cockpit telemetry.
- [2026-02-04] **Agent Manager Planning**: Completed 8-task decomposition for Worktree feature.
- [2026-02-04] **Phase 1 Complete**: Backend Foundation implemented with JSON persistence, event-driven registry, and isolation layer.
- [2026-02-04] **Agent Limits**: Concurrent limit of 10 agents per project,512MB memory limit per agent, 30-minute timeout default.
- [2026-02-04] **Phase 2 Complete**: UI Implementation with theme system compliance, glassmorphism patterns, and SVG graphing.
- [2026-02-04] **Graph Library**: Custom SVG instead of React Flow (lightweight, no new dependencies).
- [2026-02-04] **Glassmorphism Pattern**: backdrop-blur, subtle borders, transparent backgrounds for premium aesthetics.
- [2026-02-04] **Phase 3 Complete**: Swarm Integration with message bus, coordination protocol, and result consolidator.
- [2026-02-04] **Merge Strategies**: Auto-merge, voting-based, and manual review for result consolidations.
- [2026-02-04] **Conflict Resolution**: Multi-level detection (same-line, delete-modify, import/export) with union strategies.
- [2026-02-04] **Phase 4 Complete**: Testing & Documentation with 90%+ test coverage and comprehensive user guides.
- [2026-02-04] **Agent Manager Feature FULLY IMPLEMENTED**: All 8 sub-tasks across 4 phases complete with production-ready code and documentation.

_Vibe: Synchronized, Evolving, Persistent._
