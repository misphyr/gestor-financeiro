# Gestor Financeiro

App Android (e web) de finanças pessoais: gastos, parcelas, assinaturas, entradas, previsão e
importação da fatura do cartão e do extrato da conta Nubank. Os dados ficam só no aparelho.

## Funcionalidades

- **Início**: sobra do mês, gastos por categoria, quem comprou, cobranças pendentes e aviso de anuidade
- **Cadastro rápido** (botão +): valor com teclado próprio, descrição que sugere a categoria pelo
  histórico, parcelas, dividir com outras pessoas, quem comprou, cartão ou Pix/dinheiro
- **Previsão**: próximos 6 meses (ou faturas), com estimativa dos gastos variáveis
- **Lançamentos**: busca e filtros por categoria e por quem comprou; toque para editar
- **Cartão e fatura**: dia de fechamento e vencimento; os meses podem seguir a fatura, para o total
  bater com o que o banco cobra
- **Assinaturas** mensais e anuais (anuidade entra inteira no mês da renovação)
- **Compras parceladas**: quanto falta pagar e edição da compra inteira
- **Cobranças**: quem te deve em gastos divididos e no que outra pessoa comprou no seu cartão;
  um Pix de reembolso importado do extrato dá baixa nas mais antigas
- **Relatórios** em PDF e CSV (para Excel em português), com filtros de categoria e pessoa
- **Importar CSV** do Nubank (fatura do cartão ou extrato da conta): nomes limpos, categoria sugerida, agrupamento por nome,
  detecção do que já foi importado, Pix como gasto e recebidos como entrada, opção de desfazer
- **Aparência**: tema claro, escuro ou seguindo o celular

## Desenvolvimento

Requisitos: Node 20+. Feito com React 18 + [Vite](https://vitejs.dev) e testes com Vitest.

```bash
npm install
npm start          # abre em http://localhost:3000
npm test           # testes (já rodam no fuso de São Paulo, onde os erros de data aparecem)
npm run build      # gera a pasta build/ (que o Capacitor copia para o app)
```

Para conferir uma fatura real na importação sem colocar o arquivo no projeto:
`$env:CSV_SAMPLE='C:\caminho\fatura.csv'; npm test -- csvImport`.

## APK Android

Requisitos: JDK 21 (`winget install Microsoft.OpenJDK.21`) e Android SDK em `C:\Android\sdk`
(ou defina `ANDROID_HOME`). Depois:

```bat
build.bat
```

O APK sai em `android\app\build\outputs\apk\debug\app-debug.apk`. Para atualizar o app sem perder
os dados, o APK precisa ser assinado com a mesma chave de depuração (`%USERPROFILE%\.android\debug.keystore`)
usada no APK já instalado.

## Estrutura

```
src/
├── App.js                         navegação (abas, botão +, Ajustes)
├── components/redesign/           telas: Home, Forecast, Transactions, QuickAdd, TxList, ui
│   └── settings/                  Ajustes: Card, Subscriptions, Incomes, Charges, Installments,
│                                  Categories, Reports, Import, Appearance
├── styles/app.css                 visual (tokens de cor, modo claro/escuro)
├── index.css                      reset básico de estilos
└── utils/
    ├── storage.js                 banco local: SQLite no Android + cópia no localStorage
    ├── finance.js                 cálculos (mês, fatura, previsão, cobranças, parcelas)
    ├── csvImport.js               leitura e revisão da fatura e do extrato Nubank
    ├── date.js                    datas sempre no fuso local
    ├── exportFile.js              salvar/compartilhar PDF e CSV
    └── theme.js                   tema claro, escuro ou do sistema
```

## Privacidade

Nada é enviado para servidores. Tudo fica no aparelho. Os exemplos nos testes usam nomes e
valores fictícios.

## Aviso

Projeto pessoal, sem ligação com o Nubank. "Nubank" é citado só para indicar o formato dos
arquivos CSV que o app consegue importar.
