// src/components/ResultsTable.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/* ──────────   NEW, TIGHTER THRESHOLDS   ────────── */
const classify = L => {
  L = +L;                                         // ensure number
  if (L > 0.01)      return { label: 'Underfit', color: '#38bdf8' }; // blue
  if (L <= 0.0005)   return { label: 'Overfit',  color: '#ef4444' }; // red
  return               { label: 'Best fit',  color: '#22c55e' };     // green
};

/* style helpers */
const header = {
  padding: '6px 10px',
  borderBottom: '1px solid #2d3e54',
  fontWeight: 600,
  textAlign: 'center'
};
const cell = {
  padding: '4px 10px',
  textAlign: 'center',
  fontFamily: 'Roboto Mono, Menlo, monospace'
};
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ──────────  Sparkline Loss Chart  ────────── */
function LossChart({ rows }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    /* responsive */
    const W = Math.min(svg.node().parentNode.clientWidth * 0.8, 600);
    const H = 180;
    const M = { t: 18, r: 30, b: 48, l: 50 }; // room for axis titles
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const txt = '#9bb3d1';
    const grid = '#27364a';

    if (!rows.length) return;

    /* data domain with padding */
    const losses = rows.map(d => +d.loss);
    let [minL, maxL] = d3.extent(losses);
    const pad = (maxL - minL) * 0.2 || maxL * 0.2 || 0.0002;
    minL -= pad;
    maxL += pad;

    /* scales */
    const x = d3.scaleLinear().domain([0, rows.length - 1]).range([M.l, W - M.r]);
    const y = d3.scaleLinear().domain([minL, maxL]).nice().range([H - M.b, M.t]);

    /* axes */
    const axisTxt = g => g.selectAll('text').attr('fill', txt).attr('font-size', 9);

    svg.append('g')
      .attr('transform', `translate(0,${H - M.b})`)
      .call(d3.axisBottom(x).ticks(Math.min(rows.length, 8)).tickFormat(d3.format('d')))
      .call(axisTxt)
      .call(g => g.selectAll('path,line').attr('stroke', grid));

    svg.append('g')
      .attr('transform', `translate(${M.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.4f')))
      .call(axisTxt)
      .call(g => g.selectAll('path,line').attr('stroke', grid));

    /* axis titles */
    svg.append('text')
      .attr('x', -H / 2)
      .attr('y', -M.l + 50)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('fill', txt)
      .attr('font-size', 12)
      .text('Loss');

    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', txt)
      .attr('font-size', 12)
      .text('Epoch');

    /* area under curve */
    svg.append('path')
      .datum(losses)
      .attr('fill', '#1b2d47')
      .attr('opacity', 0.35)
      .attr('d',
        d3.area()
          .x((_, i) => x(i))
          .y0(y(minL))
          .y1(d => y(d))
          .curve(d3.curveMonotoneX)
      );

    /* loss line */
    svg.append('path')
      .datum(losses)
      .attr('fill', 'none')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 2)
      .attr('d',
        d3.line()
          .x((_, i) => x(i))
          .y(d => y(d))
          .curve(d3.curveMonotoneX)
      );

    /* latest point */
    svg.append('circle')
      .attr('cx', x(losses.length - 1))
      .attr('cy', y(losses.at(-1)))
      .attr('r', 4)
      .attr('fill', '#ef4444')
      .attr('stroke', '#0e1726')
      .attr('stroke-width', 1.5);
  }, [rows]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: 180, background: '#0e1726' }}
      />
    </div>
  );
}

/* ──────────  Results Table with resizable panel  ────────── */
function ResultsTable({ rows = [] }) {
  const [height, setH] = useState(0);
  const [expanded, setEx] = useState(false);
  const boxRef = useRef(null);
  const MIN_H = 0, MAX_H = window.innerHeight * 0.5;

  /* auto‑grow once */
  useEffect(() => {
    if (!expanded && rows.length && boxRef.current) {
      const want = clamp(boxRef.current.scrollHeight, 140, MAX_H);
      setH(want);
      setEx(true);
    }
  }, [rows, expanded]);

  /* drag‑resize */
  const onMouseDown = e => {
    const startY = e.clientY, startH = height;
    const move = m => setH(clamp(startH - (m.clientY - startY), MIN_H, MAX_H));
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div style={{ width: '100%', flexShrink: 0, background: '#0f1925' }}>
      <div
        onMouseDown={onMouseDown}
        style={{ height: 6, cursor: 'row-resize', background: '#28384d', userSelect: 'none' }}
      />
      <div
        ref={boxRef}
        style={{
          height,
          overflow: 'auto',
          borderTop: '1px solid #28384d',
          color: '#e5f0ff',
          fontSize: '0.85rem'
        }}
      >
        {/* sparkline */}
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th colSpan={4} style={{ padding: 0 }}>
                <LossChart rows={rows} />
              </th>
            </tr>
          </thead>
        </table>

        {/* numeric log */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#162330', position: 'sticky', top: 0 }}>
              <th style={{ ...header, width: '20%' }}>Epoch</th>
              <th style={{ ...header, width: '20%' }}>ŷ</th>
              <th style={{ ...header, width: '25%' }}>Loss</th>
              <th style={{ ...header, width: '35%' }}>Fit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const { label, color } = classify(r.loss);
              return (
                <tr key={i} style={{ background: i % 2 ? '#13202c' : 'transparent' }}>
                  <td style={{ ...cell, textAlign: 'left' }}>{r.epoch}</td>
                  <td style={cell}>{r.yHat}</td>
                  <td style={cell}>{r.loss}</td>
                  <td style={{ ...cell, color }}>{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResultsTable;
