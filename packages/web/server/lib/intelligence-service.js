import fs from "fs/promises";
import path from "path";

/**
 * Service for aggregating metadata about the OpenChamber Intelligence Layer.
 */
export const getIntelligenceMetadata = async (projectRoot) => {
  const manifestPath = path.join(
    projectRoot,
    ".opencode",
    "skills_manifest.json",
  );
  const hiveMemoryPath = path.join(projectRoot, ".opencode", "HIVE_MEMORY.md");

  let skills = [];
  try {
    const data = await fs.readFile(manifestPath, "utf8");
    skills = JSON.parse(data);
  } catch (error) {
    console.warn(
      "[intelligence-service] Could not read skills manifest:",
      error.message,
    );
  }

  let hiveMemorySnippet = "";
  try {
    const data = await fs.readFile(hiveMemoryPath, "utf8");
    // Get the last 5 decisions or so
    const lines = data.split("\n");
    const decisionIndex = lines.findIndex((l) =>
      l.includes("## 🔑 Crucial Decisions"),
    );
    if (decisionIndex !== -1) {
      hiveMemorySnippet = lines
        .slice(decisionIndex + 1, decisionIndex + 10)
        .join("\n")
        .trim();
    }
  } catch (error) {
    // Hive memory might not exist yet
  }

  return {
    totalSkills: skills.length,
    skills: skills.map((s) => ({
      name: s.name,
      description: s.description,
      category: s.category || "General",
    })),
    hiveMemoryLatest: hiveMemorySnippet,
    status: "Active",
    lastSync: new Date().toISOString(),
  };
};
