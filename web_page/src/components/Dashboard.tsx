import React, { useState, useEffect } from 'react';
import { runMinimax, generateLinspace, SimulationParams, MinimaxResult } from '../algorithm/minimax';
import { TreeCanvas } from './TreeCanvas';
import { TreeCanvasRaw } from './TreeCanvasRaw';
import { Cpu, Clock, Activity, Target } from 'lucide-react';

export const Dashboard: React.FC = () => {
  // Initial State Inputs
  const [R, setR] = useState<number>(2.5);
  const [Q, setQ] = useState<number>(500);
  const [T, setT] = useState<number>(78);
  const [F, setF] = useState<number>(0.5);

  // Range Inputs
  const [rRange, setRRange] = useState({ start: 1, stop: 4, num: 3 });
  const [qRange, setQRange] = useState({ start: 300, stop: 700, num: 3 });
  const [tRange, setTRange] = useState({ start: 70, stop: 90, num: 3 });
  const [fRange, setFRange] = useState({ start: 0.1, stop: 1.0, num: 3 });

  // Simulation State
  const [isComputing, setIsComputing] = useState(false);
  const [resultAB, setResultAB] = useState<MinimaxResult | null>(null);
  const [resultPure, setResultPure] = useState<MinimaxResult | null>(null);
  const [activeAlgo, setActiveAlgo] = useState<'ab' | 'pure'>('ab');
  const [viewMode, setViewMode] = useState<'collapsible' | 'raw'>('collapsible');

  const handleRun = () => {
    setIsComputing(true);

    // Slight delay to allow UI to render computing state
    setTimeout(() => {
      const params: SimulationParams = {
        initialState: { R, Q, T, F },
        refluxValues: generateLinspace(rRange.start, rRange.stop, rRange.num),
        heatValues: generateLinspace(qRange.start, qRange.stop, qRange.num),
        tempValues: generateLinspace(tRange.start, tRange.stop, tRange.num),
        feedValues: generateLinspace(fRange.start, fRange.stop, fRange.num),
        depth: 4
      };

      const resAB = runMinimax(params, true);
      const resPure = runMinimax(params, false);
      setResultAB(resAB);
      setResultPure(resPure);
      setIsComputing(false);
    }, 50);
  };

  // Run initial default
  useEffect(() => {
    handleRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="app-header">
          <div className="app-title"><Activity size={20} color="#06b6d4" /> Team MAPS</div>
          <div className="app-subtitle">Minimax & Alpha-Beta Pruning Distillation Controller</div>
        </div>

        <div className="form-section">
          <div className="section-title">Initial State</div>
          <div className="input-grid">
            <div className="input-group">
              <label className="input-label">Reflux (R)</label>
              <input type="number" step="0.1" className="dcs-input" value={R} onChange={e => setR(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label className="input-label">Heat (Q)</label>
              <input type="number" step="10" className="dcs-input" value={Q} onChange={e => setQ(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label className="input-label">Temp (T)</label>
              <input type="number" step="1" className="dcs-input" value={T} onChange={e => setT(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label className="input-label">Feed (F)</label>
              <input type="number" step="0.1" className="dcs-input" value={F} onChange={e => setF(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">Reflux Search Range</div>
          <div className="input-row">
            <input type="number" className="dcs-input" value={rRange.start} onChange={e => setRRange({ ...rRange, start: Number(e.target.value) })} title="Start" />
            <input type="number" className="dcs-input" value={rRange.stop} onChange={e => setRRange({ ...rRange, stop: Number(e.target.value) })} title="Stop" />
            <input type="number" className="dcs-input" value={rRange.num} onChange={e => setRRange({ ...rRange, num: Number(e.target.value) })} title="Num Points" />
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">Heat Search Range</div>
          <div className="input-row">
            <input type="number" className="dcs-input" value={qRange.start} onChange={e => setQRange({ ...qRange, start: Number(e.target.value) })} />
            <input type="number" className="dcs-input" value={qRange.stop} onChange={e => setQRange({ ...qRange, stop: Number(e.target.value) })} />
            <input type="number" className="dcs-input" value={qRange.num} onChange={e => setQRange({ ...qRange, num: Number(e.target.value) })} />
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">Temp Search Range</div>
          <div className="input-row">
            <input type="number" className="dcs-input" value={tRange.start} onChange={e => setTRange({ ...tRange, start: Number(e.target.value) })} />
            <input type="number" className="dcs-input" value={tRange.stop} onChange={e => setTRange({ ...tRange, stop: Number(e.target.value) })} />
            <input type="number" className="dcs-input" value={tRange.num} onChange={e => setTRange({ ...tRange, num: Number(e.target.value) })} />
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">Feed Disturbance Range</div>
          <div className="input-row">
            <input type="number" className="dcs-input" value={fRange.start} onChange={e => setFRange({ ...fRange, start: Number(e.target.value) })} />
            <input type="number" className="dcs-input" value={fRange.stop} onChange={e => setFRange({ ...fRange, stop: Number(e.target.value) })} />
            <input type="number" className="dcs-input" value={fRange.num} onChange={e => setFRange({ ...fRange, num: Number(e.target.value) })} />
          </div>
        </div>

        <button className="dcs-button" onClick={handleRun} disabled={isComputing}>
          {isComputing ? 'Computing...' : 'Run Simulation'}
        </button>
        <button
          className="dcs-button"
          style={{ marginTop: '0.5rem', borderColor: 'var(--panel-border)', color: 'var(--text-muted)' }}
          onClick={() => setActiveAlgo(a => a === 'ab' ? 'pure' : 'ab')}
        >
          Algo: {activeAlgo === 'ab' ? 'Alpha-Beta Pruning' : 'Pure Minimax'}
        </button>
        <button
          className="dcs-button"
          style={{ marginTop: '0.25rem', borderColor: 'var(--panel-border)', color: 'var(--text-muted)' }}
          onClick={() => setViewMode(v => v === 'collapsible' ? 'raw' : 'collapsible')}
        >
          View: {viewMode === 'collapsible' ? 'Interactive Tree' : 'Global Network'}
        </button>
      </aside>

      {/* MAIN VIEW */}
      <main className="main-content">

        {/* METRICS */}
        {(() => {
          const activeResult = activeAlgo === 'ab' ? resultAB : resultPure;
          return (
            <>
              <div className="metrics-bar">
                <div className="metric-card">
                  <div className="metric-label"><Target size={12} style={{ display: 'inline', marginRight: 4 }} /> Final Utility ({activeAlgo === 'ab' ? 'Alpha-Beta' : 'Pure'})</div>
                  <div className={`metric-value ${activeResult ? (activeResult.value > 0 ? 'success' : 'warning') : ''}`}>
                    {activeResult ? activeResult.value.toFixed(2) : '---'}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label"><Cpu size={12} style={{ display: 'inline', marginRight: 4 }} /> Nodes Evaluated</div>
                  <div className="metric-value">{activeResult ? activeResult.evalCount.toLocaleString() : '---'}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label"><Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> Calculation Time</div>
                  <div className="metric-value">{activeResult ? (activeResult.runtime).toFixed(4) : '---'}s</div>
                </div>
              </div>

              {/* CANVAS */}
              {activeResult && viewMode === 'collapsible' && (
                <TreeCanvas
                  nodes={activeResult.graph.nodes}
                  edges={activeResult.graph.edges}
                  optimalPathIds={activeResult.nodes}
                />
              )}
              {activeResult && viewMode === 'raw' && (
                <TreeCanvasRaw
                  nodes={activeResult.graph.nodes}
                  edges={activeResult.graph.edges}
                  optimalPathIds={activeResult.nodes}
                />
              )}
              <div className="canvas-overlay-text">{activeAlgo === 'ab' ? 'MINIMAX ALPHA-BETA' : 'PURE MINIMAX'}</div>

              {/* PATH TABLE */}
              <div className="path-panel">
                <div className="path-header">Optimal State Transitions</div>
                <div className="path-table-wrap">
                  <table className="path-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Reflux (R)</th>
                        <th>Heat (Q)</th>
                        <th>Temp (T)</th>
                        <th>Feed (F)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeResult?.states.map((s, i) => (
                        <tr key={i}>
                          <td>T+{i}</td>
                          <td>{s.R.toFixed(2)}</td>
                          <td>{s.Q.toFixed(1)}</td>
                          <td>{s.T.toFixed(1)}</td>
                          <td>{s.F.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );
        })()}

      </main>
    </div>
  );
};
