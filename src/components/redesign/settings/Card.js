import React, { useState } from 'react';
import { storage } from '../../../utils/storage';
import { formatDateBR, toDateString } from '../../../utils/date';
import { MONTHS, statementOf, statementRange } from '../../../utils/finance';

const clampDay = (value) => {
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 31) : '';
};

export default function Card({ onToast }) {
  const saved = storage.settings.get();
  const [closingDay, setClosingDay] = useState(saved.card?.closingDay || '');
  const [dueDay, setDueDay] = useState(saved.card?.dueDay || '');
  const [mode, setMode] = useState(saved.viewMode === 'statement' ? 'statement' : 'calendar');
  const [error, setError] = useState('');

  const valid = closingDay >= 1 && dueDay >= 1;
  const card = valid ? { closingDay, dueDay } : null;
  const open = card ? statementOf(toDateString(new Date()), card) : null;
  const range = open ? statementRange(open.year, open.month, card) : null;

  const save = () => {
    if (mode === 'statement' && !valid) { setError('Informe o dia de fechamento e o de vencimento para ver os meses por fatura.'); return; }
    storage.settings.update({ card: valid ? { closingDay, dueDay } : null, viewMode: valid ? mode : 'calendar' });
    window.dispatchEvent(new Event('expenseAdded'));
    setError('');
    onToast(mode === 'statement' && valid ? 'Meses organizados pela fatura' : 'Configuração salva');
  };

  return (
    <div className="gf-stack">
      <section className="gf-card gf-stack-sm">
        <h2 className="gf-section-title" style={{ margin: 0 }}>Cartão de crédito</h2>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>
          No app do Nubank, veja em Cartão → Fatura os dias de fechamento e de vencimento.
          Compras feitas a partir do dia do fechamento entram na fatura seguinte.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="gf-label" htmlFor="card-closing">Fecha no dia</label>
            <input id="card-closing" className="gf-input" inputMode="numeric" placeholder="30" value={closingDay} onChange={(e) => { setClosingDay(clampDay(e.target.value)); setError(''); }} />
          </div>
          <div>
            <label className="gf-label" htmlFor="card-due">Vence no dia</label>
            <input id="card-due" className="gf-input" inputMode="numeric" placeholder="7" value={dueDay} onChange={(e) => { setDueDay(clampDay(e.target.value)); setError(''); }} />
          </div>
        </div>
        {range && (
          <div className="gf-owed" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px' }}>
            <p>
              Fatura aberta agora: <b>{MONTHS[open.month].toLowerCase()}</b>, vence em <b>{formatDateBR(range.due)}</b>.
              Entram as compras de {formatDateBR(range.start)} a {formatDateBR(range.end)}.
            </p>
          </div>
        )}
      </section>

      <section className="gf-card gf-stack-sm">
        <h2 className="gf-section-title" style={{ margin: 0 }}>Como organizar os meses</h2>
        <div className="gf-seg">
          <button type="button" aria-pressed={mode === 'calendar'} onClick={() => setMode('calendar')}>Data da compra</button>
          <button type="button" aria-pressed={mode === 'statement'} onClick={() => setMode('statement')}>Fatura</button>
        </div>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>
          {mode === 'statement'
            ? 'Cada mês mostra a fatura que vence nele, e o total bate com o que o Nubank cobra. Assinaturas também seguem a fatura. Entradas e gastos marcados como Pix ou dinheiro ficam no mês do calendário.'
            : 'Cada gasto aparece no mês em que foi feito, mesmo que só seja pago na fatura do mês seguinte.'}
        </p>
      </section>

      {error && <p className="gf-error" role="alert">{error}</p>}
      <button type="button" className="gf-btn-primary" onClick={save}>Salvar</button>
    </div>
  );
}
