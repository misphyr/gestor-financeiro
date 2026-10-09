import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Home as HomeIcon, BarChart3, List, Settings, Plus,
  Repeat, ArrowDownLeft, Users, Tag, FileText, Upload, CreditCard, Wallet, Palette
} from 'lucide-react';
import Home from './components/redesign/Home';
import Forecast from './components/redesign/Forecast';
import Transactions from './components/redesign/Transactions';
import QuickAdd from './components/redesign/QuickAdd';
import Subscriptions from './components/redesign/settings/Subscriptions';
import Incomes from './components/redesign/settings/Incomes';
import Charges from './components/redesign/settings/Charges';
import Categories from './components/redesign/settings/Categories';
import Reports from './components/redesign/settings/Reports';
import Import from './components/redesign/settings/Import';
import Card from './components/redesign/settings/Card';
import Appearance from './components/redesign/settings/Appearance';
import Installments, { InstallmentSheet, purchaseOf } from './components/redesign/settings/Installments';
import { parseLocalDate } from './utils/date';
import { takePendingStorageError } from './utils/storage';
import { applyTheme, watchSystemTheme } from './utils/theme';
import { currentPeriod, MONTHS, statementOf, viewMode } from './utils/finance';

const TABS = [
  { id: 'home', label: 'Início', Icon: HomeIcon },
  { id: 'forecast', label: 'Previsão', Icon: BarChart3 },
  { id: 'list', label: 'Lançamentos', Icon: List },
  { id: 'settings', label: 'Ajustes', Icon: Settings }
];

const SETTINGS_PAGES = [
  { id: 'card', label: 'Cartão e fatura', hint: 'Dia de fechamento e meses por fatura', Icon: Wallet, Component: Card },
  { id: 'subscriptions', label: 'Assinaturas e contas fixas', hint: 'Netflix, aluguel, academia', Icon: Repeat, Component: Subscriptions },
  { id: 'incomes', label: 'Entradas', hint: 'Salário e rendas recorrentes', Icon: ArrowDownLeft, Component: Incomes },
  { id: 'charges', label: 'Cobranças', hint: 'Quem te deve e o que já foi pago', Icon: Users, Component: Charges },
  { id: 'installments', label: 'Compras parceladas', hint: 'Quanto falta pagar e editar a compra inteira', Icon: CreditCard, Component: Installments },
  { id: 'categories', label: 'Categorias', hint: 'Nomes, cores e ícones', Icon: Tag, Component: Categories },
  { id: 'reports', label: 'Relatórios', hint: 'Exportar PDF e CSV', Icon: FileText, Component: Reports },
  { id: 'import', label: 'Importar CSV', hint: 'Fatura do cartão Nubank', Icon: Upload, Component: Import },
  { id: 'appearance', label: 'Aparência', hint: 'Tema claro, escuro ou do sistema', Icon: Palette, Component: Appearance }
];

const DATA_EVENTS = ['expenseAdded', 'subscriptionAdded', 'incomeAdded', 'categoryAdded'];

