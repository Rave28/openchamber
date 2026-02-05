import React, { useState, useCallback, useMemo } from 'react';
import {
  RiGitBranchLine,
  RiFileTextLine,
  RiCloseLine,
  RiFileCopyLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiExpandDiagonalLine,
  RiContrastLine,
} from '@remixicon/react';
import { useThemeSystem } from '@/contexts/useThemeSystem';
import { PierreDiffViewer } from '@/components/views/PierreDiffViewer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions?: number;
  deletions?: number;
  originalContent?: string;
  modifiedContent?: string;
}

export interface BranchDiffViewProps {
  branchA: { name: string; path: string } | null;
  branchB: { name: string; path: string } | null;
  files: DiffFile[];
  onAcceptChange?: (filePath: string, direction: 'AtoB' | 'BtoA') => void;
  onRejectChange?: (filePath: string) => void;
  className?: string;
}

const getFileIcon = (status: DiffFile['status']) => {
  switch (status) {
    case 'added':
      return <RiFileTextLine className="text-status-success" />;
    case 'deleted':
      return <RiFileTextLine className="text-status-error" />;
    case 'modified':
    default:
      return <RiFileTextLine className="text-status-warning" />;
  }
};

const getStatusBadgeColor = (status: DiffFile['status'], theme: { colors: { status: { successBackground: string; success: string; successBorder: string; errorBackground: string; error: string; errorBorder: string; warningBackground: string; warning: string; warningBorder: string } } }) => {
  switch (status) {
    case 'added':
      return {
        bg: theme.colors.status.successBackground,
        color: theme.colors.status.success,
        border: theme.colors.status.successBorder,
      };
    case 'deleted':
      return {
        bg: theme.colors.status.errorBackground,
        color: theme.colors.status.error,
        border: theme.colors.status.errorBorder,
      };
    case 'modified':
    default:
      return {
        bg: theme.colors.status.warningBackground,
        color: theme.colors.status.warning,
        border: theme.colors.status.warningBorder,
      };
  }
};

const getLanguageFromFile = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
  };
  return langMap[ext || ''] || 'plaintext';
};

