import React, { useState } from 'react';
import { averageVariable, currentPeriod, formatBRL, monthSummary, MONTHS, MONTHS_SHORT, viewMode } from '../../utils/finance';
import { TxRow } from './TxList';

const W = 340;
const H = 210;
const LEFT = 44;
const RIGHT = 8;
const TOP = 12;
const BOTTOM = 28;

const shortValue = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v)));

export default function Forecast() {
  const [selected, setSelected] = useState(0);
  const today = new Date();
  const base = currentPeriod(today);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base.year, base.month + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), ...monthSummary(d.getFullYear(), d.getMonth(), today) };
  });
  const sel = months[selected];

  const max = Math.max(1, ...months.map((m) => Math.max(m.total, m.income)));
  const step = max > 12000 ? 4000 : max > 6000 ? 2000 : max > 3000 ? 1000 : 500;
  const top = Math.ceil(max / step) * step;
  const y = (v) => TOP + (H - TOP - BOTTOM) * (1 - v / top);
  const slot = (W - LEFT - RIGHT) / months.length;
  const barW = slot * 0.5;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const layers = [['fixed', 'var(--fixed)'], ['installments', 'var(--inst)'], ['variable', 'var(--spend)'], ['estimate', 'var(--est)']];
  const points = months.map((m, i) => [LEFT + slot * i + slot / 2, y(m.income)]);
  const commitments = sel.entries.filter((e) => e.kind === 'spend' && (e.installment || e.fixed)).sort((a, b) => b.amount - a.amount);

  return (
    <div className="gf-stack">
      <section className="gf-card">
        <h2 className="gf-section-title">{viewMode() === 'statement' ? 'Próximas 6 faturas' : 'Próximos 6 meses'} <small>toque num mês</small></h2>
        <svg className="gf-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Despesas previstas por mês com linha de entradas">
          {ticks.map((v) => (
            <g key={v}>
              <line className="gf-grid" x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} />
              <text x={LEFT - 6} y={y(v) + 4} textAnchor="end">{v ? shortValue(v) : '0'}</text>
            </g>
          ))}
          {months.map((m, i) => {
            const cx = LEFT + slot * i + slot / 2;
            let acc = 0;
            return (
              <g key={`${m.year}-${m.month}`}>
                {i === selected && <rect className="sel-bg" x={cx - slot / 2 + 2} y={TOP - 6} width={slot - 4} height={H - TOP - BOTTOM + 10} rx="8" />}
                {layers.map(([key, color]) => {
                  const v = m[key];
                  if (!v) return null;
                  const rect = <rect key={key} x={cx - barW / 2} y={y(acc + v)} width={barW} height={y(acc) - y(acc + v)} fill={color} />;
                  acc += v;
                  return rect;
                })}
                <text x={cx} y={H - 8} textAnchor="middle" className={i === selected ? 'sel' : ''}>{MONTHS_SHORT[m.month]}</text>
                <rect className="hit" x={cx - slot / 2} y="0" width={slot} height={H} onClick={() => setSelected(i)}>
                  <title>{MONTHS[m.month]}</title>
                </rect>
              </g>
            );
          })}
          <polyline className="income-line" points={points.map((p) => p.join(',')).join(' ')} />
          {points.map(([px, py], i) => <circle key={i} className="income-dot" cx={px} cy={py} r="3.5" pointerEvents="none" />)}
        </svg>
        <div className="gf-legend">
          <span><i style={{ background: 'var(--fixed)' }} />Fixos</span>
          <span><i style={{ background: 'var(--inst)' }} />Parcelas</span>
          <span><i style={{ background: 'var(--spend)' }} />Variáveis</span>
          <span><i style={{ background: 'var(--est)' }} />Estimativa</span>
          <span><i style={{ background: 'var(--earn)', height: 3, width: 12 }} />Entradas</span>
        </div>
        <p className="gf-note">
          Nos meses futuros, os gastos variáveis são estimados pela média dos últimos 3 meses ({formatBRL(averageVariable(today))}).
        </p>
      </section>

      <section className="gf-card">
        <h2 className="gf-section-title">
          {MONTHS[sel.month]} {sel.year}
          <small>{sel.left >= 0 ? 'sobra' : 'falta'} {formatBRL(Math.abs(sel.left))}</small>
        </h2>
        <div className="gf-detail">
          <div><span>Entradas</span><b style={{ color: 'var(--earn)' }}>{formatBRL(sel.income)}</b></div>
          <div><span>Fixos</span><b>{formatBRL(sel.fixed)}</b></div>
          <div><span>Parcelas</span><b>{formatBRL(sel.installments)}</b></div>
          <div><span>{sel.future ? 'Variáveis (est.)' : 'Variáveis'}</span><b>{formatBRL(sel.variable + sel.estimate)}</b></div>
          <div className="total"><span>Despesas</span><span>{formatBRL(sel.total)}</span></div>
        </div>
      </section>

      <section className="gf-card">
        <h2 className="gf-section-title">Compromissos do mês <small>{commitments.length} itens</small></h2>
        <div className="gf-plain-list">
          {commitments.length
            ? commitments.map((e) => <TxRow key={e.key} entry={e} />)
            : <p className="gf-empty">Nenhuma parcela ou conta fixa neste mês.</p>}
        </div>
      </section>
    </div>
  );
}