export default function App() {
  const [tab, setTab] = useState('home');
  const [monthOffset, setMonthOffset] = useState(0);
  const [settingsPage, setSettingsPage] = useState(null);
  const [sheet, setSheet] = useState(null); // null | { editing }
  const [purchase, setPurchase] = useState(null);
  const [toast, setToast] = useState('');
  const [, setDataVersion] = useState(0);
  const toastTimer = useRef(null);
  const lastBackPress = useRef(0);
  const navRef = useRef({});

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // Telas novas leem do storage a cada render; os eventos só pedem um novo render.
  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1);
    DATA_EVENTS.forEach((name) => window.addEventListener(name, bump));
    return () => DATA_EVENTS.forEach((name) => window.removeEventListener(name, bump));
  }, []);

  useEffect(() => {
    const onStorageError = () => {
      if (!takePendingStorageError()) return;
      setToast('Não consegui gravar no banco do celular. Seus dados estão na cópia local e o app tenta de novo a cada alteração.');
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 6000);
    };
    onStorageError(); // falha ao abrir o app, antes desta tela existir
    window.addEventListener('storageError', onStorageError);
    return () => window.removeEventListener('storageError', onStorageError);
  }, []);

  navRef.current = { tab, settingsPage, sheet, purchase };

  useEffect(() => {
    let remove = null;
    const stopWatchingTheme = watchSystemTheme();
    (async () => {
      await applyTheme();
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const listener = await CapApp.addListener('backButton', () => {
          const current = navRef.current;
          if (current.purchase) { setPurchase(null); return; }
          if (current.sheet) { setSheet(null); return; }
          if (current.settingsPage) { setSettingsPage(null); return; }
          if (current.tab !== 'home') { setTab('home'); return; }
          const now = Date.now();
          if (now - lastBackPress.current < 2000) {
            CapApp.exitApp();
          } else {
            lastBackPress.current = now;
            showToast('Toque voltar de novo para sair');
          }
        });
        remove = () => listener.remove();
      } catch {
        // Navegador: sem botão voltar nativo
      }
    })();
    return () => { if (remove) remove(); stopWatchingTheme(); };
  }, [showToast]);

  const today = new Date();
  // Mês 0 = o atual: a fatura aberta (visão por fatura) ou o mês do calendário.
  const base = currentPeriod(today);
  const viewed = new Date(base.year, base.month + monthOffset, 1);
  const year = viewed.getFullYear();
  const month = viewed.getMonth();
  const showMonthNav = tab === 'home' || tab === 'list';

  const goTab = (id) => {
    setTab(id);
    setSettingsPage(null);
    window.scrollTo(0, 0);
  };

  // calendar: lançamentos que não seguem a fatura (entradas, Pix/dinheiro).
  const onSaved = (message, dateStr, { calendar: onlyCalendar = false } = {}) => {
    setSheet(null);
    showToast(message);
    if (dateStr) {
      const d = parseLocalDate(dateStr);
      const target = viewMode() === 'statement' && !onlyCalendar ? statementOf(dateStr) : { year: d.getFullYear(), month: d.getMonth() };
      setMonthOffset((target.year - base.year) * 12 + target.month - base.month);
    }
    if (tab === 'forecast' || tab === 'settings') goTab('home');
  };

  const openEdit = (entry) => setSheet({ editing: entry.raw });
  const page = SETTINGS_PAGES.find((p) => p.id === settingsPage);

  return (
    <>
      <div className="gf-app">
        <header className="gf-topbar">
          {page ? (
            <button type="button" className="gf-back" onClick={() => setSettingsPage(null)}>
              <ChevronLeft size={20} /> Ajustes
            </button>
          ) : (
            <span className="gf-screen-label">{TABS.find((t) => t.id === tab).label}</span>
          )}
          {showMonthNav && (
            <div className="gf-month-nav">
              <button type="button" className="gf-icon-btn" aria-label="Mês anterior" onClick={() => setMonthOffset((o) => o - 1)}>
                <ChevronLeft size={18} />
              </button>
              <h1>{MONTHS[month]}{year !== today.getFullYear() ? ` ${String(year).slice(2)}` : ''}</h1>
              <button type="button" className="gf-icon-btn" aria-label="Próximo mês" onClick={() => setMonthOffset((o) => o + 1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          {page && <span className="gf-screen-label">{page.label}</span>}
        </header>

        <main>
          {tab === 'home' && (
            <Home
              year={year}
              month={month}
              onOpenList={() => goTab('list')}
              onOpenCharges={() => { setTab('settings'); setSettingsPage('charges'); }}
              onOpenReports={() => { setTab('settings'); setSettingsPage('reports'); }}
              onSelect={openEdit}
            />
          )}
          {tab === 'forecast' && <Forecast />}
          {tab === 'list' && <Transactions year={year} month={month} onSelect={openEdit} />}
          {tab === 'settings' && !page && (
            <nav className="gf-card gf-menu" aria-label="Ajustes">
              {SETTINGS_PAGES.map(({ id, label, hint, Icon }) => (
                <button type="button" key={id} onClick={() => { setSettingsPage(id); window.scrollTo(0, 0); }}>
                  <Icon size={20} color="var(--accent)" />
                  <span>{label}<small>{hint}</small></span>
                  <ChevronRight size={18} color="var(--ink-3)" />
                </button>
              ))}
            </nav>
          )}
          {tab === 'settings' && page && <page.Component onToast={showToast} onOpenSettings={(id) => { setSettingsPage(id); window.scrollTo(0, 0); }} />}
        </main>
      </div>

      <nav className="gf-tabbar" aria-label="Navegação">
        <div className="gf-tabbar-inner">
          {TABS.slice(0, 2).map(({ id, label, Icon }) => (
            <button type="button" key={id} className="gf-tab" aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}>
              <Icon size={22} strokeWidth={1.8} />{label}
            </button>
          ))}
          <button type="button" className="gf-fab" aria-label="Adicionar lançamento" onClick={() => setSheet({ editing: null })}>
            <Plus size={26} strokeWidth={2.4} />
          </button>
          {TABS.slice(2).map(({ id, label, Icon }) => (
            <button type="button" key={id} className="gf-tab" aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}>
              <Icon size={22} strokeWidth={1.8} />{label}
            </button>
          ))}
        </div>
      </nav>

      {sheet && (
        <QuickAdd
          key={sheet.editing?.id || 'new'}
          editing={sheet.editing}
          onClose={() => setSheet(null)}
          onSaved={onSaved}
          onEditPurchase={(expense) => { setSheet(null); setPurchase(purchaseOf(expense) || null); }}
        />
      )}

      {purchase && (
        <InstallmentSheet
          purchase={purchase}
          onClose={() => setPurchase(null)}
          onDone={(message) => { setPurchase(null); showToast(message); }}
        />
      )}

      {toast && <div className="gf-toast" role="status">{toast}</div>}
    </>
  );
}
