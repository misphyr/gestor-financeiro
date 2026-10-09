import React, { useEffect, useState } from 'react';
import { formatBRL, knownBuyers, knownPeople, ME } from '../../utils/finance';

// Painel inferior com fundo escurecido; fecha com Esc ou tocando fora.
export function Sheet({ label, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="gf-scrim" onClick={onClose} />
      <div className="gf-sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="gf-grabber" />
        {children}
      </div>
    </>
  );
}

// Campo de valor com máscara de centavos: digitar 2350 mostra R$ 23,50.
export function MoneyInput({ id, cents, onChange }) {
  return (
    <input
      id={id}
      className="gf-input"
      inputMode="numeric"
      value={cents ? formatBRL(cents / 100) : ''}
      placeholder="R$ 0,00"
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
        onChange(Number(digits || 0));
      }}
    />
  );
}

// Escolha de pessoas para dividir um gasto: chips das já usadas + campo para nova.
export function PeoplePicker({ selected, onChange }) {
  const [newName, setNewName] = useState('');
  const known = knownPeople();
  selected.forEach((p) => { if (!known.includes(p)) known.push(p); });

  const toggle = (name) => onChange(selected.includes(name) ? selected.filter((p) => p !== name) : [...selected, name]);
  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (!selected.includes(name)) onChange([...selected, name]);
    setNewName('');
  };

  return (
    <div>
      {known.length > 0 && (
        <div className="gf-chips" style={{ marginBottom: 8 }}>
          {known.map((name) => (
            <button type="button" key={name} className="gf-chip" aria-pressed={selected.includes(name)} onClick={() => toggle(name)}>{name}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="gf-input"
          placeholder="Nome da pessoa"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" className="gf-btn-ghost" onClick={add}>Adicionar</button>
      </div>
    </div>
  );
}

// Botão de exclusão que pede um segundo toque para confirmar.
export function ConfirmButton({ label, confirmLabel = 'Toque de novo para confirmar', onConfirm, className = 'gf-btn-danger' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmLabel : label}
    </button>
  );
}

export const sharedWithFrom = (names, makeId) => (names.length
  ? [{ id: makeId(), name: 'Eu', isMe: true }, ...names.map((name) => ({ id: makeId(), name, isMe: false }))]
  : []);

export const namesFromSharedWith = (sharedWith) => (sharedWith || []).filter((p) => !p.isMe && p.name?.trim()).map((p) => p.name.trim());

// "Quem comprou": uma pessoa só. null = o próprio usuário ("Eu"); undefined = nenhuma marcada (grupo misturado).
export function BuyerPicker({ value, onChange, idPrefix = 'buyer', extraNames = [] }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const names = knownBuyers();
  [...extraNames, value].forEach((n) => { if (n && !names.includes(n)) names.push(n); });

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    onChange(name.toLowerCase() === ME.toLowerCase() ? null : name);
    setNewName('');
    setAdding(false);
  };

  return (
    <div>
      <div className="gf-chips">
        <button type="button" className="gf-chip" aria-pressed={value === null} onClick={() => onChange(null)}>{ME}</button>
        {names.map((name) => (
          <button type="button" key={name} className="gf-chip" aria-pressed={value === name} onClick={() => onChange(name)}>{name}</button>
        ))}
        {!adding && <button type="button" className="gf-chip" onClick={() => setAdding(true)}>+ Outra pessoa</button>}
      </div>
      {adding && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            id={`${idPrefix}-new`}
            className="gf-input"
            placeholder="Ana, Pedro, Carla…"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <button type="button" className="gf-btn-ghost" onClick={add}>Usar</button>
        </div>
      )}
    </div>
  );
}
