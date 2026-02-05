import React, { useState, useCallback, useMemo } from 'react';
import {
  RiGitMergeLine,
  RiGitBranchLine,
  RiCheckLine,
  RiCloseLine,
  RiFileTextLine,
  RiRefreshLine,
  RiDownloadLine,
  RiExpandDiagonalLine,
  RiContrastLine,
} from '@remixicon/react';
import { useThemeSystem } from '@/contexts/useThemeSystem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Theme } from '@/types/theme';

export interface AgentResult {
  id: string;
  name: string;
  worktreePath: string;
  branchName: string;
}

export interface FileConflict {
  path: string;
  type: string;
  agentA: string;
  agentB: string;
  conflicts: Array<{
    lineNumber?: number;
    contentA?: string;
    contentB?: string;
  }>;
}

export interface MergePreview {
  consolidationId: string;
  totalFiles: number;
  autoMergeable: number;
  conflictingFiles: number;
  files: Array<{
    path: string;
    agentId: string;
    agentName: string;
    scores: {
      total: number;
      consistency: number;
      testCoverage: number;
      codeQuality: number;
      efficiency: number;
    };
  }>;
  conflicts: Array<{
    path: string;
    conflicts: FileConflict[];
  }>;
  stats?: {
    total: number;
    conflicts: number;
    autoMergeable: number;
    resolved: number;
    rejected: number;
  };
}

export interface ResultMergePanelProps {
  consolidationId?: string;
  projectDirectory?: string;
  baseBranch?: string;
  agentResults: AgentResult[];
  onMergeComplete?: (result: MergeResult) => void;
  onExportToBranch?: (branchName: string) => void;
  className?: string;
}

export interface MergeResult {
  consolidationId: string;
  merged: string[];
  failed: string[];
  errors: Array<{ path?: string; error: string }>;
}

export interface Resolution {
  path: string;
  action: 'merge' | 'reject' | 'keep-ours' | 'keep-theirs' | 'voting' | 'union' | 'manual';
  sourceAgent?: string;
  sourceBranch?: string;
}

const getConflictTypeColor = (type: string, theme: Theme) => {
  switch (type) {
    case 'same-line':
      return { bg: theme.colors.status.warningBackground, color: theme.colors.status.warning, border: theme.colors.status.warningBorder };
    case 'delete-modify':
      return { bg: theme.colors.status.errorBackground, color: theme.colors.status.error, border: theme.colors.status.errorBorder };
    case 'import-conflict':
    case 'export-conflict':
      return { bg: theme.colors.status.infoBackground, color: theme.colors.status.info, border: theme.colors.status.infoBorder };
    case 'structural':
      return { bg: theme.colors.status.warningBackground, color: theme.colors.status.warning, border: theme.colors.status.warningBorder };
    default:
      return { bg: theme.colors.surface.muted, color: theme.colors.surface.mutedForeground, border: theme.colors.interactive.border };
  }
};

