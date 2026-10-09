import React, { useState } from 'react';
import { storage } from '../../../utils/storage';
import { applyTheme, themeSetting } from '../../../utils/theme';

const OPTIONS = [
  ['system', 'Sistema', 'Segue o tema claro ou escuro do celular.'],
  ['light', 'Claro', 'Sempre claro, mesmo com o celular no escuro.'],
  ['dark', 'Escuro', 'Sempre escuro. Cansa menos a vista à noite.']
];

export default function Appearance({ onToast }) {
  const [theme, setTheme] = useState(themeSetting());

  const choose = (value) => {
    setTheme(value);
    storage.settings.update({ theme: value });
    applyTheme(value);
    onToast(`Tema: ${OPTIONS.find(([v]) => v === value)[1].toLowerCase()}`);
  };

  return (
    <div className="gf-stack">
      <section className="gf-card gf-stack-sm">
        <h2 className="gf-section-title" style={{ margin: 0 }}>Tema</h2>
        <div className="gf-seg" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {OPTIONS.map(([value, label]) => (
            <button type="button" key={value} aria-pressed={theme === value} onClick={() => choose(value)}>{label}</button>
          ))}
        </div>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>{OPTIONS.find(([v]) => v === theme)[2]}</p>
      </section>
    </div>
  );
}
