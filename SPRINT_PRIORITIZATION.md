# 📊 OpenChamber Sprint Prioritization Analysis (v1.7.0)

This report analyzes open feature requests against current market trends (Cursor, Windsurf, Kilo Code) and project priorities to determine the most impactful next steps.

---

## 🏎️ Competitive Matrix: The "AI IDE" Landscape

| Feature Group          | Industry Standard                         | OpenChamber Status                   | Competitive Gap                  |
| :--------------------- | :---------------------------------------- | :----------------------------------- | :------------------------------- |
| **Git Operations**     | Automated commits, Multi-remote selection | **Hardcoded to `origin`**            | **CRITICAL**                     |
| **Session Mgmt**       | Tabs, Bulk close, Cloud sync              | Individual local deletion            | **MODERATE** (Friction)          |
| **Parallel Execution** | Background Agents (Cursor)                | Experimental                         | **STRATEGIC OPPORTUNITY**        |
| **Quota Visibility**   | Generic meters                            | **Advanced Multi-Provider Tracking** | **LEAD (OpenChamber wins here)** |

---

## 🔍 Detailed Breakdown of Requests

### 1. The "Professional" Gap: Git Remote Management (#290, #291, #292)

- **Problem**: Collaboration in forks (contributing to open source) is currently impossible without naming the upstream remote `origin`.
- **Competitive Impact**: Standard IDE users expect to select where they push and where they pull PRs from.
- **Effort**: Medium. Requires server-side parsing of `git remote -v`.
- **Strategic Value**: High. Needed for corporate/enterprise adoption.

### 2. The "Innovation" Leap: Agent Manager & Worktrees (#158)

- **Vision**: Allow users to spin up multiple agents on separate `git worktrees` to solve the same problem in parallel.
- **Competitive Impact**: This is "Tier 2" Agentic Coding. It moves from "Chat with a file" to "Orchestrate a team."
- **Effort**: High. Requires complex state management for parallel git trees.
- **Strategic Value**: Extremely High. This is the feature that "wows" users.

### 3. The "Friction" Gap: Bulk Session Deletion (#289)

- **Problem**: Power users accumulate hundreds of session files. Deleting one-by-one is tedious.
- **Competitive Impact**: Basic UX hygiene.
- **Effort**: Low.
- **Strategic Value**: Low/Medium (User retention).

---

## 📈 Priority Matrix: Impact vs. Difficulty

| Impact / Effort    | **Low Effort**                  | **High Effort**                    |
| :----------------- | :------------------------------ | :--------------------------------- |
| **High Impact**    | **[P0] Bulk Session Deletion**  | **[P0.5] Git Remote API**          |
| **Strategic/Long** | **[P1] Quota Logic Refinement** | **[P2] Agent Manager (Worktrees)** |

---

## 🎯 Recommended Next Sprint (v1.7.0): "The Orchestrator Foundation"

**Goal**: Prepare OpenChamber for multi-contributor and multi-agent workflows.

### Phase 1: The "Professional" Foundation (Items from #290, #291, #292)

- [ ] Implement `GET /api/git/remotes` endpoint.
- [ ] Update PR Creation UI to include a "Target Remote" dropdown.
- [ ] Update "New Session" logic to fetch context from the selected remote.

### Phase 2: Friction Reduction (#289)

- [ ] Implement `DELETE /api/sessions/batch` endpoint.
- [ ] Add "Select All" and "Delete Selected" to the Sidebar UI.

### Phase 3: Strategic Vision Pre-Alpha (#158)

- [ ] Prototype `git-worktree-service.js` for background branch isolation.

---

> **Recommendation**: Start with the **Git Remote API**. It unblocks the most practical usage patterns and aligns us with GitHub-centric workflows.
