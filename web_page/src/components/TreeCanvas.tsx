import React, { useMemo, useState, useCallback } from 'react';
import { GraphNode, GraphEdge } from '../algorithm/minimax';
import Tree, { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree';

interface TreeCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  optimalPathIds: string[];
}

interface MinimaxNodeDatum extends Omit<RawNodeDatum, 'attributes'> {
  attributes: {
    ntype: string;
    isOptimal: boolean;
    id: string;
  };
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({ nodes, edges, optimalPathIds }) => {
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useCallback((containerElem: HTMLDivElement | null) => {
    if (containerElem !== null) {
      const { width, height } = containerElem.getBoundingClientRect();
      setTranslate({ x: width / 5, y: height / 2 }); // Start slightly left, vertically centered
    }
  }, []);

  const hierarchyData = useMemo(() => {
    if (nodes.length === 0) return null;

    const nodeMap = new Map<string, MinimaxNodeDatum>();
    const optimalSet = new Set(optimalPathIds);

    nodes.forEach(n => {
      nodeMap.set(n.id, {
        name: n.label,
        attributes: {
          ntype: n.ntype,
          isOptimal: optimalSet.has(n.id),
          id: n.id
        },
        children: []
      });
    });

    const childIds = new Set<string>();

    edges.forEach(e => {
      const parent = nodeMap.get(e.source);
      const child = nodeMap.get(e.target);
      if (parent && child) {
        parent.children!.push(child);
        childIds.add(e.target);
      }
    });

    let rootRef: MinimaxNodeDatum | null = null;
    nodes.forEach(n => {
      if (!childIds.has(n.id)) {
        rootRef = nodeMap.get(n.id) || null;
      }
    });

    return rootRef;
  }, [nodes, edges, optimalPathIds]);

  // Deeply nested custom node to give it the aesthetic DCS styling
  const renderRectNode = ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
    const data = nodeDatum as unknown as MinimaxNodeDatum;
    const { ntype, isOptimal } = data.attributes;
    
    let bgColor = '#ffffff';
    let labelColor = '#ffffff';

    if (ntype === 'MAX') bgColor = '#38bdf8';
    else if (ntype === 'MIN') bgColor = '#f87171';
    else if (ntype === 'LEAF') bgColor = '#4ade80';
    else if (ntype === 'PRUNED') { bgColor = '#71717a'; labelColor = '#a1a1aa'; }
    else if (ntype === 'ROOT') bgColor = '#facc15';

    const _children = (nodeDatum as any)._children;
    const isLeaf = !nodeDatum.children && !_children;
    const strokeObj = isOptimal ? { stroke: '#06b6d4', strokeWidth: 4, filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))' } : { stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 };

    return (
      <g>
        <circle 
          r={isOptimal ? 16 : 12} 
          fill={bgColor} 
          onClick={toggleNode} 
          style={{ cursor: isLeaf ? 'default' : 'pointer', ...strokeObj }}
        />
        <text 
          fill={labelColor} 
          strokeWidth="0" 
          x={20} 
          dy=".3em" 
          fontSize={isOptimal ? 14 : 12}
          fontFamily="'Space Mono', monospace"
          fontWeight={isOptimal ? 'bold' : 'normal'}
        >
          {data.name} 
          {!isLeaf && (_children ? ' (Click to Expand)' : ' (-)')}
        </text>
      </g>
    );
  };

  if (!hierarchyData) return null;

  return (
    <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }} ref={containerRef}>
      <Tree
        data={hierarchyData as unknown as RawNodeDatum}
        translate={translate}
        renderCustomNodeElement={renderRectNode}
        orientation="horizontal"
        pathFunc="step"
        initialDepth={1}
        nodeSize={{ x: 250, y: 60 }}
        separation={{ siblings: 1, nonSiblings: 1.5 }}
      />
    </div>
  );
};
