# Agent Manager Feature Walkthrough Script

## Overview
This script provides a step-by-step walkthrough for demonstrating the Agent Manager feature with worktree parallelization.

## Scenario: Parallel Refactoring of Authentication Module

**Goal**: Demonstrate spawning 3 parallel agents to refactor an authentication module, monitoring their progress, and consolidating results.

## Prerequisites
- OpenChamber v1.7.0 or later
- Git repository with at least one commit
- Authentication module to refactor (e.g., `src/auth.js`)
- Screen recording software (e.g., OBS, ScreenFlow)
- Microphone for voiceover (optional)

## Video Setup

**Opening Scene** (0:00-0:10)
- **Action**: Open OpenChamber in browser
- **Voiceover**: "Welcome to OpenChamber's Agent Manager feature. Today, we'll demonstrate parallel development using git worktrees."
- **Visual**: Show full OpenChamber interface with sidebar and main area

---

## Part 1: Opening Agent Manager (0:10-0:30)

**Scene**: Clicking Agent Manager button

**Actions**:
1. Click Agent Manager icon in sidebar
2. Dialog opens with Agent Manager header

**Voiceover**:
> "To get started, open the Agent Manager from the sidebar. This is your control center for parallel development."

**Visual**: 
- Zoom in on Agent Manager button
- Show dialog opening animation
- Highlight dialog title "Agent Manager"

---

## Part 2: Configuring Agents (0:30-1:00)

**Scene**: Filling out spawn form

**Actions**:
1. Type "Auth Refactor" in "Agent Name" field
2. Type "Refactor authentication module to use JWT tokens" in "Task" field
3. Verify "Base Branch" shows "main"
4. Change "Agent Count" to "3"

**Voiceover**:
> "Let's spawn 3 agents to work on refactoring our authentication module. Each agent will work in its own isolated git worktree."

**Visual**:
- Highlight each field as filled
- Show tooltip hints
- Display validation checkmarks

---

## Part 3: Spawning Agents (1:00-1:30)

**Scene**: Clicking spawn button

**Actions**:
1. Click "Spawn Agents" button
2. Watch loading indicator
3. Wait for success message

**Voiceover**:
> "Click spawn to create the agents. The system will create 3 git worktrees and spawn isolated processes for each one."

**Visual**:
- Button click animation
- Loading spinner
- Success toast notification

---

## Part 4: Agent Dashboard - Monitoring (1:30-2:30)

**Scene**: Viewing active agents in dashboard

**Actions**:
1. Switch to Agent Dashboard tab (if not already)
2. Show 3 agent cards
3. Observe status changing from "pending" to "active"

**Voiceover**:
> "Here we can see our 3 agents in the dashboard. Each card shows the agent's status, branch, and task progress."

**Visual**:
- Pan across agent cards
- Highlight status indicators (green for active)
- Show status animation changing
- Display resource usage (CPU, memory)

---

## Part 5: Worktree Graph Visualization (2:30-3:30)

**Scene**: Viewing worktree graph

**Actions**:
1. Click on Worktree Graph tab
2. Show graph with base branch node and 3 agent nodes
3. Demonstrate zoom controls
4. Demonstrate pan controls
5. Click on an agent node to show details

**Voiceover**:
> "The Worktree Graph gives us a visual representation of our agent swarm. We can see how each agent branches off from main. Let's zoom in and pan around."

**Visual**:
- Zoom in animation (smooth scale transition)
- Pan animation with cursor drag
- Click agent node
- Show details panel with agent info

---

## Part 6: Activity Stream (3:30-4:00)

**Scene**: Viewing live agent logs

**Actions**:
1. Click on an agent card to expand
2. Show Activity Stream
3. Observe live log entries appearing
4. Show auto-scroll behavior

**Voiceover**:
> "We can also monitor each agent's activity stream in real-time. This shows the actual output from each agent as it works."

**Visual**:
- Highlight activity stream panel
- Show new log entries appearing
- Demonstrate auto-scroll

---

## Part 7: Waiting for Completion (4:00-4:30)

**Scene**: Agents finishing work

**Actions**:
1. Watch agent statuses change from "active" to "completed"
2. Show completion animations
3. Observe final stats (duration, files modified)

**Voiceover**:
> "Our agents have completed their work. Each one has refactored the authentication module in its own worktree."

**Visual**:
- Status indicator color change (green to blue)
- Show checkmark icons
- Display completion stats

---

## Part 8: Initiating Consolidation (4:30-5:30)

**Scene**: Opening consolidation dialog

**Actions**:
1. Click "Consolidate Results" button
2. Wait for analysis to complete
3. Show merge preview

**Voiceover**:
> "Now let's consolidate the results. The system analyzes all agent worktrees to detect any conflicts and prepares a merge preview."

**Visual**:
- Click consolidation button
- Show loading animation with progress bar
- Reveal merge preview dialog

---

## Part 9: Merge Preview - Overview (5:30-6:15)

**Scene**: Viewing merge preview summary

**Actions**:
1. Show summary: "15 files changed, 12 auto-mergeable, 3 conflicts"
2. Highlight file categories
3. Show recommended merge strategy

