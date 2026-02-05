import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import type { StoreApi, UseBoundStore } from "zustand";

export type AgentStatus = "pending" | "active" | "completed" | "failed";
export type AgentType = "subagent" | "specialist" | "autonomous";
export type BranchNamingStrategy = "auto" | "prefix" | "custom";

export interface AgentRuntime {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  projectDirectory: string;
  worktreePath: string;
  branchName: string;
  baseBranch: string;
  task: string | null;
  processId: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  selectedSkills?: string[];
}

export interface AgentSpawnConfig {
  projectDirectory: string;
  agentName: string;
  agentType: AgentType;
  task: string;
  parallelAgents: number;
  branchNamingStrategy: BranchNamingStrategy;
  customBranchPrefix?: string;
  selectedSkills: string[];
  baseBranch?: string;
}

export interface AgentStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

interface AgentStore {
  agents: AgentRuntime[];
  isLoading: boolean;
  error: string | null;
  projectDirectory: string | null;
  filter: {
    status: AgentStatus | "all";
    searchTerm: string;
  };
  sortBy: "createdAt" | "name" | "status";
  sortDirection: "asc" | "desc";

  setProjectDirectory: (dir: string | null) => void;
  setFilter: (filter: Partial<AgentStore["filter"]>) => void;
  setSortBy: (sortBy: AgentStore["sortBy"]) => void;
  setSortDirection: (direction: AgentStore["sortDirection"]) => void;

  loadAgents: () => Promise<void>;
  spawnAgents: (config: AgentSpawnConfig) => Promise<AgentRuntime[]>;
  terminateAgent: (id: string) => Promise<void>;
  getAgentById: (id: string) => AgentRuntime | undefined;
  getFilteredAgents: () => AgentRuntime[];
  getStats: () => AgentStats;
  clearError: () => void;
}

declare global {
  interface Window {
    __zustand_agent_runtime_store__?: UseBoundStore<StoreApi<AgentStore>>;
  }
}

export const useAgentStore = create<AgentStore>()(
  devtools(
    persist(
      (set, get) => ({
        agents: [],
        isLoading: false,
        error: null,
        projectDirectory: null,
        filter: {
          status: "all",
          searchTerm: "",
        },
        sortBy: "createdAt",
        sortDirection: "desc",

        setProjectDirectory: (dir: string | null) => {
          set({ projectDirectory: dir });
        },

        setFilter: (filter: Partial<AgentStore["filter"]>) => {
          set((state) => ({
            filter: { ...state.filter, ...filter },
          }));
        },

        setSortBy: (sortBy: AgentStore["sortBy"]) => {
          set({ sortBy });
        },

        setSortDirection: (direction: AgentStore["sortDirection"]) => {
          set({ sortDirection: direction });
        },

        loadAgents: async () => {
          set({ isLoading: true, error: null });
          try {
            const { projectDirectory, filter } = get();
            const params = new URLSearchParams();
            if (projectDirectory) {
              params.append("projectDirectory", projectDirectory);
            }
            if (filter.status !== "all") {
              params.append("status", filter.status);
            }

            const response = await fetch(`/api/agents/status?${params.toString()}`);
            if (!response.ok) {
              throw new Error("Failed to load agents");
            }

            const data = await response.json();
            set({ agents: data.agents || [], isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
          }
        },

        spawnAgents: async (config: AgentSpawnConfig) => {
          set({ isLoading: true, error: null });
          const spawnedAgents: AgentRuntime[] = [];

          try {
            const promises = Array.from({ length: config.parallelAgents }, (_, i) => {
              const suffix = config.parallelAgents > 1 ? `-${i + 1}` : "";
              const agentName = config.parallelAgents > 1 ? `${config.agentName}${suffix}` : config.agentName;
              
              let branchName: string | undefined;
              if (config.branchNamingStrategy === "custom" && config.customBranchPrefix) {
                branchName = `${config.customBranchPrefix}-${agentName.toLowerCase().replace(/\s+/g, "-")}`;
              }

              const body = {
                projectDirectory: config.projectDirectory,
                agentName,
                agentType: config.agentType,
                task: config.task,
                branchName,
                baseBranch: config.baseBranch || "main",
                selectedSkills: config.selectedSkills,
              };

              return fetch("/api/agents/spawn", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }).then(async (res) => {
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({}));
                  throw new Error(errorData.error || "Failed to spawn agent");
                }
                return res.json();
              });
            });

            const results = await Promise.allSettled(promises);
            
            for (const result of results) {
              if (result.status === "fulfilled" && result.value?.agent) {
                spawnedAgents.push(result.value.agent);
              }
            }

            if (spawnedAgents.length === 0) {
              throw new Error("No agents were spawned successfully");
            }

            set((state) => ({
              agents: [...spawnedAgents, ...state.agents],
              isLoading: false,
            }));

            return spawnedAgents;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            set({
              error: errorMsg,
              isLoading: false,
            });
            throw error;
          }
        },

        terminateAgent: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`/api/agents/${id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              throw new Error("Failed to terminate agent");
            }

            set((state) => ({
              agents: state.agents.filter((a) => a.id !== id),
              isLoading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        getAgentById: (id: string) => {
          return get().agents.find((a) => a.id === id);
        },

        getFilteredAgents: () => {
          const state = get();
          let filtered = [...state.agents];

          if (state.filter.status !== "all") {
            filtered = filtered.filter((a) => a.status === state.filter.status);
          }

          if (state.filter.searchTerm) {
            const term = state.filter.searchTerm.toLowerCase();
            filtered = filtered.filter(
              (a) =>
                a.name.toLowerCase().includes(term) ||
                a.task?.toLowerCase().includes(term) ||
                a.branchName.toLowerCase().includes(term)
            );
          }

          filtered.sort((a, b) => {
            let compareResult = 0;
            const dir = state.sortDirection === "asc" ? 1 : -1;

            switch (state.sortBy) {
              case "name":
                compareResult = a.name.localeCompare(b.name);
                break;
              case "status":
                compareResult = a.status.localeCompare(b.status);
                break;
              case "createdAt":
              default:
                compareResult = a.createdAt - b.createdAt;
                break;
            }

            return compareResult * dir;
          });

          return filtered;
        },

        getStats: () => {
          const agents = get().agents;
          return {
            total: agents.length,
            pending: agents.filter((a) => a.status === "pending").length,
            active: agents.filter((a) => a.status === "active").length,
            completed: agents.filter((a) => a.status === "completed").length,
            failed: agents.filter((a) => a.status === "failed").length,
          };
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: "agent-runtime-store",
        storage: createJSONStorage(() => window.localStorage),
        partialize: (state) => ({
          projectDirectory: state.projectDirectory,
          filter: state.filter,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
        }),
      }
    ),
    { name: "agent-runtime-store" }
  )
);

if (typeof window !== "undefined") {
  window.__zustand_agent_runtime_store__ = useAgentStore;
}
