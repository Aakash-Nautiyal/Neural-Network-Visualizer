import React, { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import '../styles/Visualizer.css';

const X_GAP = 180, Y_GAP = 110, R = 18, PAD = 60;
const fmt = (n, d = 2) => n === undefined || n === null ? '' : Number(n).toFixed(d);

export default function Visualizer({
    inputCount,
    layers,
    weights = [],
    biases = [],
    inputVals = [],
    nodeVals = [],
    currentLayer = -1,
    phase = 'forward',           // 'forward' | 'backward' | 'idle'
    tickDelay = 500,
    onLayerDone = () => { },
}) {
    /* ---------- geometry (unchanged) ---------- */
    const { nodes, edges, layerEdges, svgW, svgH } = useMemo(() => {
        const cols = [{ id: 'in', count: inputCount },
        ...layers.map(l => ({ id: l.id, count: l.nodes })),
        { id: 'out', count: 1 }];

        const maxN = Math.max(...cols.map(c => c.count));
        const svgH = PAD * 2 + (maxN - 1) * Y_GAP;
        const svgW = PAD * 2 + (cols.length - 1) * X_GAP;

        const nodes = [], colStart = [];
        cols.reduce((acc, c, ci) => {
            colStart[ci] = acc;
            const x = PAD + ci * X_GAP, colH = (c.count - 1) * Y_GAP;
            for (let i = 0; i < c.count; i++) {
                const y = PAD + (svgH - 2 * PAD) / 2 - colH / 2 + i * Y_GAP;
                nodes.push({ id: `${c.id}-${i}`, col: ci, idx: i, x, y });
            }
            return acc + c.count;
        }, 0);

        const edges = [];
        for (let ci = 0; ci < cols.length - 1; ci++) {
            for (let a = 0; a < cols[ci].count; a++) {
                for (let b = 0; b < cols[ci + 1].count; b++) {
                    const src = nodes[colStart[ci] + a];
                    const trg = nodes[colStart[ci + 1] + b];
                    edges.push({
                        ...src, x2: trg.x, y2: trg.y, layer: ci,
                        id: `${src.id}-${trg.id}`
                    });
                }
            }
        }
        const layerEdges = edges.reduce((acc, e) => {
            (acc[e.layer] = acc[e.layer] || []).push(e); return acc;
        }, {});
        return { nodes, edges, layerEdges, svgW, svgH };
    }, [inputCount, layers]);

    /* one‑shot layer‑complete callback */
    const doneRef = useRef(false);
    useEffect(() => { doneRef.current = false; }, [phase, currentLayer]);
    const finish = () => { if (!doneRef.current) { doneRef.current = true; onLayerDone(); } };

    const dotColor = phase === 'backward' ? '#8b5cf6' : '#facc15';

    /* ---------- render ---------- */
    return (
        /* wrapper keeps diagram inside scroll‑box */
        <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">

                {/* edges */}
                {edges.map(e => (
                    <line key={e.id} x1={e.x} y1={e.y} x2={e.x2} y2={e.y2}
                        stroke="#94a3b8" strokeWidth="1" />
                ))}

                {/* weight labels – small font, 2 decimals */}
                {edges.map(e => (
                    <text key={e.id + 'lbl'}
                        x={(e.x + e.x2) / 2} y={(e.y + e.y2) / 2 - 4}
                        fontSize="8" textAnchor="middle" fill="#64748b">
                        {fmt(weights[e.layer])}
                    </text>
                ))}

                {/* animated dots */}
                {(phase === 'forward' || phase === 'backward') && currentLayer >= 0 &&
                    layerEdges[currentLayer]?.map((e, i) => (
                        <motion.circle key={'dot' + e.id} r={6} fill={dotColor}
                            initial={{
                                cx: phase === 'forward' ? e.x : e.x2,
                                cy: phase === 'forward' ? e.y : e.y2
                            }}
                            animate={{
                                cx: phase === 'forward' ? e.x2 : e.x,
                                cy: phase === 'forward' ? e.y2 : e.y
                            }}
                            transition={{ duration: tickDelay / 1000, ease: 'linear' }}
                            onAnimationComplete={
                                i === layerEdges[currentLayer].length - 1 ? finish : undefined
                            } />
                    ))}

                {/* nodes & bias bubbles */}
                {nodes.map(nd => {
                    const val = nd.col === 0 ? inputVals[nd.idx] : nodeVals[nd.col - 1];
                    const biasVal = nd.col > 0 ? biases[nd.col - 1] : undefined;
                    return (
                        <g key={nd.id}>
                            <circle cx={nd.x} cy={nd.y} r={R}
                                fill="#20e3b2" stroke="#012218" strokeWidth="3" />
                            {val !== undefined && (
                                <text x={nd.x} y={nd.y + 4} textAnchor="middle"
                                    fontSize="12" fontWeight="600" fill="#001915">
                                    {fmt(val, 2)}
                                </text>
                            )}
                            {biasVal !== undefined && (
                                <>
                                    <circle cx={nd.x - 28} cy={nd.y - 28} r={10} fill="#1e293b" />
                                    <text x={nd.x - 28} y={nd.y - 24} textAnchor="middle"
                                        fontSize="8" fill="#e2e8f0">{fmt(biasVal, 2)}</text>
                                </>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