export const BranchDiffView: React.FC<BranchDiffViewProps> = ({
  branchA,
  branchB,
  files,
  onAcceptChange,
  onRejectChange,
  className,
}) => {
  const { currentTheme } = useThemeSystem();
  const [selectedFile, setSelectedFile] = useState<DiffFile | null>(files[0] || null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'added' | 'modified' | 'deleted'>('all');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [pendingAccepts, setPendingAccepts] = useState<Set<string>>(new Set());
  const [pendingRejects, setPendingRejects] = useState<Set<string>>(new Set());

  const filteredFiles = useMemo(() => {
    if (filterStatus === 'all') return files;
    return files.filter(f => f.status === filterStatus);
  }, [files, filterStatus]);

  const stats = useMemo(() => {
    return {
      added: files.filter(f => f.status === 'added').length,
      modified: files.filter(f => f.status === 'modified').length,
      deleted: files.filter(f => f.status === 'deleted').length,
      total: files.length,
      all: files.length,
    };
  }, [files]);

  const handleFileSelect = useCallback((file: DiffFile) => {
    setSelectedFile(file);
  }, []);

  const handleAcceptAtoB = useCallback((filePath: string) => {
    setPendingAccepts(prev => new Set(prev).add(filePath));
    onAcceptChange?.(filePath, 'AtoB');
  }, [onAcceptChange]);

  const handleAcceptBtoA = useCallback((filePath: string) => {
    setPendingAccepts(prev => new Set(prev).add(filePath));
    onAcceptChange?.(filePath, 'BtoA');
  }, [onAcceptChange]);

  const handleReject = useCallback((filePath: string) => {
    setPendingRejects(prev => new Set(prev).add(filePath));
    onRejectChange?.(filePath);
  }, [onRejectChange]);

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path).catch(() => {});
  }, []);

  const pendingFile = pendingAccepts.has(selectedFile?.path || '') || pendingRejects.has(selectedFile?.path || '');

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <div 
        className="flex-shrink-0 border-b px-4 py-3"
        style={{ borderColor: currentTheme.colors.interactive.border }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 
            className="text-sm font-semibold"
            style={{ color: currentTheme.colors.surface.foreground }}
          >
            Branch Comparison
          </h2>
          
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md"
            style={{ backgroundColor: currentTheme.colors.surface.elevated }}
          >
            <RiGitBranchLine 
              className="h-4 w-4"
              style={{ color: currentTheme.colors.primary.base }}
            />
            <div className="flex-1 min-w-0">
              <div 
                className="text-xs font-medium truncate"
                style={{ color: currentTheme.colors.surface.foreground }}
              >
                {branchA?.name || 'Branch A'}
              </div>
              <div 
                className="text-xs truncate"
                style={{ color: currentTheme.colors.surface.mutedForeground }}
              >
                {branchA?.path || 'Select branch'}
              </div>
            </div>
          </div>

          <div 
            className="flex items-center gap-1 px-2"
            style={{ color: currentTheme.colors.surface.mutedForeground }}
          >
            vs
          </div>

          <div 
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md"
            style={{ backgroundColor: currentTheme.colors.surface.elevated }}
          >
            <RiGitBranchLine 
              className="h-4 w-4"
              style={{ color: currentTheme.colors.primary.base }}
            />
            <div className="flex-1 min-w-0">
              <div 
                className="text-xs font-medium truncate"
                style={{ color: currentTheme.colors.surface.foreground }}
              >
                {branchB?.name || 'Branch B'}
              </div>
              <div 
                className="text-xs truncate"
                style={{ color: currentTheme.colors.surface.mutedForeground }}
              >
                {branchB?.path || 'Select branch'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div 
          className="w-64 flex-shrink-0 border-r overflow-y-auto"
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
              Changed Files
            </span>
            <span 
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ 
                backgroundColor: currentTheme.colors.surface.muted,
                color: currentTheme.colors.surface.mutedForeground,
              }}
            >
              {stats.total}
            </span>
          </div>

          <div className="flex gap-1 px-3 py-2 border-b" style={{ borderColor: currentTheme.colors.interactive.border }}>
            {(['all', 'added', 'modified', 'deleted'] as const).map((status) => {
              const count = stats[status];
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
                  style={isActive ? {} : { color: currentTheme.colors.surface.mutedForeground }}
                >
                  {status === 'all' ? 'All' : status} ({count})
                </button>
              );
            })}
          </div>

          <div className="py-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              const statusColors = getStatusBadgeColor(file.status, currentTheme);
              const isPending = pendingAccepts.has(file.path) || pendingRejects.has(file.path);

              return (
                <div
                  key={file.path}
                  onClick={() => handleFileSelect(file)}
                  className={cn(
                    'px-3 py-2 mx-2 my-1 rounded-md cursor-pointer transition-all group',
                    isSelected 
                      ? 'bg-interactive-selection' 
                      : 'hover:bg-interactive-hover/50'
                  )}
                  style={{
                    borderLeft: `3px solid ${statusColors.color}`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getFileIcon(file.status)}
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
                      
                      {(file.additions !== undefined || file.deletions !== undefined) && (
                        <div className="flex items-center gap-2 mt-1">
                          {file.additions !== undefined && file.additions > 0 && (
                            <span 
                              className="text-xs"
                              style={{ color: currentTheme.colors.syntax.highlights?.diffAdded || '#22c55e' }}
                            >
                              +{file.additions}
                            </span>
                          )}
                          {file.deletions !== undefined && file.deletions > 0 && (
                            <span 
                              className="text-xs"
                              style={{ color: currentTheme.colors.syntax.highlights?.diffRemoved || '#ef4444' }}
                            >
                              -{file.deletions}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {isPending && (
                      <div 
                        className="flex-shrink-0 w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentTheme.colors.status.warning }}
                      />
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
                  {getFileIcon(selectedFile.status)}
                  <span 
                    className="text-sm font-medium truncate"
                    style={{ color: currentTheme.colors.surface.foreground }}
                  >
                    {selectedFile.path}
                  </span>
                  <button
                    onClick={() => handleCopyPath(selectedFile.path)}
                    className="p-1 hover:bg-interactive-hover/50 rounded transition-colors"
                    style={{ color: currentTheme.colors.surface.mutedForeground }}
                    title="Copy path"
                  >
                    <RiFileCopyLine className="h-4 w-4" />
                  </button>
                </div>

                {!pendingFile && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcceptAtoB(selectedFile.path)}
                      className="h-7"
                    >
                      <RiArrowLeftLine className="h-3.5 w-3.5 mr-1" />
                      A → B
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcceptBtoA(selectedFile.path)}
                      className="h-7"
                    >
                      <RiArrowRightLine className="h-3.5 w-3.5 mr-1" />
                      B → A
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReject(selectedFile.path)}
                      className="h-7 w-7 text-status-error hover:text-status-error hover:bg-status-error/10"
                    >
                      <RiCloseLine className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {selectedFile.originalContent !== undefined && selectedFile.modifiedContent !== undefined ? (
                  <PierreDiffViewer
                    original={selectedFile.originalContent}
                    modified={selectedFile.modifiedContent}
                    language={getLanguageFromFile(selectedFile.path)}
                    fileName={selectedFile.path}
                    renderSideBySide={viewMode === 'side-by-side'}
                    wrapLines={false}
                    layout="fill"
                  />
                ) : (
                  <div 
                    className="h-full flex items-center justify-center"
                    style={{ color: currentTheme.colors.surface.mutedForeground }}
                  >
                    <div className="text-center">
                      <RiFileTextLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">File content not available</p>
                      <p className="text-xs mt-1">Diff preview requires file contents</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div 
              className="h-full flex items-center justify-center"
              style={{ color: currentTheme.colors.surface.mutedForeground }}
            >
              <div className="text-center">
                <RiContrastLine className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">Select a file to view diff</p>
                <p className="text-sm">Click on any file in the left panel to see changes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
