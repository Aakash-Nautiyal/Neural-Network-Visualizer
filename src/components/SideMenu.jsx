import React from 'react';
import '../styles/SideMenu.css';

const MAX_INPUTS = 3, MAX_LAYERS = 3, MAX_NODES = 3;
const MIN_DELAY  = 100, MAX_DELAY = 2000;

export default function SideMenu({
  /* topology */  inputCount,setInputCount, layers,setLayers,
  /* params   */  inputVals,setInputVals, weights,setWeights, biases,setBiases,
  learningRate,setLearningRate,
  /* training */  targetY,setTargetY, maxEpochs,setMaxEpochs,
  /* run      */  running, tickDelay,setTickDelay,
  onStart,onEnd,onReset, uiLocked=false,
}){

  /* ---------- input / layer helpers ----------------------- */
  const addInput = () =>
    !uiLocked && inputCount < MAX_INPUTS && setInputCount(c => c + 1);

  const remInput = () =>
    !uiLocked && inputCount > 1 && setInputCount(c => c - 1);

  /* unique ID on add, renumber on delete */
  const addLayer = () => {
    if (uiLocked || layers.length >= MAX_LAYERS) return;
    setLayers(ls => {
      const nextNum =
        ls.length ? Math.max(...ls.map(l => +l.id.slice(1))) + 1 : 1;
      return [...ls, { id: `L${nextNum}`, nodes: MAX_NODES }];
    });
  };

  const remLayer = id => {
    if (uiLocked) return;
    setLayers(ls =>
      ls
        .filter(l => l.id !== id)
        .map((l, idx) => ({ ...l, id: `L${idx + 1}` }))
    );
  };

  const setNodes = (id, n) =>
    !uiLocked &&
    setLayers(ls =>
      ls.map(l =>
        l.id === id
          ? { ...l, nodes: Math.min(Math.max(+n, 1), MAX_NODES) }
          : l
      )
    );

  /* param setters */
  const setInputVal = (i, v) =>
    !uiLocked && setInputVals(a => a.map((n, idx) => (idx === i ? +v : n)));

  const setW = (i, v) =>
    !uiLocked && setWeights(a => a.map((n, idx) => (idx === i ? +v : n)));

  const setB = (i, v) =>
    !uiLocked && setBiases(a => a.map((n, idx) => (idx === i ? +v : n)));

  /* tick speed */
  const slower = () => setTickDelay(d => Math.min(d * 2, MAX_DELAY));
  const faster = () => setTickDelay(d => Math.max(Math.floor(d / 2), MIN_DELAY));

  /* ---------- render -------------------------------------- */
  return (
    <aside className="side-menu">
      <h2>⚙️ Customize Network</h2>

      {/* inputs */}
      <section className="side-section">
        <h4>Input Nodes</h4>
        <p>{inputCount}/{MAX_INPUTS}</p>
        <button className="side-btn" onClick={addInput} disabled={uiLocked || inputCount >= MAX_INPUTS}>＋</button>
        <button className="side-btn" onClick={remInput} disabled={uiLocked || inputCount <= 1}>－</button>

        <div className="input-values">
          {inputVals.map((v, i) => (
            <label key={i}>
              x{i + 1}:
              <input type="number" value={v} disabled={uiLocked}
                     onChange={e => setInputVal(i, e.target.value)} />
            </label>
          ))}
        </div>
      </section>

      {/* layers */}
      <section className="side-section">
        <h4>Hidden Layers</h4>
        <p>{layers.length}/{MAX_LAYERS}</p>
        <button className="side-btn side-btn--ghost"
                onClick={addLayer} disabled={uiLocked || layers.length >= MAX_LAYERS}>
          Add Layer
        </button>

        <ul className="layer-list">
          {layers.map((l, idx) => (
            <li key={l.id} className="layer-card">
              <div className="layer-card__top">
                <span>{l.id}</span>
                <button className="layer-card__delete" disabled={uiLocked}
                        onClick={() => remLayer(l.id)}>🗑</button>
              </div>

              <label>
                Nodes:
                <input type="number" min={1} max={MAX_NODES}
                       value={l.nodes} disabled={uiLocked}
                       onChange={e => setNodes(l.id, e.target.value)} />
              </label>

              <div className="param-block">
                <label>
                  w{idx + 1}:
                  <input type="number" value={weights[idx] ?? 0} disabled={uiLocked}
                         onChange={e => setW(idx, e.target.value)} />
                </label>
                <label>
                  b{idx + 1}:
                  <input type="number" value={biases[idx] ?? 0} disabled={uiLocked}
                         onChange={e => setB(idx, e.target.value)} />
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* output layer */}
      <section className="side-section">
        <h4>Output Layer</h4>
        <div className="param-block">
          <label>
            w{layers.length + 1}:
            <input type="number" disabled={uiLocked} value={weights[layers.length] ?? 0}
                   onChange={e => setW(layers.length, e.target.value)} />
          </label>
          <label>
            b{layers.length + 1}:
            <input type="number" disabled={uiLocked} value={biases[layers.length] ?? 0}
                   onChange={e => setB(layers.length, e.target.value)} />
          </label>
        </div>
      </section>

      {/* training parameters */}
      <section className="side-section">
        <h4>Target Y</h4>
        <input type="number" value={targetY} disabled={uiLocked}
               onChange={e => setTargetY(+e.target.value)} />
      </section>

      <section className="side-section">
        <h4>Max Epochs</h4>
        <input type="number" min={1} max={100} value={maxEpochs} disabled={uiLocked}
               onChange={e => setMaxEpochs(Math.min(Math.max(+e.target.value, 1), 100))} />
      </section>

      {/* NEW: learning rate */}
      <section className="side-section">
        <h4>Learning Rate</h4>
        <input
          type="number"
          step="0.01"
          min="0.001"
          max="1"
          value={learningRate}
          disabled={uiLocked}
          onChange={e => setLearningRate(+e.target.value)}
        />
      </section>

      {/* controls */}
      <div className="run-block">
        <button className="start-btn" onClick={running ? onEnd : onStart}>
          {running ? '⏹ End Visualization' : '▶ Start'}
        </button>

        <div className="speed-group">
          <button onClick={slower} disabled={!running}>–</button>
          <span>{tickDelay} ms</span>
          <button onClick={faster} disabled={!running}>+</button>
        </div>

        <button className="reset-btn" onClick={onReset} disabled={running}>
          🔄 Reset
        </button>
      </div>
    </aside>
  );
}