**Voiceover**:
> "The merge preview shows us an overview. We have 15 changed files: 12 can be auto-merged, but we need to resolve 3 conflicts."

**Visual**:
- Highlight summary numbers
- Color-code files (green for auto, yellow for conflicts)
- Show recommended strategy badge

---

## Part 10: Viewing Conflicts (6:15-7:00)

**Scene**: Examining conflicting files

**Actions**:
1. Click on a conflicting file
2. Show diff view with changes from multiple agents
3. Highlight conflict regions

**Voiceover**:
> "Let's look at our conflicts. This file shows changes from all three agents. The system has highlighted the conflicting regions."

**Visual**:
- Expand conflict details
- Show side-by-side or inline diff
- Highlight conflict hunk with red background

---

## Part 11: Resolving Conflicts (7:00-7:45)

**Scene**: Choosing resolutions

**Actions**:
1. For first conflict, select "Merge" from Agent 1
2. For second conflict, select "Merge" from Agent 2
3. For third conflict, select "Reject" (bad change)
4. Click "Apply Resolutions" button

**Voiceover**:
> "We can resolve conflicts by choosing which agent's changes to accept, or rejecting changes we don't want. Let's apply our resolutions."

**Visual**:
- Show resolution dropdowns for each conflict
- Highlight accepted/rejected status
- Show success notifications after applying

---

## Part 12: Exporting to Target Branch (7:45-8:15)

**Scene**: Merging to main branch

**Actions**:
1. Verify all conflicts resolved
2. Click "Export" button
3. Show merge progress
4. Display success message with commit hash

**Voiceover**:
> "With all conflicts resolved, we can export our changes to the main branch. This creates a merge commit combining all the work."

**Visual**:
- Click export button
- Show merge progress animation
- Display commit hash and success message

---

## Part 13: Verification (8:15-8:45)

**Scene**: Verifying the result

**Actions**:
1. Close consolidation dialog
2. Show Agent Manager dashboard (all agents completed)
3. (Optional) Show git graph or commit history

**Voiceover**:
> "Our agents are now complete, and the changes have been merged into main. Let's verify the result in the commit history."

**Visual**:
- Show agent cards with completed status
- Transition to Git view
- Highlight new merge commit

---

## Part 14: Cleanup (8:45-9:00)

**Scene**: Cleaning up worktrees

**Actions**:
1. Click "Cleanup Stale Agents" button
2. Show confirmation dialog
3. Confirm cleanup
4. Display cleanup summary

**Voiceover**:
> "Finally, we can clean up the old worktrees to free up disk space. The system automatically cleans up agents after 24 hours, but we can do it manually too."

**Visual**:
- Show cleanup dialog
- Display cleaned agent count
- Show success message

---

## Closing Scene (9:00-9:15)

**Actions**:
1. Show full Agent Manager dashboard
2. Fade out to feature summary screen

**Voiceover**:
> "And that's the Agent Manager feature. Parallel development with git worktrees, real-time monitoring, and intelligent result consolidation. Try it today to supercharge your development workflow."

**Visual**:
- Feature summary with key benefits
- Links to documentation
- OpenChamber logo

---

## Tips for Recording

**Screen Layout**:
- Keep OpenChamber at ~80% of screen width
- Ensure system clock/time not visible (cleaner look)
- Use dark mode for better contrast

**Mouse Movement**:
- Smooth, deliberate movements
- Pause slightly before each click
- Highlight elements with mouse hover before clicking

**Audio**:
- Use clear, confident voice
- Speak at moderate pace (not too fast)
- Pause between sections
- Emphasize key terms (Agent Manager, git worktree, consolidation)

**Timing**:
- Target 9-10 minutes total
- Include brief pause after each action
- Don't rush the consolidation explanation (it's complex)

**Captions**:
- Add captions for accessibility
- Include key UI terms in captions
- Time-sync captions with actions

## Advanced Demonstrations (Optional Extensions)

If time permits, demonstrate:

**Swarm Coordination** (+2 minutes)
- Show barrier synchronization
- Demonstrate leader election
- Explain message bus

**Resource Monitoring** (+1 minute)
- Show memory usage over time
- Display CPU utilization graphs
- Explain limit enforcement

**Merge Strategies** (+2 minutes)
- Compare auto vs voting strategy
- Show manual resolution mode
- Demonstrate union merge option

## Troubleshooting Scenarios (Optional)

Show common issues and solutions:

**Agent Won't Start** (+1 minute)
- Show error message
- Explain concurrent agent limit
- Suggest reducing agent count

**Merge Conflicts Persist** (+1 minute)
- Show difficult conflict
- Explain manual edit option
- Demonstrate rejecting problematic files

---

## End of Script

**Total Duration**: 9-15 minutes (base) or 19+ minutes (with extensions)

**Key Features Demonstrated**:
- Agent spawning with configuration
- Real-time monitoring dashboard
- Interactive worktree graph
- Activity stream with auto-scroll
- Conflict detection and resolution
- Multiple merge strategies
- Export to target branch
- Automatic cleanup

**Call to Action**:
> "Download OpenChamber v1.7.0 today and experience the power of parallel AI-driven development."
