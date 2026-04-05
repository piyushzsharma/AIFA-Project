export interface GraphNode {
  id: string;
  label: string;
  ntype: 'ROOT' | 'MAX' | 'MIN' | 'LEAF' | 'PRUNED';
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface State {
  R: number;
  Q: number;
  T: number;
  F: number;
}

export interface SimulationParams {
  refluxValues: number[];
  heatValues: number[];
  tempValues: number[];
  feedValues: number[];
  depth: number;
  initialState: State;
}

export interface MinimaxResult {
  value: number;
  states: State[];
  nodes: string[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  evalCount: number;
  runtime: number; // seconds
}

export function generateLinspace(start: number, stop: number, num: number): number[] {
  if (num === 1) return [start];
  const step = (stop - start) / (num - 1);
  return Array.from({ length: num }, (_, i) => start + step * i);
}

function simulate(R: number, Q: number, T: number, F: number) {
  const purity = 0.82 + 0.15 * Math.tanh(R - 2) - 0.5 * Math.abs(F - 0.5) - 0.01 * Math.pow(T - 78, 2);
  const energy = Q + 80 * R + 0.5 * Math.abs(T - 78);
  return { purity, energy };
}

function utility(purity: number, energy: number) {
  let penalty = 0;
  if (purity < 0.88) {
    penalty = -200 * (0.88 - purity);
  }
  return 120 * purity - 0.07 * energy + penalty;
}

function updateFeed(prev_F: number, disturbance: number) {
  return 0.6 * prev_F + 0.4 * disturbance;
}

export function runMinimax(params: SimulationParams, usePruning: boolean = true): MinimaxResult {
  let nodeCounter = 0;
  let evalCount = 0;
  const graphNodes: GraphNode[] = [];
  const graphEdges: GraphEdge[] = [];

  function newNode(label: string, ntype: GraphNode['ntype']): string {
    const id = `N${nodeCounter++}`;
    graphNodes.push({ id, label, ntype });
    return id;
  }

  function addEdge(source: string, target: string) {
    graphEdges.push({ source, target });
  }

  function formatAB(val: number) {
    if (val === Infinity) return '∞';
    if (val === -Infinity) return '-∞';
    return val.toFixed(1);
  }

  function minimax(
    depth: number,
    isMax: boolean,
    state: State,
    alpha: number,
    beta: number,
    parent: string
  ): { val: number; states: State[]; nodes: string[] } {
    const { R, Q, T, F } = state;

    if (depth === 0) {
      evalCount++;
      const { purity, energy } = simulate(R, Q, T, F);
      const u = utility(purity, energy);
      const leafId = newNode(u.toFixed(1), 'LEAF');
      addEdge(parent, leafId);
      return { val: u, states: [state], nodes: [leafId] };
    }

    if (isMax) {
      const nodeIndex = graphNodes.length;
      const nodeId = newNode('MAX', 'MAX');
      addEdge(parent, nodeId);

      let best = -Infinity;
      let bestStates: State[] = [];
      let bestNodes: string[] = [];
      let pruneFlag = false;

      for (const r of params.refluxValues) {
        if (pruneFlag) break;
        for (const q of params.heatValues) {
          if (pruneFlag) break;
          for (const t of params.tempValues) {
            const newState = { R: r, Q: q, T: t, F };
            const { val, states, nodes } = minimax(depth - 1, false, newState, alpha, beta, nodeId);

            if (val > best) {
              best = val;
              bestStates = [state, ...states];
              bestNodes = [nodeId, ...nodes];
            }

            if (usePruning) {
              alpha = Math.max(alpha, best);
              if (beta <= alpha) {
                const pruneId = newNode(`PRUNED [α:${formatAB(alpha)} β:${formatAB(beta)}]`, 'PRUNED');
                addEdge(nodeId, pruneId);
                pruneFlag = true;
                break;
              }
            }
          }
        }
      }
      graphNodes[nodeIndex].label = `MAX [α:${formatAB(alpha)} β:${formatAB(beta)}]`;
      return { val: best, states: bestStates, nodes: bestNodes };
    } 
    else {
      const nodeIndex = graphNodes.length;
      const nodeId = newNode('MIN', 'MIN');
      addEdge(parent, nodeId);

      let worst = Infinity;
      let worstStates: State[] = [];
      let worstNodes: string[] = [];

      for (const d of params.feedValues) {
        const new_F = updateFeed(F, d);
        const newState = { R, Q, T, F: new_F };
        const { val, states, nodes } = minimax(depth - 1, true, newState, alpha, beta, nodeId);

        if (val < worst) {
          worst = val;
          worstStates = [state, ...states];
          worstNodes = [nodeId, ...nodes];
        }

        if (usePruning) {
          beta = Math.min(beta, worst);
          if (beta <= alpha) {
            const pruneId = newNode(`PRUNED [α:${formatAB(alpha)} β:${formatAB(beta)}]`, 'PRUNED');
            addEdge(nodeId, pruneId);
            break;
          }
        }
      }
      graphNodes[nodeIndex].label = `MIN [α:${formatAB(alpha)} β:${formatAB(beta)}]`;
      return { val: worst, states: worstStates, nodes: worstNodes };
    }
  }

  const startMs = performance.now();
  
  const rootId = newNode('ROOT', 'ROOT');
  const { val, states, nodes } = minimax(
    params.depth,
    true,
    params.initialState,
    -Infinity,
    Infinity,
    rootId
  );
  
  const endMs = performance.now();

  const calculatedRuntime = (endMs - startMs) / 1000;

  return {
    value: val,
    states,
    nodes: [rootId, ...nodes],
    graph: {
      nodes: graphNodes,
      edges: graphEdges
    },
    evalCount,
    runtime: calculatedRuntime
  };
}
