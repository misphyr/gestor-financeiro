import React, { useState } from 'react';
import { FileText, Sheet as SheetIcon } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { formatDateBR, toDateString } from '../../../utils/date';
import { buyerOf, currentPeriod, formatBRL, ME, monthEntries, MONTHS, periodEntries, statementRange, viewMode } from '../../../utils/finance';
import { exportFile } from '../../../utils/exportFile';
import { GroupedTxList } from '../TxList';

// "Este mês" e "Mês passado" seguem a visão escolhida: mês do calendário ou fatura.
const presetPeriod = (preset, today = new Date()) => {
  const base = currentPeriod(today);
  const d = new Date(base.year, base.month - (preset === 'last' ? 1 : 0), 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

const presetRange = (preset, statementMode, today = new Date()) => {
  if (preset === 'year') return [toDateString(new Date(today.getFullYear(), 0, 1)), toDateString(today)];
  const { year, month } = presetPeriod(preset, today);
  if (statementMode) {
    const r = statementRange(year, month);
    return [r.start, r.end];
  }
  return [toDateString(new Date(year, month, 1)), toDateString(new Date(year, month + 1, 0))];
};

const periodTitle = (preset, start, end, statementMode) => {
  if (preset === 'month' || preset === 'last') {
    const { year, month } = presetPeriod(preset);
    return `${statementMode ? 'Fatura de ' : ''}${statementMode ? MONTHS[month].toLowerCase() : MONTHS[month]} ${year}`;
  }
  if (preset === 'year') return `${new Date().getFullYear()} até hoje`;
  return `${formatDateBR(start)} a ${formatDateBR(end)}`;
};

// Valor para planilha em português: vírgula decimal, sem símbolo.
const csvNumber = (v) => v.toFixed(2).replace('.', ',');
const csvText = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
// jsPDF usa fontes WinAnsi; o espaço especial do Intl vira espaço comum.
const pdfMoney = (v) => formatBRL(v).replace(/\u00a0/g, ' ');

const kindLabel = (e) => (e.kind === 'earn' ? 'Entrada' : e.source === 'subscription' ? (e.fixed === 'anual' ? 'Anuidade' : 'Conta fixa') : e.installment ? 'Parcela' : 'Gasto');

export default function Reports({ onToast }) {
  const [preset, setPreset] = useState('month');
  const statementMode = viewMode() === 'statement';
  const [custom, setCustom] = useState(() => presetRange('month', false));
  const [category, setCategory] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [busy, setBusy] = useState(false);

  const [start, end] = preset === 'custom' ? custom : presetRange(preset, statementMode);
  const valid = start && end && start <= end;
  // Fatura: os lançamentos dela (inclui Pix/dinheiro e entradas do mês do vencimento).
  const statementPreset = statementMode && (preset === 'month' || preset === 'last');
  const all = !valid ? [] : statementPreset
    ? monthEntries(presetPeriod(preset).year, presetPeriod(preset).month)
    : periodEntries(start, end);
  const entries = all.filter((e) => (!category || e.category === category)
    && (!buyer || (e.kind === 'spend' && buyerOf(e) === buyer)));
  const filtered = Boolean(category || buyer);
  const buyerLabel = buyer && (buyer === ME ? 'comprado por mim' : `comprado por ${buyer}`);
  const filterLabel = [category, buyerLabel].filter(Boolean).join(' · ');
  const spend = entries.filter((e) => e.kind === 'spend');
  const income = filtered ? 0 : entries.filter((e) => e.kind === 'earn').reduce((a, e) => a + e.amount, 0);
  const spent = spend.reduce((a, e) => a + e.amount, 0);

  const byCat = {};
  spend.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const catMax = cats.length ? cats[0][1] : 1;
  const usedCategories = [...new Set(all.filter((e) => e.kind === 'spend').map((e) => e.category))];
  const colorOf = (name) => storage.categories.getAll().find((c) => c.name === name)?.color || '#7d8a85';
  const buyers = [...new Set(all.filter((e) => e.person).map((e) => e.person))];
  const title = periodTitle(preset, start, end, statementMode);
  const slug = [category, buyer].filter(Boolean).join('-').toLowerCase()
    .normalize('NFD').replace(/[^a-z0-9-]+/g, '');
  const fileBase = `relatorio-${start}_${end}${slug ? `-${slug}` : ''}`;

  const run = async (fn) => {
    setBusy(true);
    try {
      const ok = await fn();
      onToast(ok ? 'Relatório exportado' : 'Não foi possível exportar neste aparelho');
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = () => run(() => {
    const rows = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Parcela', 'Valor', 'Quem comprou', 'Dividido com'].join(';')];
    [...entries].reverse().forEach((e) => {
      rows.push([
        formatDateBR(e.date),
        kindLabel(e),
        csvText(e.title),
        csvText(e.category),
        e.installment ? `${e.installment[0]}/${e.installment[1]}` : '',
        csvNumber(e.kind === 'earn' ? e.amount : -e.amount),
        e.kind === 'spend' ? csvText(buyerOf(e)) : '',
        csvText(e.shared ? e.shared.join(', ') : '')
      ].join(';'));
    });
    return exportFile(`\uFEFF${rows.join('\r\n')}`, 'text/csv;charset=utf-8', `${fileBase}.csv`);
  });

  const exportPDF = () => run(async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 16;
    let y = 20;
    const ensure = (space) => { if (y + space > H - 16) { doc.addPage(); y = 20; } };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório financeiro', M, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(`${title}${filterLabel ? ` · ${filterLabel}` : ''}`, M, y);
    y += 12;

    doc.setTextColor(20);
    const summary = filtered
      ? [['Despesas', spent]]
      : [['Entradas', income], ['Despesas', spent], ['Saldo', income - spent]];
    summary.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, M, y);
      doc.setFont('helvetica', 'bold');
      doc.text(pdfMoney(value), W - M, y, { align: 'right' });
      y += 7;
    });
    y += 6;

    if (cats.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Por categoria', M, y);
      y += 7;
      doc.setFontSize(10);
      cats.forEach(([name, value]) => {
        ensure(7);
        doc.setFont('helvetica', 'normal');
        doc.text(name, M, y);
        doc.setFillColor(31, 111, 92);
        doc.rect(M + 45, y - 3, ((W - 2 * M - 85) * value) / catMax, 3.5, 'F');
        doc.text(`${Math.round((value / spent) * 100)}%`, W - M - 30, y, { align: 'right' });
        doc.text(pdfMoney(value), W - M, y, { align: 'right' });
        y += 6.5;
      });
      y += 6;
    }

    ensure(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Lançamentos', M, y);
    y += 7;
    const header = () => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(90);
      doc.text('Data', M, y);
      doc.text('Descrição', M + 24, y);
      doc.text('Categoria', M + 108, y);
      doc.text('Valor', W - M, y, { align: 'right' });
      doc.setDrawColor(210);
      doc.line(M, y + 2, W - M, y + 2);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20);
    };
    header();
    [...entries].reverse().forEach((e) => {
      if (y > H - 20) { doc.addPage(); y = 20; header(); }
      const extra = (e.installment ? ` (${e.installment[0]}/${e.installment[1]})` : e.source === 'subscription' ? ` (${e.fixed})` : '')
        + (e.person && !buyer ? ` · ${e.person}` : '');
      const desc = doc.splitTextToSize(`${e.title}${extra}`, 80)[0];
      doc.text(formatDateBR(e.date), M, y);
      doc.text(desc, M + 24, y);
      doc.text(doc.splitTextToSize(e.category, 44)[0], M + 108, y);
      doc.text(`${e.kind === 'earn' ? '+ ' : ''}${pdfMoney(e.amount)}`, W - M, y, { align: 'right' });
      y += 6;
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Gestor Financeiro · gerado em ${formatDateBR(toDateString(new Date()))} · página ${i} de ${pages}`, M, H - 8);
    }
    return exportFile(doc.output('blob'), 'application/pdf', `${fileBase}.pdf`);
  });

  const PRESETS = [['month', statementMode ? 'Esta fatura' : 'Este mês'], ['last', statementMode ? 'Fatura passada' : 'Mês passado'], ['year', 'Este ano'], ['custom', 'Escolher datas']];

  return (
    <div className="gf-stack">
      <section className="gf-card gf-stack-sm">
        <div className="gf-chips">
          {PRESETS.map(([id, label]) => (
            <button type="button" key={id} className="gf-chip" aria-pressed={preset === id} onClick={() => setPreset(id)}>{label}</button>
          ))}
        </div>
        {preset === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="gf-label" htmlFor="rep-start">De</label>
              <input id="rep-start" className="gf-input" type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
            </div>
            <div>
              <label className="gf-label" htmlFor="rep-end">Até</label>
              <input id="rep-end" className="gf-input" type="date" value={custom[1]} min={custom[0]} onChange={(e) => setCustom([custom[0], e.target.value])} />
            </div>
          </div>
        )}
        {!valid && <p className="gf-error">A data final precisa ser depois da inicial.</p>}
        {usedCategories.length > 1 && (
          <div className="gf-chips">
            {usedCategories.map((name) => (
              <button type="button" key={name} className="gf-chip" aria-pressed={category === name} onClick={() => setCategory(category === name ? null : name)}>
                <span className="dot" style={{ background: colorOf(name) }} />{name}
              </button>
            ))}
          </div>
        )}
        {buyers.length > 0 && (
          <div className="gf-chips" aria-label="Quem comprou">
            {[ME, ...buyers].map((name) => (
              <button type="button" key={name} className="gf-chip" aria-pressed={buyer === name} onClick={() => setBuyer(buyer === name ? null : name)}>
                {name === ME ? 'Comprado por mim' : `Comprado por ${name}`}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="gf-card gf-hero">
        <div>
          <div className="gf-hero-label">{title}{filterLabel ? ` · ${filterLabel}` : ''}</div>
          <div className="gf-hero-value">{formatBRL(spent)}</div>
        </div>
        <div className="gf-hero-sub">
          {filtered
            ? `${spend.length} lançamentos${category ? ` em ${category}` : ''}${buyerLabel ? `, ${buyerLabel}` : ''}`
            : `Entraram ${formatBRL(income)} · ${income - spent >= 0 ? 'sobrou' : 'faltou'} ${formatBRL(Math.abs(income - spent))}`}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" className="gf-btn-ghost" disabled={busy || !entries.length} onClick={exportPDF} style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: 10 }}>
            <FileText size={16} /> Exportar PDF
          </button>
          <button type="button" className="gf-btn-ghost" disabled={busy || !entries.length} onClick={exportCSV} style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: 10 }}>
            <SheetIcon size={16} /> Planilha (CSV)
          </button>
        </div>
      </section>

      {cats.length > 0 && !category && (
        <section className="gf-card">
          <h2 className="gf-section-title">Por categoria</h2>
          <div className="gf-cat-rows">
            {cats.map(([name, value]) => (
              <div className="gf-cat-row" key={name}>
                <span>{name}<span className="pct">{Math.round((value / spent) * 100)}%</span></span>
                <b>{formatBRL(value)}</b>
                <div className="bar"><span style={{ width: `${(value / catMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="gf-card">
        <h2 className="gf-section-title">Lançamentos <small>{entries.length}</small></h2>
        <GroupedTxList entries={entries} emptyText="Nada lançado neste período." />
      </section>
    </div>
  );
}
