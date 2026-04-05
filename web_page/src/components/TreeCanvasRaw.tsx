import React, { useEffect, useRef } from 'react';
import { GraphNode, GraphEdge } from '../algorithm/minimax';

interface TreeCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  optimalPathIds: string[];
}

export const TreeCanvasRaw: React.FC<TreeCanvasProps> = ({ nodes, edges, optimalPathIds }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Build hierarchy
    const successors: Record<string, string[]> = {};
    edges.forEach(e => {
      if (!successors[e.source]) successors[e.source] = [];
      successors[e.source].push(e.target);
    });

    const rootNode = nodes.find(n => n.ntype === 'ROOT') || nodes[0];
    
    const levels: Record<number, string[]> = {};
    const dfs = (nodeId: string, depth: number) => {
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(nodeId);
      const kids = successors[nodeId] || [];
      kids.forEach(kid => dfs(kid, depth + 1));
    };
    
    if (rootNode) dfs(rootNode.id, 0);

    const pos: Record<string, {x: number, y: number}> = {};
    
    Object.entries(levels).forEach(([depthStr, levelNodes]) => {
      const depth = parseInt(depthStr);
      const width = levelNodes.length;
      levelNodes.forEach((nodeId, i) => {
        pos[nodeId] = {
          // Horizontal layout: depth determines X, siblings determine Y
          x: depth * 250,
          y: (i - width / 2) * 40
        };
      });
    });

    // Find bounding box for auto-center
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    Object.values(pos).forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    // Setup transform
    let scale = 1;
    const margin = 100;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (contentWidth > 0 && contentHeight > 0) {
      const scaleX = (rect.width - margin * 2) / contentWidth;
      const scaleY = (rect.height - margin * 2) / contentHeight;
      scale = Math.min(scaleX, scaleY, 2); // Cap max zoom
    }

    let offsetX = rect.width / 2 - ((minX + maxX) / 2) * scale;
    let offsetY = margin; // Start from top with margin

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw Edges
      ctx.lineWidth = 2 / scale;
      edges.forEach(e => {
        const p1 = pos[e.source];
        const p2 = pos[e.target];
        if (!p1 || !p2) return;

        const isOptimal = optimalPathIds.includes(e.source) && optimalPathIds.includes(e.target);
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        const handleX = (p1.x + p2.x) / 2;
        ctx.bezierCurveTo(
          handleX, p1.y,
          handleX, p2.y,
          p2.x, p2.y
        );
        
        if (isOptimal) {
          ctx.strokeStyle = '#06b6d4'; // Cyan
          ctx.lineWidth = 6 / scale;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#06b6d4';
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(63, 63, 70, 0.4)'; // Subtle grey
          ctx.lineWidth = 1.5 / scale;
          ctx.stroke();
        }
      });

      // Draw Nodes
      const optimalSet = new Set(optimalPathIds);
      nodes.forEach(n => {
        const p = pos[n.id];
        if (!p) return;

        ctx.beginPath();
        const baseRadius = 8;
        const radius = optimalSet.has(n.id) ? baseRadius * 1.5 : baseRadius;
        
        ctx.arc(p.x, p.y, radius / scale, 0, 2 * Math.PI);
        
        if (n.ntype === 'MAX') ctx.fillStyle = '#38bdf8'; // skyblue
        else if (n.ntype === 'MIN') ctx.fillStyle = '#f87171'; // lightcoral
        else if (n.ntype === 'LEAF') ctx.fillStyle = '#4ade80'; // lightgreen
        else if (n.ntype === 'PRUNED') ctx.fillStyle = '#71717a'; // grey
        else if (n.ntype === 'ROOT') ctx.fillStyle = '#facc15'; // yellow
        else ctx.fillStyle = '#ffffff';

        if (optimalSet.has(n.id)) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = ctx.fillStyle;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0;

        // Optionally draw labels if scale is large enough or node is optimal
        if (scale > 0.4 || optimalSet.has(n.id)) {
          ctx.fillStyle = '#f4f4f5';
          ctx.font = `${10 / scale}px Space Mono`;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, p.x, p.y + (radius / scale) + (15 / scale));
        }
      });

      ctx.restore();
    };

    draw();

    // INTERACTIVITY
    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      offsetX += (e.clientX - lastX);
      offsetY += (e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      draw();
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;

      // Point before zoom
      const ptX = (mouseX - offsetX) / scale;
      const ptY = (mouseY - offsetY) / scale;

      if (e.deltaY < 0) {
        scale *= zoomFactor;
      } else {
        scale /= zoomFactor;
      }

      // Point after zoom
      offsetX = mouseX - ptX * scale;
      offsetY = mouseY - ptY * scale;
      
      draw();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };

  }, [nodes, edges, optimalPathIds]);

  return (
    <canvas 
      ref={canvasRef} 
      className="canvas-container"
      style={{ display: 'block', cursor: 'grab' }}
    />
  );
};
