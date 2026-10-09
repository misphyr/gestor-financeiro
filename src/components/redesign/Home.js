import React from 'react';
import { buyerOf, currentPeriod, formatBRL, ME, monthSummary, pendingCharges, statementRange, upcomingAnnual, viewMode } from '../../utils/finance';
import { formatDateBR, parseLocalDate } from '../../utils/date';
import { GroupedTxList } from './TxList';

export default function Home({ year, month, onOpenList, onOpenCharges, onOpenReports, onSelect }) {
  const today = new Date();
  const s = monthSummary(year, month, today);
  const current = currentPeriod(today);
  const isCurrent = year === current.year && month === current.month;
  const statement = viewMode() === 'statement' ? statementRange(year, month) : null;
  const base = Math.max(s.income, s.total) || 1;
  const pct = (v) => `${(v / base) * 100}%`;
  const spendTotal = s.categories.reduce((a, [, v]) => a + v, 0) || 1;
  const catMax = s.categories.length ? s.categories[0][1] : 1;
  const owed = isCurrent ? pendingCharges(today) : [];
  const owedTotal = owed.reduce((a, p) => a + p.amount, 0);
  const annualSoon = isCurrent ? upcomingAnnual(today, 45) : [];

  // Quem comprou: só aparece quando alguém além do usuário tem gastos no mês.
  const byBuyer = {};
  s.entries.filter((e) => e.kind === 'spend').forEach((e) => {
    byBuyer[buyerOf(e)] = (byBuyer[buyerOf(e)] || 0) + e.amount;
  });
  const buyers = Object.entries(byBuyer).sort((a, b) => (a[0] === ME ? -1 : b[0] === ME ? 1 : b[1] - a[1]));
  const showBuyers = buyers.some(([name]) => name !== ME);

  const label = s.future ? 'Sobra prevista' : isCurrent ? 'Sobra do mês até agora' : 'Sobrou no mês';
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const recent = s.entries
    .filter((e) => !e.fixed && (s.future || parseLocalDate(e.date) <= endOfToday))
    .slice(0, 6);

  return (
    <div className="gf-stack">
      <section className="gf-card gf-hero" aria-label="Resumo do mês">
        <div>
          {statement && (
            <div className="gf-note" style={{ margin: '0 0 6px' }}>
              Fatura que vence em {formatDateBR(statement.due)} · compras de {formatDateBR(statement.start).slice(0, 5)} a {formatDateBR(statement.end).slice(0, 5)}
            </div>
          )}
          <div className="gf-hero-label">{label}</div>
          <div className={`gf-hero-value ${s.left < 0 ? 'neg' : ''}`}>{formatBRL(s.left)}</div>
        </div>
        <div className="gf-budget-bar" role="img" aria-label="Despesas em relação às entradas">
          <span style={{ width: pct(s.fixed), background: 'var(--fixed)' }} />
          <span style={{ width: pct(s.installments), background: 'var(--inst)' }} />
          <span style={{ width: pct(s.variable), background: 'var(--spend)' }} />
          {s.estimate > 0 && <span style={{ width: pct(s.estimate), background: 'var(--est)' }} />}
        </div>
        <div className="gf-hero-sub">Gastou {formatBRL(s.total)} de {formatBRL(s.income)} que entraram</div>
        <div className="gf-legend">
          <span><i style={{ background: 'var(--fixed)' }} />Fixos {formatBRL(s.fixed)}</span>
          <span><i style={{ background: 'var(--inst)' }} />Parcelas {formatBRL(s.installments)}</span>
          <span><i style={{ background: 'var(--spend)' }} />Variáveis {formatBRL(s.variable)}</span>
          {s.estimate > 0 && <span><i style={{ background: 'var(--est)' }} />Estimativa {formatBRL(s.estimate)}</span>}
        </div>
      </section>

      {owedTotal > 0 && (
        <section className="gf-card gf-owed">
          <p>
            {owed.length === 1
              ? <><b>{owed[0].name}</b> te deve <b>{formatBRL(owed[0].amount)}</b></>
              : <>Te devem <b>{formatBRL(owedTotal)}</b> ({owed.map((p) => p.name).join(', ')})</>}
          </p>
          <button type="button" className="gf-btn-ghost" onClick={onOpenCharges}>Ver cobranças</button>
        </section>
      )}

      {annualSoon.map(({ sub, date }) => (
        <section className="gf-card gf-owed" key={sub.id}>
          <p>Anuidade chegando: <b>{sub.name}</b>, <b>{formatBRL(sub.amount)}</b> em {formatDateBR(date)}</p>
          <span className="gf-pill is-fixed">anual</span>
        </section>
      ))}

      {showBuyers && (
        <section className="gf-card">
          <h2 className="gf-section-title">
            Quem comprou
            <button type="button" className="gf-btn-ghost" onClick={onOpenReports}>Relatório</button>
          </h2>
          <div className="gf-cat-rows">
            {buyers.map(([name, value]) => (
              <div className="gf-cat-row" key={name}>
                <span>{name}<span className="pct">{Math.round((value / spendTotal) * 100)}%</span></span>
                <b>{formatBRL(value)}</b>
                <div className="bar"><span style={{ width: `${(value / spendTotal) * 100}%`, background: name === ME ? 'var(--accent)' : 'var(--fixed)' }} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="gf-card">
        <h2 className="gf-section-title">
          Para onde foi o dinheiro
          {s.future && <small>só o que já está lançado</small>}
        </h2>
        {s.categories.length ? (
          <div className="gf-cat-rows">
            {s.categories.map(([name, value]) => (
              <div className="gf-cat-row" key={name}>
                <span>{name}<span className="pct">{Math.round((value / spendTotal) * 100)}%</span></span>
                <b>{formatBRL(value)}</b>
                <div className="bar"><span style={{ width: `${(value / catMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : <p className="gf-empty">Sem gastos neste mês.</p>}
      </section>

      <section className="gf-card">
        <h2 className="gf-section-title">
          Últimos lançamentos
          <button type="button" className="gf-btn-ghost" onClick={onOpenList}>Ver todos</button>
        </h2>
        <GroupedTxList entries={recent} onSelect={onSelect} emptyText="Nada lançado ainda. Toque no + para começar." />
      </section>
    </div>
  );
}
