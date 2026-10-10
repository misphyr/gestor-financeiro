<!-- Instruções do projeto para o Copilot. -->

# Gestor Financeiro - Instruções do Projeto

App de finanças pessoais em React 18 + Vite + Capacitor 8 (Android). Componentes usam JSX em arquivos `.js`.

## Regras importantes

- **Datas**: sempre strings `AAAA-MM-DD` no fuso local. Use `src/utils/date.js`
  (`parseLocalDate`, `toDateString`, `todayString`, `addMonths`, `formatDateBR`).
  Nunca `new Date('AAAA-MM-DD')` nem `toISOString().split('T')[0]` (dão o dia errado no Brasil).
- **Dinheiro**: exiba com `formatBRL` (`src/utils/finance.js`). Divida parcelas em centavos.
- **IDs**: use `newId()` de `storage.js`, nunca `Date.now()`.
- **Cálculos** (totais do mês, fatura, previsão, cobranças, parcelas) ficam em `src/utils/finance.js`,
  com testes. Componentes só exibem.
- **Dados** passam por `storage` (`src/utils/storage.js`); depois de alterar, dispare
  `window.dispatchEvent(new Event('expenseAdded'))` (ou `subscriptionAdded`, `incomeAdded`,
  `categoryAdded`) para as telas atualizarem.
- **Visual**: classes `gf-*` e tokens de cor em `src/styles/app.css`. Textos da interface em português.

## Dados (storage)

- `expenses`: { id, amount, category, description, date, installmentNumber, totalInstallments,
  originalDate, isShared, sharedWith[], person?, paidWith? ('other' = Pix/dinheiro), importRef?, importBatch? }
- `subscriptions`: { id, name, amount, frequency ('monthly' | 'annual'), category, startDate, canceledDate,
  isShared, sharedWith[] }
- `incomes`: { id, amount, type, description, date, isRecurring, frequency, baseDate }
- `categories`: { id, name, color, icon }
- `chargesPaid`: { [chave da cobrança]: true }
- `settings`: { card: { closingDay, dueDay }, viewMode: 'calendar' | 'statement', theme: 'system' | 'light' | 'dark', ownAccounts: [nomes], chargeBuyers: boolean, personAliases: { 'nome no extrato': pessoa } }

## Testes

`npm test` (Vitest; o fuso de São Paulo já vem de `src/test-setup.js`). Arquivos `*.test.js` em `src/utils/`.
