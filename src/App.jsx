import React, { useState, useEffect, useCallback } from 'react';
import SideMenu from './components/SideMenu';
import Visualizer from './components/Visualizer';
import Results from './components/ResultsTable';

/* ---------- helpers ------------------------------------------------ */
const resizeArr = (arr, len, fill = 0) =>
  len <= arr.length ? arr.slice(0, len)
    : [...arr, ...Array(len - arr.length).fill(fill)];

const defaults = () => ({
  inputCount: 2,
  layers: [{ id: 'L1', nodes: 3 }, { id: 'L2', nodes: 3 }],
  inputVals: [1, 1],
  weights: [1, 1, 1],      // + output layer
  biases: [0, 0, 0],
  learningRate: 0.1,
  targetY: 1,
  maxEpochs: 10,
});

/* sigmoid + derivative (only activation now) */
const σ = x => 1 / (1 + Math.exp(-x));
const σd = x => σ(x) * (1 - σ(x));

/* ---------- component ---------------------------------------------- */
export default function App() {
  /* ----- initialise state from defaults --------------------------- */
  const init = defaults();

  /* topology */
  const [inputCount, setInputCount] = useState(init.inputCount);
  const [layers, setLayers] = useState(init.layers);

  /* params */
  const [inputVals, setInputVals] = useState(init.inputVals);
  const [weights, setWeights] = useState(init.weights);
  const [biases, setBiases] = useState(init.biases);
  const [learningRate, setLearningRate] = useState(init.learningRate);

  /* meta */
  const [targetY, setTargetY] = useState(init.targetY);
  const [maxEpochs, setMaxEpochs] = useState(init.maxEpochs);

  /* run‑time */
  const [epoch, setEpoch] = useState(0);
  const [phase, setPhase] = useState('idle'); // 'forward'|'backward'|'idle'
  const [curLayer, setCurLayer] = useState(-1);
  const [tickDelay, setTickDelay] = useState(400);
  const [nodeVals, setNodeVals] = useState([]);
  const [zVals, setZVals] = useState([]);
  const [deltaPrev, setDeltaPrev] = useState(null);
  const [results, setResults] = useState([]);
  const running = phase !== 'idle';

  /* keep arrays sized to topology ------------------------------- */
  useEffect(() => {
    const L = layers.length + 1;          // + output layer
    setInputVals(v => resizeArr(v, inputCount, 0));
    setWeights(w => resizeArr(w, L, 1));
    setBiases(b => resizeArr(b, L, 0));
  }, [inputCount, layers.length]);

  /* ---------- forward (no animation) --------------------------- */
  const forward = () => {
    const a = [], z = [];
    let prev = [...inputVals];
    layers.concat({ nodes: 1 }).forEach((_, idx) => {
      const sum = prev.reduce((s, v) => s + v, 0);
      const zL = weights[idx] * sum + biases[idx];
      const aL = σ(zL);               // hard‑wired sigmoid
      z.push(zL); a.push(aL);
      prev = Array(idx < layers.length ? layers[idx].nodes : 1).fill(aL);
    });
    const yHat = a[a.length - 1];
    const loss = 0.5 * (yHat - targetY) ** 2;
    setNodeVals(a); setZVals(z);
    return { yHat, loss };
  };

  /* ---------- backprop one layer ------------------------------ */
  const backpropLayer = (idx, deltaNext) => {
    const zL = zVals[idx];
    const sumPrev = idx === 0
      ? inputVals.reduce((s, v) => s + v, 0)
      : σ(zVals[idx - 1]) *
      (idx === 1 ? layers[0].nodes : layers[idx - 1].nodes);
    const delta = idx === zVals.length - 1
      ? (nodeVals[nodeVals.length - 1] - targetY) * σd(zL)
      : weights[idx + 1] * deltaNext * σd(zL);

    const gradW = delta * sumPrev;
    const gradB = delta * (idx < layers.length ? layers[idx].nodes : 1);

    setWeights(ws => ws.map((w, i) => i === idx ? w - learningRate * gradW : w));
    setBiases(bs => bs.map((b, i) => i === idx ? b - learningRate * gradB : b));
    return delta;
  };

  /* ---------- start ------------------------------------------- */
  const startRun = () => {
    setEpoch(0); setResults([]);
    const { yHat, loss } = forward();
    setResults([{ epoch: 0, yHat: yHat.toFixed(3), loss: loss.toFixed(4) }]);
    setCurLayer(0); setPhase('forward');
  };

  /* ---------- animation driver ------------------------------- */
  const handleLayerDone = useCallback(() => {
    if (phase === 'forward') {
      if (curLayer < layers.length) { setCurLayer(curLayer + 1); }
      else { setDeltaPrev(null); setPhase('backward'); setCurLayer(layers.length); }
    } else if (phase === 'backward') {
      const delta = backpropLayer(curLayer, deltaPrev);
      setDeltaPrev(delta);
      const next = curLayer - 1;
      if (next >= 0) { setCurLayer(next); }
      else {                                          // epoch end
        const { yHat, loss } = forward();
        const newE = epoch + 1;
        setEpoch(newE);
        setResults(r => [...r, { epoch: newE, yHat: yHat.toFixed(3), loss: loss.toFixed(4) }]);
        if (newE >= maxEpochs) { setPhase('idle'); }
        else { setDeltaPrev(null); setPhase('forward'); setCurLayer(0); }
      }
    }
  }, [phase, curLayer, deltaPrev, epoch]);

  /* ---------- reset all -------------------------------------- */
  const resetAll = () => {
    const d = defaults();
    setPhase('idle');
    setInputCount(d.inputCount);
    setLayers(d.layers);
    setInputVals(d.inputVals);
    setWeights(d.weights);
    setBiases(d.biases);
    setLearningRate(d.learningRate);
    setTargetY(d.targetY);
    setMaxEpochs(d.maxEpochs);
    setEpoch(0); setResults([]); setNodeVals([]); setZVals([]);
    setCurLayer(-1); setDeltaPrev(null);
  };

  /* ---------- render ----------------------------------------- */
  return (

    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <div style={{ padding: '12px 20px', backgroundColor: '#0f1925', color: '#e5f0ff', fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'center' }}>
        Neural Network Visualizer by Aakash Nautiyal
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SideMenu
          /* topology */ inputCount={inputCount} setInputCount={setInputCount}
          layers={layers} setLayers={setLayers}
          /* params    */ inputVals={inputVals} setInputVals={setInputVals}
          weights={weights} setWeights={setWeights}
          biases={biases} setBiases={setBiases}
          learningRate={learningRate} setLearningRate={setLearningRate}
          /* training   */ targetY={targetY} setTargetY={setTargetY}
          maxEpochs={maxEpochs} setMaxEpochs={setMaxEpochs}
          /* run        */ running={running} tickDelay={tickDelay} setTickDelay={setTickDelay}
          onStart={startRun} onEnd={() => setPhase('idle')} onReset={resetAll}
          uiLocked={running}
        />

        <div style={{ flex: 1, overflow: 'auto' }}>
          <Visualizer
            inputCount={inputCount}
            layers={layers}
            inputVals={inputVals}
            weights={weights}
            biases={biases}
            nodeVals={nodeVals}
            currentLayer={curLayer}
            phase={phase}
            tickDelay={tickDelay}
            onLayerDone={handleLayerDone}
          />
        </div>
      </div>

      <Results rows={results} />
    </div>
  );
}
