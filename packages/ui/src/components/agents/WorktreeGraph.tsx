import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  RiGitBranchLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiRefreshLine,
  RiCloseLine,
  RiCheckLine,
  RiLoader4Line,
  RiErrorWarningLine,
} from '@remixicon/react';
import { useThemeSystem } from '@/contexts/useThemeSystem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AgentNode {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'terminating';
  branchName: string;
  baseBranch: string;
  worktreePath: string;
  task?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface WorktreeGraphProps {
  baseBranch: string;
  agents: AgentNode[];
  onNodeClick?: (agent: AgentNode) => void;
  onNodeHover?: (agent: AgentNode | null) => void;
  className?: string;
}

interface GraphLayout {
  nodes: Array<{
    agent: AgentNode;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  edges: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const NODE_SPACING_X = 40;
const NODE_SPACING_Y = 120;

const getStatusColor = (status: AgentNode['status'], theme: { colors: { status: { success: string; info: string; error: string; warning: string }; surface: { mutedForeground: string } } }) => {
  switch (status) {
    case 'active':
      return theme.colors.status.success;
    case 'completed':
      return theme.colors.status.info;
    case 'failed':
      return theme.colors.status.error;
    case 'terminating':
      return theme.colors.status.warning;
    case 'pending':
    default:
      return theme.colors.surface.mutedForeground;
  }
};

const getStatusBgColor = (status: AgentNode['status'], theme: { colors: { status: { successBackground: string; infoBackground: string; errorBackground: string; warningBackground: string }; surface: { muted: string } } }) => {
  switch (status) {
    case 'active':
      return theme.colors.status.successBackground;
    case 'completed':
      return theme.colors.status.infoBackground;
    case 'failed':
      return theme.colors.status.errorBackground;
    case 'terminating':
      return theme.colors.status.warningBackground;
    case 'pending':
    default:
      return theme.colors.surface.muted;
  }
};

const getStatusIcon = (status: AgentNode['status']) => {
  switch (status) {
    case 'active':
      return <RiLoader4Line className="animate-spin" />;
    case 'completed':
      return <RiCheckLine />;
    case 'failed':
      return <RiErrorWarningLine />;
    case 'terminating':
      return <RiCloseLine />;
    case 'pending':
    default:
      return <RiGitBranchLine />;
  }
};

const formatTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const WorktreeGraph: React.FC<WorktreeGraphProps> = ({
  baseBranch,
  agents,
  onNodeClick,
  onNodeHover,
  className,
}) => {
  const { currentTheme } = useThemeSystem();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<AgentNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const layout: GraphLayout = useMemo(() => {
    const nodes: GraphLayout['nodes'] = [];
    const edges: GraphLayout['edges'] = [];

    const centerX = NODE_WIDTH * 1.5;

    const baseNode = {
      agent: {
        id: 'base',
        name: baseBranch,
        type: 'base',
        status: 'completed' as const,
        branchName: baseBranch,
        baseBranch: '',
        worktreePath: '',
        createdAt: Date.now(),
      } as AgentNode,
      x: centerX,
      y: 40,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };

    nodes.push(baseNode);

    agents.forEach((agent, index) => {
      const isLeftSide = index % 2 === 0;
      const layerIndex = Math.floor(index / 2);
      const x = isLeftSide 
        ? centerX - NODE_WIDTH - NODE_SPACING_X * (layerIndex + 1)
        : centerX + NODE_SPACING_X * (layerIndex + 1);
      const y = 40 + NODE_SPACING_Y * (layerIndex + 1);

      nodes.push({
        agent,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });

      const edge = {
        from: { x: centerX, y: 40 + NODE_HEIGHT / 2 },
        to: { x: x + NODE_WIDTH / 2, y: y },
      };
      edges.push(edge);
    });

    return { nodes, edges };
  }, [baseBranch, agents]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.3), 3);
    setScale(newScale);
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleNodeClick = useCallback((agent: AgentNode) => {
    setSelectedNode(agent);
    onNodeClick?.(agent);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((agent: AgentNode | null) => {
    setHoveredNode(agent);
    onNodeHover?.(agent);
  }, [onNodeHover]);

  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(s * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(s * 0.8, 0.3));
  }, []);

  const handleResetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-background', className)}>
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={currentTheme.colors.interactive.border}
              />
            </marker>
          </defs>

          {layout.edges.map((edge, index) => (
            <path
              key={`edge-${index}`}
              d={`M ${edge.from.x} ${edge.from.y} 
                   C ${edge.from.x} ${(edge.from.y + edge.to.y) / 2},
                     ${edge.to.x} ${(edge.from.y + edge.to.y) / 2},
                     ${edge.to.x} ${edge.to.y}`}
              fill="none"
              stroke={currentTheme.colors.interactive.border}
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
          ))}

          {layout.nodes.map((node) => {
            const isHovered = hoveredNode?.id === node.agent.id;
            const isSelected = selectedNode?.id === node.agent.id;
            const statusColor = getStatusColor(node.agent.status, currentTheme);
            const statusBgColor = getStatusBgColor(node.agent.status, currentTheme);
            const borderColor = isSelected 
              ? currentTheme.colors.primary.base
              : isHovered
                ? currentTheme.colors.interactive.borderHover
                : currentTheme.colors.interactive.border;

            return (
              <g
                key={`node-${node.agent.id}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node.agent);
                }}
                onMouseEnter={() => handleNodeHover(node.agent)}
                onMouseLeave={() => handleNodeHover(null)}
                className="cursor-pointer transition-all duration-200"
                style={{ pointerEvents: 'auto' }}
              >
                <rect
                  x={0}
                  y={0}
                  width={node.width}
                  height={node.height}
                  rx={8}
                  fill={currentTheme.colors.surface.elevated}
                  stroke={borderColor}
                  strokeWidth={isSelected ? 2 : 1}
                  filter={isHovered || isSelected ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : undefined}
                />

                <rect
                  x={0}
                  y={0}
                  width={4}
                  height={node.height}
                  rx={2}
                  fill={statusColor}
                />

                <foreignObject
                  x={12}
                  y={8}
                  width={node.width - 20}
                  height={node.height - 16}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="flex items-center justify-center w-5 h-5 rounded-full"
                        style={{ backgroundColor: statusBgColor, color: statusColor }}
                      >
                        {getStatusIcon(node.agent.status)}
                      </div>
                      <span 
                        className="text-xs font-semibold truncate"
                        style={{ color: currentTheme.colors.surface.foreground }}
                      >
                        {node.agent.name}
                      </span>
                    </div>

                    <div 
                      className="flex items-center gap-1 text-xs"
                      style={{ color: currentTheme.colors.surface.mutedForeground }}
                    >
                      <RiGitBranchLine className="w-3 h-3" />
                      <span className="truncate">{node.agent.branchName}</span>
                    </div>

                    {node.agent.task && (
                      <div 
                        className="text-xs truncate mt-1"
                        style={{ color: currentTheme.colors.surface.mutedForeground }}
                        title={node.agent.task}
                      >
                        {node.agent.task}
                      </div>
                    )}

                    {node.agent.error && (
                      <div 
                        className="text-xs truncate mt-1"
                        style={{ color: currentTheme.colors.status.error }}
                        title={node.agent.error}
                      >
                        {node.agent.error}
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-surface-elevated"
          onClick={handleZoomOut}
        >
          <RiZoomOutLine className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-surface-elevated"
          onClick={handleZoomIn}
        >
          <RiZoomInLine className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-surface-elevated"
          onClick={handleResetView}
        >
          <RiRefreshLine className="h-4 w-4" />
        </Button>
        <span 
          className="text-xs px-2 py-1 bg-surface-elevated rounded border"
          style={{ color: currentTheme.colors.surface.mutedForeground }}
        >
          {Math.round(scale * 100)}%
        </span>
      </div>

      {selectedNode && selectedNode.id !== 'base' && (
        <div 
          className="absolute top-4 right-4 p-4 rounded-lg border shadow-lg max-w-sm"
          style={{ 
            backgroundColor: currentTheme.colors.surface.elevated,
            borderColor: currentTheme.colors.interactive.border,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 
              className="text-sm font-semibold"
              style={{ color: currentTheme.colors.surface.foreground }}
            >
              {selectedNode.name}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-interactive-hover rounded"
              style={{ color: currentTheme.colors.surface.mutedForeground }}
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: currentTheme.colors.surface.mutedForeground }}>Status:</span>
              <span 
                className="flex items-center gap-1 font-medium"
                style={{ color: getStatusColor(selectedNode.status, currentTheme) }}
              >
                {getStatusIcon(selectedNode.status)}
                {selectedNode.status}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: currentTheme.colors.surface.mutedForeground }}>Branch:</span>
              <span style={{ color: currentTheme.colors.surface.foreground }}>
                {selectedNode.branchName}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: currentTheme.colors.surface.mutedForeground }}>Created:</span>
              <span style={{ color: currentTheme.colors.surface.foreground }}>
                {formatTime(selectedNode.createdAt)}
              </span>
            </div>

            {selectedNode.startedAt && (
              <div className="flex justify-between">
                <span style={{ color: currentTheme.colors.surface.mutedForeground }}>Started:</span>
                <span style={{ color: currentTheme.colors.surface.foreground }}>
                  {formatTime(selectedNode.startedAt)}
                </span>
              </div>
            )}

            {selectedNode.completedAt && (
              <div className="flex justify-between">
                <span style={{ color: currentTheme.colors.surface.mutedForeground }}>Completed:</span>
                <span style={{ color: currentTheme.colors.surface.foreground }}>
                  {formatTime(selectedNode.completedAt)}
                </span>
              </div>
            )}

            {selectedNode.worktreePath && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: currentTheme.colors.surface.subtle }}>
                <div 
                  className="text-xs font-mono break-all p-2 rounded"
                  style={{ 
                    backgroundColor: currentTheme.colors.surface.muted,
                    color: currentTheme.colors.surface.mutedForeground,
                  }}
                >
                  {selectedNode.worktreePath}
                </div>
              </div>
            )}

            {selectedNode.error && (
              <div 
                className="mt-2 p-2 rounded text-xs break-words"
                style={{ 
                  backgroundColor: currentTheme.colors.status.errorBackground,
                  color: currentTheme.colors.status.error,
                }}
              >
                {selectedNode.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
