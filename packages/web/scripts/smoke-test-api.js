import path from "path";

const API_URL = "http://localhost:3001/api/agents";
// Use the workspace root for the project directory
const PROJECT_DIR = process.env.GITHUB_WORKSPACE || process.cwd();

async function runSmokeTests() {
  console.log("🚀 Starting API Smoke Tests...");

  // Test 1: Spawn Agent
  console.log("\n[Test 1] Spawning Agent...");
  const spawnRes = await fetch(`${API_URL}/spawn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectDirectory: PROJECT_DIR,
      agentName: "SmokeTestAgent",
      agentType: "subagent",
      task: "Add smoke test comment to README.md",
      baseBranch: "feature/agent-manager-v1",
    }),
  });

  const spawnData = await spawnRes.json();
  if (spawnRes.status !== 201) {
    throw new Error(`Spawn failed: ${JSON.stringify(spawnData)}`);
  }

  const { agent } = spawnData;
  console.log(`✅ Agent spawned: ${agent.id} (${agent.name})`);

  // Test 2: Check Status
  console.log("\n[Test 2] Checking Status...");
  const statusRes = await fetch(`${API_URL}/status?agentId=${agent.id}`);
  const statusData = await statusRes.json();
  if (!statusData.success) {
    throw new Error(`Status check failed: ${JSON.stringify(statusData)}`);
  }
  console.log(`✅ Agent status: ${statusData.agent.status}`);

  // Test 3: Terminate
  console.log("\n[Test 3] Terminating Agent...");
  const termRes = await fetch(`${API_URL}/${agent.id}`, {
    method: "DELETE",
  });

  const termData = await termRes.json();
  if (termRes.ok) {
    console.log(`✅ ${termData.message}`);
  } else {
    throw new Error(`Termination failed: ${JSON.stringify(termData)}`);
  }

  console.log("\n✨ All API Smoke Tests Passed!");
}

runSmokeTests().catch((err) => {
  console.error("\n❌ Smoke Tests Failed:", err);
  process.exit(1);
});
