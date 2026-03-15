<!-- Use this file to provide workspace-specific custom instructions to Copilot. -->

# Gestor Financeiro - Instruções do Projeto

## Visão Geral
Progressive Web App (PWA) para controle financeiro pessoal com gastos, assinaturas, previsões e relatórios.

## Estrutura do Projeto
- `public/` - Arquivos estáticos (HTML, manifest, service worker)
- `src/` - Código React
  - `components/` - Componentes React (Dashboard, Forms, Charts)
  - `utils/` - Funções utilitárias (storage, cálculos)
  - `App.js` - Componente principal
  - `index.css` - Estilos globais (Tailwind)

## Tecnologias
- React 18 com Hooks
- Tailwind CSS para estilização
- Recharts para gráficos
- localStorage para persistência
- PWA (Service Worker, Manifest)

## Dados Armazenados
- **expenses**: Gastos variáveis com { id, amount, category, description, date }
- **subscriptions**: Assinaturas com { id, name, amount, frequency, active }
- **categories**: Categorias de gastos com { id, name, color, icon }

## Como Adicionar Features
1. Tudo persiste em localStorage automaticamente via `storage.js`
2. Disparar eventos: `window.dispatchEvent(new Event('expenseAdded'))`
3. Componentes re-renderizam ao listener dos eventos
4. Gráficos usam Recharts com dados transformados

## Próximas Melhorias
- Importar dados (JSON/CSV)
- Sincronização com nuvem
- Modo escuro
- Notificações
