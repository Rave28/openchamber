import React from "react";
import { RiAlertLine, RiGitBranchLine, RiUserLine, RiRobotLine, RiBrainLine } from "@remixicon/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { AgentSpawnConfig, AgentType, BranchNamingStrategy } from "@/stores/agentStore";
import { useSkillsCatalogStore } from "@/stores/useSkillsCatalogStore";

interface AgentConfigFormProps {
  config: AgentSpawnConfig;
  onChange: (config: AgentSpawnConfig) => void;
  errors?: Record<string, string>;
}

const AGENT_TYPE_OPTIONS: { value: AgentType; label: string; icon: React.ReactNode }[] = [
  { value: "subagent", label: "Subagent", icon: <RiRobotLine className="size-4" /> },
  { value: "specialist", label: "Specialist", icon: <RiBrainLine className="size-4" /> },
  { value: "autonomous", label: "Autonomous", icon: <RiUserLine className="size-4" /> },
];

const BRANCH_NAMING_OPTIONS: { value: BranchNamingStrategy; label: string }[] = [
  { value: "auto", label: "Auto (agent/task-hash)" },
  { value: "prefix", label: "Prefix (custom/task)" },
  { value: "custom", label: "Custom (full branch name)" },
];

export const AgentConfigForm: React.FC<AgentConfigFormProps> = ({ config, onChange, errors }) => {
  const { itemsBySource, selectedSourceId } = useSkillsCatalogStore();
  const skills = React.useMemo(() => itemsBySource[selectedSourceId || ""] || [], [itemsBySource, selectedSourceId]);

  const handleChange = <K extends keyof AgentSpawnConfig>(key: K, value: AgentSpawnConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const toggleSkill = (skillDir: string) => {
    const selected = config.selectedSkills.includes(skillDir)
      ? config.selectedSkills.filter((s) => s !== skillDir)
      : [...config.selectedSkills, skillDir];
    handleChange("selectedSkills", selected);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="typography-ui-label text-foreground flex items-center gap-1.5">
          <RiUserLine className="size-4" />
          Agent Name
        </label>
        <Input
          value={config.agentName}
          onChange={(e) => handleChange("agentName", e.target.value)}
          placeholder="e.g., Feature Implementation Agent"
          aria-invalid={!!errors?.agentName}
        />
        {errors?.agentName && (
          <span className="typography-meta text-destructive flex items-center gap-1">
            <RiAlertLine className="size-3" />
            {errors.agentName}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="typography-ui-label text-foreground flex items-center gap-1.5">
          Agent Type
        </label>
        <Select
          value={config.agentType}
          onValueChange={(value: AgentType) => handleChange("agentType", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="typography-ui-label text-foreground flex items-center gap-1.5">
          Task Description
        </label>
        <Textarea
          value={config.task}
          onChange={(e) => handleChange("task", e.target.value)}
          placeholder="Describe the task you want the agent to work on..."
          rows={4}
          className="resize-none"
          aria-invalid={!!errors?.task}
        />
        {errors?.task && (
          <span className="typography-meta text-destructive flex items-center gap-1">
            <RiAlertLine className="size-3" />
            {errors.task}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="typography-ui-label text-foreground flex items-center gap-1.5">
          <RiGitBranchLine className="size-4" />
          Branch Naming Strategy
        </label>
        <Select
          value={config.branchNamingStrategy}
          onValueChange={(value: BranchNamingStrategy) => handleChange("branchNamingStrategy", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_NAMING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(config.branchNamingStrategy === "prefix" || config.branchNamingStrategy === "custom") && (
        <div className="flex flex-col gap-2">
          <label className="typography-ui-label text-foreground">
            {config.branchNamingStrategy === "prefix" ? "Branch Prefix" : "Custom Branch Name"}
          </label>
          <Input
            value={config.customBranchPrefix || ""}
            onChange={(e) => handleChange("customBranchPrefix", e.target.value)}
            placeholder={
              config.branchNamingStrategy === "prefix"
                ? "e.g., feature/billing"
                : "e.g., feature/billing-payment-integration"
            }
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="typography-ui-label text-foreground">
          Number of Parallel Agents
        </label>
        <Input
          type="number"
          min={1}
          max={10}
          value={config.parallelAgents}
          onChange={(e) => handleChange("parallelAgents", Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="typography-ui-label text-foreground">
          Skills & Personas
        </label>
        <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-2">
          {skills.length === 0 ? (
            <p className="typography-ui-label text-muted-foreground text-center py-4">
              No skills available
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {skills.map((skill) => (
                <label
                  key={skill.skillDir}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-interactive-hover/30 cursor-pointer"
                >
                  <Checkbox
                    checked={config.selectedSkills.includes(skill.skillDir)}
                    onChange={() => toggleSkill(skill.skillDir)}
                    ariaLabel={`Select ${skill.skillName}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="typography-ui-label text-foreground truncate">
                      {skill.frontmatterName || skill.skillName}
                    </p>
                    <p className="typography-meta text-muted-foreground line-clamp-2">
                      {skill.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
