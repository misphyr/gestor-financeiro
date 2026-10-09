import React, { useState } from 'react';
import { storage } from '../../../utils/storage';
import { formatDateBR } from '../../../utils/date';
import { allCharges, chargeBuyersEnabled, formatBRL } from '../../../utils/finance';

const notify = () => window.dispatchEvent(new Event('expenseAdded'));

export default function Charges({ onToast }) {
  const [showPaid, setShowPaid] = useState(false);
  const charges = allCharges();
  const chargeBuyers = chargeBuyersEnabled();
  const pending = charges.filter((c) => !c.paid);
  const paid = charges.filter((c) => c.paid);
  const pendingTotal = pending.reduce((a, c) => a + c.amount, 0);

  const people = {};
  pending.forEach((c) => {
    people[c.person] = people[c.person] || { name: c.person, total: 0, items: [] };
    people[c.person].total += c.amount;
    people[c.person].items.push(c);
  });
  const byPerson = Object.values(people).sort((a, b) => b.total - a.total);

  const markPaid = (items, value, message) => {
    storage.charges.setPaid(items.map((c) => c.key), value);
    notify();
    onToast(message);
  };

  return (
    <div className="gf-stack">
      <section className="gf-card gf-hero">
        <div>
          <div className="gf-hero-label">Te devem</div>
          <div className="gf-hero-value">{formatBRL(pendingTotal)}</div>
        </div>
        <div className="gf-hero-sub">
          {byPerson.length
            ? `${byPerson.length} ${byPerson.length === 1 ? 'pessoa' : 'pessoas'} · até este mês`
            : 'Nenhuma cobrança pendente. Para dividir um gasto, use "Mais opções" no botão +.'}
        </div>
      </section>

      <section className="gf-card gf-stack-sm">
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
          <input
            id="charge-buyers"
            type="checkbox"
            checked={chargeBuyers}
            onChange={(e) => {
              storage.settings.update({ chargeBuyers: e.target.checked });
              notify();
              onToast(e.target.checked ? 'Compras de outras pessoas viram cobrança' : 'Compras de outras pessoas não viram mais cobrança');
            }}
            style={{ marginTop: 3 }}
          />
          <span>
            <b>Cobrar o que outra pessoa comprou</b>
            <span className="gf-note" style={{ display: 'block', margin: 0 }}>
              Gastos com "Quem comprou" diferente de "Eu" (ex.: Ana) entram aqui pelo valor inteiro. Um Pix recebido
              dela, marcado como reembolso na importação do extrato, dá baixa nas mais antigas.
            </span>
          </span>
        </label>
      </section>

      {byPerson.map((p) => (
        <section className="gf-card" key={p.name}>
          <h2 className="gf-section-title">
            <span>{p.name} <small>{formatBRL(p.total)}</small></span>
            <button type="button" className="gf-btn-ghost" onClick={() => markPaid(p.items, true, `Tudo de ${p.name} marcado como recebido`)}>
              Recebi tudo
            </button>
          </h2>
          <div className="gf-plain-list">
            {p.items.map((c) => (
              <div className="gf-tx" key={c.key} style={{ gridTemplateColumns: '1fr auto auto' }}>
                <div className="gf-tx-main">
                  <div className="gf-tx-title">{c.description}</div>
                  <div className="gf-tx-meta">
                    <span>{formatDateBR(c.date)}</span>
                    {c.source === 'subscription' && <span className="gf-pill is-fixed">assinatura</span>}
                    {c.source === 'buyer' && <span className="gf-pill is-person">comprou</span>}
                  </div>
                </div>
                <div className="gf-tx-amt">{formatBRL(c.amount)}</div>
                <button type="button" className="gf-btn-ghost" onClick={() => markPaid([c], true, 'Marcado como recebido')}>Recebi</button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {paid.length > 0 && (
        <section className="gf-card">
          <h2 className="gf-section-title">
            Já recebidas <small>{paid.length}</small>
            <button type="button" className="gf-btn-ghost" onClick={() => setShowPaid(!showPaid)} aria-expanded={showPaid}>
              {showPaid ? 'Esconder' : 'Mostrar'}
            </button>
          </h2>
          {showPaid && (
            <div className="gf-plain-list">
              {paid.slice(0, 50).map((c) => (
                <div className="gf-tx" key={c.key} style={{ gridTemplateColumns: '1fr auto auto' }}>
                  <div className="gf-tx-main">
                    <div className="gf-tx-title">{c.description}</div>
                    <div className="gf-tx-meta"><span>{c.person} · {formatDateBR(c.date)}</span></div>
                  </div>
                  <div className="gf-tx-amt" style={{ color: 'var(--ink-3)' }}>{formatBRL(c.amount)}</div>
                  <button type="button" className="gf-btn-ghost" onClick={() => markPaid([c], false, 'Voltou para pendente')}>Desfazer</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
