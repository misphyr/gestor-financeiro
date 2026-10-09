import React from 'react';
import { ArrowDownLeft } from 'lucide-react';
import { storage } from '../../utils/storage';
import { getIconComponent } from '../../utils/icons';
import { parseLocalDate } from '../../utils/date';
import { formatBRL, MONTHS_SHORT } from '../../utils/finance';

const categoryLook = (name) => {
  const cat = storage.categories.getAll().find((c) => c.name === name);
  return { color: cat?.color || '#7d8a85', Icon: getIconComponent(cat?.icon || 'MoreHorizontal') };
};

export function TxRow({ entry, onSelect }) {
  const earn = entry.kind === 'earn';
  const { color, Icon } = earn ? { color: 'var(--earn)', Icon: ArrowDownLeft } : categoryLook(entry.category);
  const content = (
    <>
      <div className="gf-tx-icon" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="gf-tx-main">
        <div className="gf-tx-title">{entry.title}</div>
        <div className="gf-tx-meta">
          <span>{entry.category}</span>
          {entry.person && <span className="gf-pill is-person">{entry.person}</span>}
          {entry.raw?.paidWith === 'other' && <span className="gf-pill">Pix/dinheiro</span>}
          {entry.installment && <span className="gf-pill is-inst">{entry.installment[0]}/{entry.installment[1]}</span>}
          {entry.fixed && <span className="gf-pill is-fixed">{entry.fixed}</span>}
          {entry.shared && <span className="gf-pill">dividido com {entry.shared.join(', ')}</span>}
        </div>
      </div>
      <div className={`gf-tx-amt ${earn ? 'earn' : ''}`}>{earn ? '+ ' : ''}{formatBRL(entry.amount)}</div>
    </>
  );

  if (onSelect && entry.source === 'expense') {
    return <button type="button" className="gf-tx" onClick={() => onSelect(entry)}>{content}</button>;
  }
  return <div className="gf-tx">{content}</div>;
}

export const dayLabel = (dateStr, today = new Date()) => {
  const d = parseLocalDate(dateStr);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((t - d) / 864e5);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]}`;
};

export function GroupedTxList({ entries, onSelect, emptyText = 'Nenhum lançamento encontrado.' }) {
  if (!entries.length) return <p className="gf-empty">{emptyText}</p>;

  const groups = [];
  entries.forEach((e) => {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  });

  return groups.map((g) => {
    const spent = g.items.filter((e) => e.kind === 'spend').reduce((a, e) => a + e.amount, 0);
    return (
      <div className="gf-day-group" key={g.date}>
        <div className="gf-day-head">
          <span>{dayLabel(g.date)}</span>
          <span>{spent ? formatBRL(spent) : ''}</span>
        </div>
        {g.items.map((e) => <TxRow key={e.key} entry={e} onSelect={onSelect} />)}
      </div>
    );
  });
}
