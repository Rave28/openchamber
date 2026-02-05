import { test, expect, Page } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_PROJECT_DIR = process.env.TEST_PROJECT_DIR || path.join(process.cwd(), 'test-fixtures', 'sample-project');

interface Agent {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'terminating';
  branchName: string;
  worktreePath: string;
  task?: string;
  createdAt: number;
}

test.describe('Agent Manager E2E', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.goto(BASE_URL);
  });

  test.describe('Agent Spawn Dialog', () => {
    test('should open agent spawn dialog', async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await expect(page.locator('[data-testid="agent-spawn-dialog"]')).toBeVisible();
    });

    test('should display agent configuration form', async () => {
      await page.click('[data-testid="agent-manager-button"]');
      
      await expect(page.locator('input[name="agentName"]')).toBeVisible();
      await expect(page.locator('textarea[name="task"]')).toBeVisible();
      await expect(page.locator('select[name="baseBranch"]')).toBeVisible();
      await expect(page.locator('input[name="agentCount"]')).toBeVisible();
    });

    test('should validate agent name field', async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await page.click('[data-testid="spawn-agent-button"]');

      await expect(page.locator('[data-testid="agent-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-name-error"]')).toContainText('Agent name is required');
    });

    test('should spawn single agent successfully', async () => {
      await page.click('[data-testid="agent-manager-button"]');
      
      await page.fill('input[name="agentName"]', 'Test Agent 1');
      await page.fill('textarea[name="task"]', 'Test task description');
      await page.fill('input[name="agentCount"]', '1');
      
      await page.click('[data-testid="spawn-agent-button"]');

      await expect(page.locator('[data-testid="agent-spawn-success"]')).toBeVisible({ timeout: 5000 });
    });

    test('should spawn multiple agents successfully', async () => {
      await page.click('[data-testid="agent-manager-button"]');
      
      await page.fill('input[name="agentName"]', 'Test Agent');
      await page.fill('textarea[name="task"]', 'Test task description');
      await page.fill('input[name="agentCount"]', '3');
      
      await page.click('[data-testid="spawn-agent-button"]');

      await expect(page.locator('[data-testid="agent-spawn-success"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Agent Dashboard', () => {
    test.beforeEach(async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await page.fill('input[name="agentName"]', 'Test Agent');
      await page.fill('textarea[name="task"]', 'Test task');
      await page.fill('input[name="agentCount"]', '3');
      await page.click('[data-testid="spawn-agent-button"]');
      await page.waitForSelector('[data-testid="agent-spawn-success"]', { timeout: 10000 });
      await page.click('[data-testid="close-dialog"]');
    });

    test('should display agent cards', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');

      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBeGreaterThan(0);
    });

    test('should display agent status indicators', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');

      const statusIndicators = await page.locator('[data-testid="agent-status-indicator"]').count();
      expect(statusIndicators).toBeGreaterThan(0);
    });

    test('should update agent status in real-time', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');

      await expect(page.locator('[data-testid="agent-status-active"]')).toBeVisible({ timeout: 15000 });
    });

    test('should display agent task information', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');

      await expect(page.locator('[data-testid="agent-task"]')).toContainText('Test task');
    });

    test('should display responsive grid', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');

      await page.setViewportSize({ width: 768, height: 1024 });
      const tabletCards = await page.locator('[data-testid="agent-card"]').count();
      
      await page.setViewportSize({ width: 1024, height: 768 });
      const desktopCards = await page.locator('[data-testid="agent-card"]').count();

      expect(tabletCards).toBeGreaterThan(0);
      expect(desktopCards).toBeGreaterThan(0);
    });
  });

  test.describe('Worktree Graph', () => {
    test.beforeEach(async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await page.fill('input[name="agentName"]', 'Test Agent');
      await page.fill('textarea[name="task"]', 'Test task');
      await page.fill('input[name="agentCount"]', '3');
      await page.click('[data-testid="spawn-agent-button"]');
      await page.waitForSelector('[data-testid="agent-spawn-success"]', { timeout: 10000 });
      await page.click('[data-testid="close-dialog"]');
    });

    test('should display worktree visualization', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');

      await expect(page.locator('svg')).toBeVisible();
    });

    test('should display base branch node', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');

      await expect(page.locator('[data-testid="base-branch-node"]')).toBeVisible();
    });

    test('should display agent nodes', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');

      const agentNodes = await page.locator('[data-testid="agent-node"]').count();
      expect(agentNodes).toBeGreaterThan(0);
    });

    test('should display edges connecting nodes', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');

      await expect(page.locator('path[marker-end="url(#arrowhead)"]')).toHaveCount(3);
    });

    test('should support zoom controls', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');

      await page.click('[data-testid="zoom-in-button"]');
      const zoomLevel1 = await page.locator('[data-testid="zoom-level"]').textContent();
      
      await page.click('[data-testid="zoom-out-button"]');
      const zoomLevel2 = await page.locator('[data-testid="zoom-level"]').textContent();

      expect(zoomLevel1).not.toBe(zoomLevel2);
    });

    test('should support pan controls', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');
      
      const svg = await page.locator('svg').boundingBox();
      if (!svg) throw new Error('SVG not found');

      await page.mouse.move(svg.x + svg.width / 2, svg.y + svg.height / 2);
      await page.mouse.down();
      await page.mouse.move(svg.x + svg.width / 2 + 50, svg.y + svg.height / 2 + 50);
      await page.mouse.up();

      await expect(page.locator('g[transform*="translate"]')).toBeVisible();
    });

    test('should display node details on click', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');
      await page.click('[data-testid="agent-node"]');

      await expect(page.locator('[data-testid="node-details-panel"]')).toBeVisible();
    });

    test('should display branch name on nodes', async () => {
      await page.click('[data-testid="worktree-graph-tab"]');

      await expect(page.locator('[data-testid="agent-node"] [data-testid="branch-name"]')).toBeVisible();
    });
  });

  test.describe('Agent Management', () => {
    test.beforeEach(async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await page.fill('input[name="agentName"]', 'Test Agent');
      await page.fill('textarea[name="task"]', 'Test task');
      await page.fill('input[name="agentCount"]', '1');
      await page.click('[data-testid="spawn-agent-button"]');
      await page.waitForSelector('[data-testid="agent-spawn-success"]', { timeout: 10000 });
      await page.click('[data-testid="close-dialog"]');
    });

    test('should terminate agent', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');
      await page.click('[data-testid="terminate-agent-button"]');

      await expect(page.locator('[data-testid="terminate-confirmation-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-terminate-button"]');

      await expect(page.locator('[data-testid="agent-status-terminated"]')).toBeVisible({ timeout: 5000 });
    });

    test('should view agent logs', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');
      await page.click('[data-testid="view-logs-button"]');

      await expect(page.locator('[data-testid="agent-logs-panel"]')).toBeVisible();
    });

    test('should display agent activity stream', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');

      await expect(page.locator('[data-testid="activity-stream"]')).toBeVisible();
    });

    test('should auto-scroll activity stream', async () => {
      await page.click('[data-testid="agent-dashboard-tab"]');

      const stream = await page.locator('[data-testid="activity-stream"]').boundingBox();
      if (!stream) throw new Error('Stream not found');

      const initialScroll = await page.evaluate(() => window.scrollY);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const finalScroll = await page.evaluate(() => window.scrollY);

      expect(finalScroll).toBeGreaterThanOrEqual(initialScroll);
    });
  });

  test.describe('Result Consolidation', () => {
    test.beforeEach(async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await page.fill('input[name="agentName"]', 'Test Agent');
      await page.fill('textarea[name="task"]', 'Test task');
      await page.fill('input[name="agentCount"]', '3');
      await page.click('[data-testid="spawn-agent-button"]');
      await page.waitForSelector('[data-testid="agent-spawn-success"]', { timeout: 10000 });
      await page.click('[data-testid="close-dialog"]');

      await page.click('[data-testid="agent-dashboard-tab"]');
      
      await page.waitForTimeout(5000);

      await expect(page.locator('[data-testid="agent-status-completed"]')).first().toBeVisible({ timeout: 30000 });
    });

    test('should display consolidation dialog', async () => {
      await page.click('[data-testid="consolidate-results-button"]');

      await expect(page.locator('[data-testid="consolidation-dialog"]')).toBeVisible();
    });

    test('should display merge preview', async () => {
      await page.click('[data-testid="consolidate-results-button"]');

      await expect(page.locator('[data-testid="merge-preview"]')).toBeVisible({ timeout: 10000 });
    });

    test('should display conflicting files', async () => {
      await page.click('[data-testid="consolidate-results-button"]');

      await expect(page.locator('[data-testid="conflict-list"]')).toBeVisible({ timeout: 10000 });
    });

    test('should display auto-mergeable files', async () => {
      await page.click('[data-testid="consolidate-results-button"]');

      await expect(page.locator('[data-testid="auto-merge-list"]')).toBeVisible({ timeout: 10000 });
    });

    test('should resolve conflicts', async () => {
      await page.click('[data-testid="consolidate-results-button"]');
      
      await page.click('[data-testid="conflict-resolution-button"]');
      await page.selectOption('[data-testid="resolution-action"]', 'merge');
      await page.click('[data-testid="apply-resolution-button"]');

      await expect(page.locator('[data-testid="resolution-applied"]')).toBeVisible();
    });

    test('should export to target branch', async () => {
      await page.click('[data-testid="consolidate-results-button"]');
      
      await page.click('[data-testid="export-button"]');

      await expect(page.locator('[data-testid="export-success"]')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('API Integration', () => {
    test('should GET all agents', async () => {
      const response = await page.request.get(`${BASE_URL}/api/agents`);
      
      expect(response.status()).toBe(200);
      const agents = await response.json();
      expect(Array.isArray(agents)).toBe(true);
    });

    test('should POST spawn agent', async () => {
      const response = await page.request.post(`${BASE_URL}/api/agents`, {
        data: {
          projectDirectory: TEST_PROJECT_DIR,
          agentName: 'Test Agent',
          task: 'Test task',
          baseBranch: 'main',
          agentCount: 1,
        },
      });

      expect(response.status()).toBe(200);
      const agent = await response.json();
      expect(agent).toHaveProperty('id');
      expect(agent.name).toBe('Test Agent');
    });

    test('should GET agent by ID', async () => {
      const createResponse = await page.request.post(`${BASE_URL}/api/agents`, {
        data: {
          projectDirectory: TEST_PROJECT_DIR,
          agentName: 'Test Agent',
          task: 'Test task',
        },
      });
      const createdAgent = await createResponse.json();

      const response = await page.request.get(`${BASE_URL}/api/agents/${createdAgent.id}`);
      
      expect(response.status()).toBe(200);
      const agent = await response.json();
      expect(agent.id).toBe(createdAgent.id);
    });

    test('should DELETE agent', async () => {
      const createResponse = await page.request.post(`${BASE_URL}/api/agents`, {
        data: {
          projectDirectory: TEST_PROJECT_DIR,
          agentName: 'Test Agent',
          task: 'Test task',
        },
      });
      const createdAgent = await createResponse.json();

      const response = await page.request.delete(`${BASE_URL}/api/agents/${createdAgent.id}`);
      
      expect(response.status()).toBe(200);

      const getResponse = await page.request.get(`${BASE_URL}/api/agents/${createdAgent.id}`);
      expect(getResponse.status()).toBe(404);
    });

    test('should POST initiate consolidation', async () => {
      const agentsResponse = await page.request.get(`${BASE_URL}/api/agents`);
      const agents = await agentsResponse.json();

      const response = await page.request.post(`${BASE_URL}/api/consolidations`, {
        data: {
          projectDirectory: TEST_PROJECT_DIR,
          baseBranch: 'main',
          agentIds: agents.slice(0, 3).map((a: Agent) => a.id),
          strategy: 'auto',
        },
      });

      expect(response.status()).toBe(200);
      const consolidation = await response.json();
      expect(consolidation).toHaveProperty('id');
    });

    test('should POST analyze results', async () => {
      const agentsResponse = await page.request.get(`${BASE_URL}/api/agents`);
      const agents = await agentsResponse.json();

      const consolidationResponse = await page.request.post(`${BASE_URL}/api/consolidations`, {
        data: {
          projectDirectory: TEST_PROJECT_DIR,
          baseBranch: 'main',
          agentIds: agents.slice(0, 3).map((a: Agent) => a.id),
        },
      });
      const consolidation = await consolidationResponse.json();

      const response = await page.request.post(`${BASE_URL}/api/consolidations/${consolidation.id}/analyze`, {
        data: {
          agentResults: agents.slice(0, 3).map((a: Agent) => ({
            id: a.id,
            name: a.name,
            worktreePath: a.worktreePath,
          })),
        },
      });

      expect(response.status()).toBe(200);
      const preview = await response.json();
      expect(preview).toHaveProperty('files');
    });
  });

  test.describe('Full Workflow', () => {
    test('should complete full workflow: spawn -> monitor -> consolidate -> export', async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await page.fill('input[name="agentName"]', 'Refactoring Agent');
      await page.fill('textarea[name="task"]', 'Refactor authentication module');
      await page.fill('input[name="agentCount"]', '3');
      await page.click('[data-testid="spawn-agent-button"]');

      await expect(page.locator('[data-testid="agent-spawn-success"]')).toBeVisible({ timeout: 10000 });
      await page.click('[data-testid="close-dialog"]');

      await page.click('[data-testid="agent-dashboard-tab"]');
      await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3);

      await page.click('[data-testid="worktree-graph-tab"]');
      await expect(page.locator('[data-testid="agent-node"]')).toHaveCount(3);

      await page.click('[data-testid="agent-dashboard-tab"]');
      
      await expect(page.locator('[data-testid="agent-status-completed"]')).first().toBeVisible({ timeout: 60000 });
      
      await page.click('[data-testid="consolidate-results-button"]');
      await expect(page.locator('[data-testid="consolidation-dialog"]')).toBeVisible({ timeout: 10000 });

      await page.click('[data-testid="export-button"]');
      await expect(page.locator('[data-testid="export-success"]')).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should display error on spawn failure', async () => {
      const response = await page.request.post(`${BASE_URL}/api/agents`, {
        data: {
          projectDirectory: '/invalid/path',
          agentName: 'Test Agent',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('should display error on invalid agent ID', async () => {
      const response = await page.request.get(`${BASE_URL}/api/agents/invalid-id`);
      
      expect(response.status()).toBe(404);
    });

    test('should display error on consolidation failure', async () => {
      const response = await page.request.post(`${BASE_URL}/api/consolidations`, {
        data: {
          projectDirectory: '/invalid/path',
          baseBranch: 'main',
          agentIds: ['invalid-id'],
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Conflict Resolution Flow', () => {
    test.beforeEach(async () => {
      await page.click('[data-testid="agent-manager-button"]');
      await page.fill('input[name="agentName"]', 'Test Agent');
      await page.fill('textarea[name="task"]', 'Test task');
      await page.fill('input[name="agentCount"]', '3');
      await page.click('[data-testid="spawn-agent-button"]');
      await page.waitForSelector('[data-testid="agent-spawn-success"]', { timeout: 10000 });
      await page.click('[data-testid="close-dialog"]');

      await page.click('[data-testid="agent-dashboard-tab"]');
      
      await page.waitForTimeout(5000);

      await expect(page.locator('[data-testid="agent-status-completed"]')).first().toBeVisible({ timeout: 30000 });
    });

    test('should display diff view for conflicts', async () => {
      await page.click('[data-testid="consolidate-results-button"]');
      
      await page.click('[data-testid="conflict-file"]');

      await expect(page.locator('[data-testid="diff-view"]')).toBeVisible();
    });

    test('should allow choosing merge strategy', async () => {
      await page.click('[data-testid="consolidate-results-button"]');
      
      await page.click('[data-testid="merge-strategy-select"]');
      await page.click('[data-testid="strategy-voting"]');

      await expect(page.locator('[data-testid="strategy-voting"]')).toHaveClass(/selected/);
    });

    test('should apply resolution to multiple conflicts', async () => {
      await page.click('[data-testid="consolidate-results-button"]');
      
      const conflicts = await page.locator('[data-testid="conflict-file"]').count();
      
      for (let i = 0; i < Math.min(conflicts, 2); i++) {
        await page.locator('[data-testid="conflict-file"]').nth(i).click();
        await page.selectOption('[data-testid="resolution-action"]', 'merge');
        await page.click('[data-testid="apply-resolution-button"]');
      }

      const resolvedCount = await page.locator('[data-testid="resolution-applied"]').count();
      expect(resolvedCount).toBeGreaterThanOrEqual(2);
    });
  });
});
