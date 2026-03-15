# Gestor Financeiro 💳

Uma Progressive Web App (PWA) moderna para controle financeiro pessoal, permitindo rastrear gastos, gerir assinaturas e prever despesas futuras.

## ✨ Funcionalidades

- **Dashboard**: Visão geral com resumo de gastos do mês atual e próximo
- **Gestão de Gastos**: Adicionar, categorizar e visualizar gastos variáveis
- **Gestão de Assinaturas**: Controlar mensalidades e anuidades
- **Previsão de Gastos**: Gráficos com tendências para os próximos 6 meses
- **Relatórios**: Análise detalhada com gráficos por categoria
- **Exportação**: Exporte seus dados em JSON ou CSV
- **PWA**: Funciona offline e pode ser instalada no celular/desktop

## 🚀 Como Começar

### Pré-requisitos
- Node.js 14+
- npm ou yarn

### Instalação

1. **Clone ou extraia o projeto**
```bash
cd c:\Workspace\pagamentos
```

2. **Instale as dependências**
```bash
npm install
```

3. **Inicie o servidor de desenvolvimento**
```bash
npm start
```

O app abrirá automaticamente em `http://localhost:3000`

## 🎯 Funcionalidades Principais

### 📊 Dashboard
Visualize rapidamente:
- Gasto total do mês atual
- Previsão para o próximo mês
- Total de gastos históricos
- Total de assinaturas
- Gráfico de tendência
- Gastos recentes

### 💰 Gastos
- Adicionar gastos com valor, categoria, data e descrição
- Filtrar por período (todos, este mês, últimos 30 dias)
- Deletar gastos
- Categorias pré-definidas com emojis

### 🔄 Assinaturas
- Gerenciar assinaturas mensais e anuidades
- Ativar/desativar assinaturas
- Visualizar totais mensais e anuais
- Resumo de custos recorrentes

### 📈 Previsão
- Gráficos de previsão para 6 meses
- Breakdown por tipo (gastos variáveis, mensalidades, anuidades)
- Distribuição em pizza chart
- Seleção de mês e ano

### 📋 Relatórios
- Análise detalhada de um período específico
- Gráficos por categoria
- Exportação em JSON
- Exportação em CSV
- Comparação (previsto vs realizado)

## 💾 Armazenamento

Todos os dados são armazenados **localmente** no seu navegador usando localStorage. Seus dados:
- ✅ Nunca saem do seu dispositivo
- ✅ Persistem entre sessões
- ✅ Podem ser exportados a qualquer momento

## 📱 PWA (Progressive Web App)

### Para Instalar
- **Desktop**: Clique no ícone no endereço da barra do navegador (Chrome/Edge)
- **Mobile**: Abra o menu e selecione "Instalar app"

### Benefícios
- Funciona offline
- Acesso rápido como um app nativo
- Sincronização automática

## 🛠️ Tecnologias

- **React 18**: Framework UI
- **Recharts**: Visualização de dados
- **Tailwind CSS**: Estilização
- **Lucide React**: Ícones
- **date-fns**: Manipulação de datas
- **PWA**: Service Worker para offline

## 📦 Build para Produção

```bash
npm run build
```

A pasta `build` estará pronta para deploy em qualquer servidor estático (Vercel, Netlify, GitHub Pages, etc).

## 🔒 Privacidade

Este app não coleta, armazena ou envia seus dados para servidores. Tudo é processado e armazenado localmente.

## 📄 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── Dashboard.js
│   ├── ExpenseForm.js
│   ├── ExpenseList.js
│   ├── SubscriptionManager.js
│   ├── ForecastChart.js
│   └── Reports.js
├── utils/
│   └── storage.js      # Funções de armazenamento local
├── App.js              # Componente principal
├── index.js            # Entry point
└── index.css           # Estilos globais
```

## 🐛 Troubleshooting

**P: Meus dados desapareceram!**  
R: localStorage é limpo se você limpar o cache do navegador. Sempre exporte seus dados!

**P: Service Worker não funciona**  
R: Service Workers só funcionam em HTTPS (ou localhost em desenvolvimento)

**P: Posso sincronizar entre dispositivos?**  
R: Atualmente não, mas você pode exportar de um e importar em outro (futura feature)

## 📈 Roadmap Futuro

- [ ] Importar dados (JSON/CSV)
- [ ] Sincronização com Google Drive/OneDrive
- [ ] Múltiplas carteiras
- [ ] Orçamentos/Limites
- [ ] Notificações de assinaturas
- [ ] Gráficos mais avançados
- [ ] Modo escuro
- [ ] Multi-idiomas

## 📝 Licença

Livre para uso pessoal e comercial.

## 👤 Autor

Desenvolvido com ❤️ para organização financeira pessoal.

---

**Dica**: Comece adicionando suas assinaturas (Netflix, Spotify, etc) e depois seus gastos do mês. A previsão será calculada automaticamente!
