import React from "react";
import { RiRobotLine, RiLoader4Line, RiAlertLine } from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentConfigForm } from "./AgentConfigForm";
import type { AgentSpawnConfig } from "@/stores/agentStore";
import { useAgentStore } from "@/stores/agentStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { opencodeClient } from "@/lib/opencode/client";

interface AgentSpawnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDefaultConfig = (): AgentSpawnConfig => ({
  projectDirectory: "",
  agentName: "",
  agentType: "subagent",
  task: "",
  parallelAgents: 1,
  branchNamingStrategy: "auto",
  customBranchPrefix: "",
  selectedSkills: [],
  baseBranch: "main",
});

const validateConfig = (config: AgentSpawnConfig): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!config.agentName.trim()) {
    errors.agentName = "Agent name is required";
  } else if (config.agentName.length > 100) {
    errors.agentName = "Agent name must be less than 100 characters";
  }

  if (!config.task.trim()) {
    errors.task = "Task description is required";
  }

  if (config.parallelAgents < 1 || config.parallelAgents > 10) {
    errors.parallelAgents = "Number of agents must be between 1 and 10";
  }

  return errors;
};

export const AgentSpawnDialog: React.FC<AgentSpawnDialogProps> = ({ open, onOpenChange }) => {
  const [config, setConfig] = React.useState<AgentSpawnConfig>(getDefaultConfig);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitErrors, setSubmitErrors] = React.useState<Record<string, string>>({});
  const { spawnAgents, projectDirectory: storeProjectDir, setProjectDirectory } = useAgentStore();

  const activeProject = useProjectsStore((state) => state.getActiveProject?.());
  const opencodeDirectory = opencodeClient.getDirectory();

  React.useEffect(() => {
    if (open) {
      const dir = activeProject?.path || storeProjectDir || (typeof opencodeDirectory === "string" ? opencodeDirectory : "");
      setConfig((prev) => ({
        ...prev,
        projectDirectory: dir,
      }));
      setSubmitErrors({});
    }
  }, [open, activeProject, storeProjectDir, opencodeDirectory]);

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setConfig(getDefaultConfig);
      setSubmitErrors({});
    }
  };

  const handleSpawn = async () => {
    const errors = validateConfig(config);
    setSubmitErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await spawnAgents(config);
      setProjectDirectory(config.projectDirectory);
      handleClose();
    } catch (error) {
      setSubmitErrors({
        submit: error instanceof Error ? error.message : "Failed to spawn agent(s)",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (newConfig: AgentSpawnConfig) => {
    setConfig(newConfig);
    if (Object.keys(submitErrors).length > 0) {
      setSubmitErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        keyboardAvoid
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <RiRobotLine className="size-5" />
            Spawn Agent
          </DialogTitle>
          <DialogDescription>
            Create one or more parallel agents to work on a task in isolated worktrees
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {submitErrors.submit && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <div className="flex items-start gap-2">
                <RiAlertLine className="size-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="typography-ui-label text-destructive">
                  {submitErrors.submit}
                </p>
              </div>
            </div>
          )}

          <AgentConfigForm
            config={config}
            onChange={handleChange}
            errors={submitErrors}
          />
        </div>

        <DialogFooter className="flex-shrink-0 mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSpawn}
            disabled={isSubmitting}
            className={cn(
              "gap-2",
              isSubmitting && "opacity-70"
            )}
          >
            {isSubmitting ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                Spawning...
              </>
            ) : config.parallelAgents > 1 ? (
              <>
                <RiRobotLine className="size-4" />
                Spawn {config.parallelAgents} Agents
              </>
            ) : (
              <>
                <RiRobotLine className="size-4" />
                Spawn Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