export const ResultMergePanel: React.FC<ResultMergePanelProps> = ({
  consolidationId,
  baseBranch,
  agentResults,
  onMergeComplete,
  onExportToBranch,
  className,
}) => {
  const { currentTheme } = useThemeSystem();
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MergePreview['files'][0] | null>(null);
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(new Map());
  const [filterStatus, setFilterStatus] = useState<'all' | 'conflicts' | 'auto-merge'>('all');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [exportBranchName, setExportBranchName] = useState(`${baseBranch || 'main'}-merged`);
  const [selectedStrategy, setSelectedStrategy] = useState<'merge' | 'keep-ours' | 'keep-theirs' | 'voting' | 'union' | 'manual'>('merge');

  const stats = useMemo(() => {
    if (!mergePreview) return null;
    const resolutionValues = Array.from(resolutions.values());
    return {
      total: mergePreview.totalFiles,
      conflicts: mergePreview.conflictingFiles,
      autoMergeable: mergePreview.autoMergeable,
      resolved: resolutionValues.filter(r => r.action !== 'reject').length,
      rejected: resolutionValues.filter(r => r.action === 'reject').length,
    };
  }, [mergePreview, resolutions]);

  const filteredFiles = useMemo(() => {
    if (!mergePreview) return [];

    if (filterStatus === 'all') {
      return mergePreview.files;
    }
    
    if (filterStatus === 'conflicts') {
      const conflictPaths = new Set(mergePreview.conflicts.map(c => c.path));
      return mergePreview.files.filter(f => conflictPaths.has(f.path));
    }
    
    if (filterStatus === 'auto-merge') {
      const conflictPaths = new Set(mergePreview.conflicts.map(c => c.path));
      return mergePreview.files.filter(f => !conflictPaths.has(f.path));
    }
    
    return mergePreview.files;
  }, [mergePreview, filterStatus]);

  const handleAnalyze = useCallback(async () => {
    if (!consolidationId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/consolidate/${consolidationId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentResults }),
      });
      
      if (!response.ok) throw new Error('Failed to analyze results');
      
      const preview = await response.json();
      setMergePreview(preview);
    } catch (error) {
      console.error('[ResultMergePanel] Analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [consolidationId, agentResults]);

  const handleResolution = useCallback((filePath: string, action: Resolution['action'], sourceAgent?: string) => {
    setResolutions(prev => {
      const next = new Map(prev);
      next.set(filePath, {
        path: filePath,
        action,
        sourceAgent,
        sourceBranch: sourceAgent ? agentResults.find(a => a.id === sourceAgent)?.branchName : undefined,
      });
      return next;
    });
  }, [agentResults]);

  const handleFileSelect = useCallback((file: MergePreview['files'][0]) => {
    setSelectedFile(file);
  }, []);

  const handleApplyResolutions = useCallback(async () => {
    if (!consolidationId) return;
    
    setIsLoading(true);
    try {
      const resolutionList = Array.from(resolutions.values());
      const response = await fetch(`/api/agents/consolidate/${consolidationId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutions: resolutionList }),
      });
      
      if (!response.ok) throw new Error('Failed to apply resolutions');
      
      onMergeComplete?.({ consolidationId, merged: [], failed: [], errors: [] });
    } catch (error) {
      console.error('[ResultMergePanel] Resolution error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [consolidationId, resolutions, onMergeComplete]);

  const handleExport = useCallback(async () => {
    if (!consolidationId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/consolidate/${consolidationId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetBranch: exportBranchName }),
      });
      
      if (!response.ok) throw new Error('Failed to export');
      
      onExportToBranch?.(exportBranchName);
    } catch (error) {
      console.error('[ResultMergePanel] Export error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [consolidationId, exportBranchName, onExportToBranch]);

  const selectedFileResolution = selectedFile ? resolutions.get(selectedFile.path) : null;
  const conflictPaths = new Set(mergePreview?.conflicts.map(c => c.path) || []);
  const isConflictFile = selectedFile ? conflictPaths.has(selectedFile.path) : false;

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <div 
        className="flex-shrink-0 border-b px-4 py-3"
        style={{ borderColor: currentTheme.colors.interactive.border }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <RiGitMergeLine className="h-5 w-5" style={{ color: currentTheme.colors.primary.base }} />
            <h2 
              className="text-sm font-semibold"
              style={{ color: currentTheme.colors.surface.foreground }}
            >
              Result Merge Panel
            </h2>
            {consolidationId && (
              <span 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: currentTheme.colors.surface.muted,
                  color: currentTheme.colors.surface.mutedForeground,
                }}
              >
                {consolidationId.slice(-8)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!mergePreview && (
              <Button
                variant="default"
                size="sm"
                onClick={handleAnalyze}
                disabled={isLoading || agentResults.length === 0}
              >
                <RiGitMergeLine className="h-4 w-4 mr-1" />
                Analyze Results
              </Button>
            )}
            {mergePreview && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={isLoading}
                >
                  <RiRefreshLine className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(vm => vm === 'side-by-side' ? 'unified' : 'side-by-side')}
                >
                  {viewMode === 'side-by-side' ? (
                    <>
                      <RiContrastLine className="h-4 w-4 mr-1" />
                      Unified
                    </>
                  ) : (
                    <>
                      <RiExpandDiagonalLine className="h-4 w-4 mr-1" />
                      Side-by-Side
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <RiFileTextLine className="h-4 w-4" style={{ color: currentTheme.colors.surface.mutedForeground }} />
              <span className="text-sm" style={{ color: currentTheme.colors.surface.foreground }}>
                {stats.total} files
              </span>
            </div>
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{ backgroundColor: currentTheme.colors.status.warningBackground }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.status.warning }} />
              <span className="text-xs font-medium" style={{ color: currentTheme.colors.status.warning }}>
                {stats.conflicts} conflicts
              </span>
            </div>
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{ backgroundColor: currentTheme.colors.status.successBackground }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.status.success }} />
              <span className="text-xs font-medium" style={{ color: currentTheme.colors.status.success }}>
                {stats.autoMergeable} auto-mergeable
              </span>
            </div>
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{ backgroundColor: currentTheme.colors.status.infoBackground }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.status.info }} />
              <span className="text-xs font-medium" style={{ color: currentTheme.colors.status.info }}>
                {stats.resolved} resolved
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div 
          className="w-80 flex-shrink-0 border-r overflow-y-auto"
          style={{ borderColor: currentTheme.colors.interactive.border }}
        >
          <div 
            className="px-3 py-2 border-b flex items-center justify-between sticky top-0 z-10"
            style={{ 
              borderColor: currentTheme.colors.interactive.border,
              backgroundColor: currentTheme.colors.surface.elevated,
            }}
          >
            <span 
              className="text-xs font-medium"
              style={{ color: currentTheme.colors.surface.foreground }}
            >
              Files
            </span>
            {stats && (
              <span 
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: currentTheme.colors.surface.muted,
                  color: currentTheme.colors.surface.mutedForeground,
                }}
              >
                {filteredFiles.length}
              </span>
            )}
          </div>

          <div className="flex gap-1 px-3 py-2 border-b" style={{ borderColor: currentTheme.colors.interactive.border }}>
            {(['all', 'conflicts', 'auto-merge'] as const).map((status) => {
              const count = stats ? (status === 'all' ? stats.total : status === 'conflicts' ? stats.conflicts : stats.autoMergeable) : 0;
              const isActive = filterStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    'flex-1 px-2 py-1 text-xs rounded transition-colors',
                    isActive 
                      ? 'bg-interactive-selection text-interactive-selection-foreground' 
                      : 'hover:bg-interactive-hover/50'
                  )}
                  style={!isActive ? { color: currentTheme.colors.surface.mutedForeground } : undefined}
                >
                  {status === 'all' ? 'All' : status === 'conflicts' ? 'Conflicts' : 'Auto'} ({count})
                </button>
              );
            })}
          </div>

          <div className="py-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              const resolution = resolutions.get(file.path);
              const hasConflict = conflictPaths.has(file.path);
              const conflictColor = getConflictTypeColor(hasConflict ? 'same-line' : '', currentTheme);
              const isResolved = !!resolution;

              return (
                <div
                  key={`${file.agentId}-${file.path}`}
                  onClick={() => handleFileSelect(file)}
                  className={cn(
                    'px-3 py-2 mx-2 my-1 rounded-md cursor-pointer transition-all group',
                    isSelected 
                      ? 'bg-interactive-selection' 
                      : 'hover:bg-interactive-hover/50'
                  )}
                  style={{
                    borderLeft: hasConflict ? `3px solid ${conflictColor.color}` : '3px solid transparent',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {hasConflict ? (
                        <RiGitBranchLine className="h-4 w-4" style={{ color: conflictColor.color }} />
                      ) : (
                        <RiFileTextLine className="h-4 w-4" style={{ color: currentTheme.colors.surface.mutedForeground }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div 
                        className={cn(
                          'text-xs font-medium truncate',
                          isSelected 
                            ? 'text-interactive-selection-foreground'
                            : 'text-surface-foreground'
                        )}
                        style={!isSelected ? { color: currentTheme.colors.surface.foreground } : undefined}
                      >
                        {file.path.split('/').pop()}
                      </div>
                      <div 
                        className="text-xs truncate mt-0.5"
                        style={{ color: currentTheme.colors.surface.mutedForeground }}
                      >
                        {file.path}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div 
                          className="flex items-center gap-1"
                          style={{ color: currentTheme.colors.surface.mutedForeground }}
                        >
                          <span className="text-xs">{file.agentName}</span>
                        </div>
                        <div 
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: currentTheme.colors.surface.muted,
                            color: currentTheme.colors.surface.foreground,
                          }}
                        >
                          {Math.round(file.scores.total * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    {isResolved && (
                      <div 
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: resolution.action === 'merge' ? currentTheme.colors.status.success : currentTheme.colors.status.error }}
                      >
                        {resolution.action === 'merge' ? (
                          <RiCheckLine className="h-3 w-3 text-white" />
                        ) : (
                          <RiCloseLine className="h-3 w-3 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredFiles.length === 0 && (
              <div 
                className="px-3 py-8 text-center"
                style={{ color: currentTheme.colors.surface.mutedForeground }}
              >
                <RiFileTextLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No files to show</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile ? (
            <>
              <div 
                className="flex-shrink-0 px-4 py-2 border-b flex items-center justify-between"
                style={{ borderColor: currentTheme.colors.interactive.border }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <RiFileTextLine className="h-4 w-4" style={{ color: currentTheme.colors.surface.mutedForeground }} />
                  <span 
                    className="text-sm font-medium truncate"
                    style={{ color: currentTheme.colors.surface.foreground }}
                  >
                    {selectedFile.path}
                  </span>
                  {isConflictFile && (
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: currentTheme.colors.status.warningBackground,
                        color: currentTheme.colors.status.warning,
                      }}
                    >
                      Conflict
                    </span>
                  )}
                </div>

                {!selectedFileResolution && (
                  <>
                    <div className="mb-4">
                      <label
                        className="text-sm font-medium mb-2"
                        style={{ color: currentTheme.colors.surface.foreground }}
                      >
                        Resolution Strategy
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-md text-sm"
                        style={{
                          backgroundColor: currentTheme.colors.surface.elevated,
                          color: currentTheme.colors.surface.foreground,
                          borderColor: currentTheme.colors.interactive.border,
                        }}
                        value={selectedStrategy}
                        onChange={(e) => setSelectedStrategy(e.target.value as typeof selectedStrategy)}
                      >
                        <option value="merge">Merge (Accept Changes)</option>
                        <option value="keep-ours">Keep Ours (First Agent)</option>
                        <option value="keep-theirs">Keep Theirs (Last Agent)</option>
                        <option value="voting">Voting (Majority Vote)</option>
                        <option value="union">Union (Combine All)</option>
                        <option value="manual">Manual (Edit Inline)</option>
                      </select>
                    </div>

                    {selectedStrategy === 'voting' && (
                      <div
                        className="px-3 py-2 mb-4 rounded-md text-xs"
                        style={{
                          backgroundColor: currentTheme.colors.surface.muted,
                          color: currentTheme.colors.surface.mutedForeground,
                        }}
                      >
                        <span className="font-medium">Voting:</span> Most agents' change wins
                      </div>
                    )}

                    {selectedStrategy === 'union' && (
                      <div
                        className="px-3 py-2 mb-4 rounded-md text-xs"
                        style={{
                          backgroundColor: currentTheme.colors.surface.muted,
                          color: currentTheme.colors.surface.mutedForeground,
                        }}
                      >
                        <span className="font-medium">Union:</span> Combine all unique changes
                      </div>
                    )}

                    {selectedStrategy === 'manual' && (
                      <div
                        className="px-3 py-2 mb-4 rounded-md text-xs"
                        style={{
                          backgroundColor: currentTheme.colors.surface.muted,
                          color: currentTheme.colors.surface.mutedForeground,
                        }}
                      >
                        <span className="font-medium">Manual:</span> Edit merged result inline
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolution(selectedFile.path, selectedStrategy, selectedFile.agentId)}
                        className="h-7"
                      >
                        <RiCheckLine className="h-3.5 w-3.5 mr-1" />
                        {selectedStrategy === 'merge' ? 'Accept' : 'Apply'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResolution(selectedFile.path, 'reject', selectedFile.agentId)}
                        className="h-7 w-7 text-status-error hover:text-status-error hover:bg-status-error/10"
                      >
                        <RiCloseLine className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <div 
                  className="h-full flex items-center justify-center"
                  style={{ color: currentTheme.colors.surface.mutedForeground }}
                >
                  <div className="text-center">
                    <RiContrastLine className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-1">Diff View</p>
                    <p className="text-sm">Select a file to view changes</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div 
              className="h-full flex items-center justify-center"
              style={{ color: currentTheme.colors.surface.mutedForeground }}
            >
              <div className="text-center">
                <RiGitMergeLine className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">Select a file to view</p>
                <p className="text-sm">Click on any file in the left panel to see changes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {stats && stats.resolved + stats.rejected > 0 && (
        <div 
          className="flex-shrink-0 border-t px-4 py-3 flex items-center justify-between"
          style={{ borderColor: currentTheme.colors.interactive.border }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: currentTheme.colors.surface.foreground }}>
                Export to branch:
              </span>
              <input
                type="text"
                value={exportBranchName}
                onChange={(e) => setExportBranchName(e.target.value)}
                className="px-3 py-1.5 rounded-md text-sm bg-interactive-hover/50 border border-border/50 focus:outline-none focus:border-primary/50"
                style={{ 
                  color: currentTheme.colors.surface.foreground,
                  backgroundColor: currentTheme.colors.surface.elevated,
                  borderColor: currentTheme.colors.interactive.border,
                }}
              />
            </div>
            <div 
              className="text-sm px-2 py-1 rounded"
              style={{ backgroundColor: currentTheme.colors.surface.muted }}
            >
              {stats.resolved} accepted, {stats.rejected} rejected
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || stats.resolved === 0}
            >
              <RiDownloadLine className="h-4 w-4 mr-1" />
              Export Merge
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyResolutions}
              disabled={isLoading}
            >
              <RiGitMergeLine className="h-4 w-4 mr-1" />
              Apply Resolutions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
