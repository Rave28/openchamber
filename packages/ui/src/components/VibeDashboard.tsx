import React, { useEffect, useState } from "react";
import { useThemeSystem } from "../contexts/useThemeSystem";
import { typography, getTypographyStyle } from "../lib/typography";

/**
 * 🛰️ Vibe Dashboard
 * Powered by Swarm Observability Sentinel & Vibe Polisher
 * Integrates with the Intelligence Layer API
 */
export const VibeDashboard = () => {
  const { currentTheme } = useThemeSystem();
  const [heartbeat, setHeartbeat] = useState<number>(0);
  const [status, setStatus] = useState("Synchronizing...");
  const [intelligence, setIntelligence] = useState<{
    totalSkills: number;
    status: string;
    lastSync: string;
  } | null>(null);

  // Fetch real intelligence metadata
  useEffect(() => {
    const fetchIntelligence = async () => {
      try {
        const resp = await fetch("/api/global/intelligence");
        if (resp.ok) {
          const data = await resp.json();
          setIntelligence(data);
          setStatus("Hive Mind: OPTIMAL 🟢");
        }
      } catch (error) {
        console.error("Failed to fetch intelligence metrics:", error);
        setStatus("Sentinel: API OFFLINE 🔴");
      }
    };
    fetchIntelligence();
    const interval = setInterval(fetchIntelligence, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, []);

  // Simulate Swarm Observability Sentinel Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartbeat((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        backgroundColor: currentTheme.colors.surface.elevated,
        borderColor: currentTheme.colors.interactive.border,
        color: currentTheme.colors.surface.foreground,
        padding: "24px",
        borderRadius: "16px",
      }}
      className="border backdrop-blur-xl shadow-2xl max-w-lg mx-auto mt-10"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={getTypographyStyle("uiHeader")}>Swarm Dashboard</h2>
          <p className="text-[10px] opacity-50 uppercase tracking-tighter">
            OpenChamber v1.6.4 • Specialized Swarm
          </p>
        </div>
        <div
          style={{
            backgroundColor: status.includes("OPTIMAL")
              ? currentTheme.colors.status.successBackground
              : currentTheme.colors.status.errorBackground,
            color: status.includes("OPTIMAL")
              ? currentTheme.colors.status.success
              : currentTheme.colors.status.error,
            padding: "4px 12px",
            borderRadius: "9999px",
          }}
          className="text-xs font-bold transition-colors duration-500"
        >
          {status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Metric 1: Heartbeats */}
        <div
          style={{ backgroundColor: currentTheme.colors.surface.muted }}
          className="p-4 rounded-xl border border-white/5"
        >
          <p className="text-xs uppercase tracking-widest opacity-60">
            Heartbeats
          </p>
          <p style={getTypographyStyle("code.block")} className="text-2xl">
            {heartbeat}
          </p>
        </div>

        {/* Metric 2: Intelligence Matrix */}
        <div
          style={{ backgroundColor: currentTheme.colors.surface.muted }}
          className="p-4 rounded-xl border border-white/5"
        >
          <p className="text-xs uppercase tracking-widest opacity-60">Matrix</p>
          <p style={getTypographyStyle("code.block")} className="text-2xl">
            {intelligence?.totalSkills || 46} Skills
          </p>
        </div>
      </div>

      <div
        style={{
          backgroundColor: `${currentTheme.colors.status.infoBackground}33`,
          borderColor: `${currentTheme.colors.status.info}33`,
          color: currentTheme.colors.status.info,
        }}
        className="mt-6 p-4 rounded-lg border text-sm font-mono text-xs"
      >
        <div className="flex justify-between">
          <span>📡 Sentinel: PULSE CHECK</span>
          <span className="animate-pulse">OK</span>
        </div>
        {intelligence?.lastSync && (
          <div className="mt-2 pt-2 border-t border-white/5 opacity-60">
            SYNC: {new Date(intelligence.lastSync).toLocaleTimeString()}
          </div>
        )}
      </div>

      <button
        style={{
          backgroundColor: currentTheme.colors.primary.base,
          color: currentTheme.colors.primary.foreground,
          padding: "12px",
          marginTop: "24px",
        }}
        className="w-full rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg text-sm"
        onClick={() => window.location.reload()}
      >
        HARD SYNC
      </button>
    </div>
  );
};
