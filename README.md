# Aucta CRM

Sistema de CRM desenvolvido pela Aucta, construído com React, TypeScript, Vite e Supabase.

## 🚀 Tecnologias

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Roteamento**: React Router DOM
- **Estado**: Context API + Hooks customizados
- **Drag & Drop**: @dnd-kit
- **Icons**: Heroicons

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── auth/           # Componentes de autenticação
│   ├── layout/         # Componentes de layout
│   └── index.ts        # Exportações centralizadas
├── contexts/           # Contextos React (Auth, etc.)
├── hooks/              # Hooks customizados
├── pages/              # Páginas da aplicação
├── routes/             # Configuração de rotas
├── services/           # Serviços de API
├── types/              # Definições de tipos TypeScript
├── utils/              # Utilitários e constantes
└── styles/             # Estilos globais
```

## 🏗️ Arquitetura

O projeto segue os princípios de arquitetura definidos em `ARCHITECTURE.md`:

- **Componentização Extrema**: Componentes pequenos e focados
- **SRP (Single Responsibility)**: Cada módulo tem uma responsabilidade única
- **DRY (Don't Repeat Yourself)**: Reutilização máxima de código
- **SSOT (Single Source of Truth)**: Supabase como fonte única de dados
- **KISS (Keep It Simple)**: Soluções simples e diretas

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase
- Extensão "Tailwind CSS IntelliSense" no VS Code

### Instalação

1. Clone o repositório
```bash
git clone <repository-url>
cd Aucta-CRM
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. Execute o projeto
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## 📋 Funcionalidades Implementadas

### ✅ Fase 1 - Fundação e Autenticação
- [x] Projeto Vite + React + TypeScript
- [x] Configuração do Supabase
- [x] Sistema de autenticação completo
- [x] Telas de Login e Cadastro
- [x] Layout principal responsivo
- [x] Context API para estado global
- [x] Sistema de rotas protegidas
- [x] Validação de formulários
- [x] Tipagem completa TypeScript

### 🔄 Próximas Fases
- [ ] Gestão de Usuários e Permissões
- [ ] Funil de Vendas (Kanban)
- [ ] Gestão de Leads e Clientes
- [ ] Tarefas e Atividades
- [ ] Agenda e Calendário
- [ ] Orçamentos e Propostas
- [ ] Chat/WhatsApp Integration
- [ ] Assistente de IA
- [ ] Relatórios e Dashboard

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Executa em modo desenvolvimento
npm run build        # Gera build de produção
npm run preview      # Preview do build
npm run lint         # Executa o linter
```

## 📚 Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Princípios de arquitetura
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Plano de implementação
- [PRD.md](./PRD.md) - Product Requirements Document

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e pertence à Aucta.

## 👥 Equipe

- Desenvolvido com ❤️ pela equipe Aucta

## 🛠️ Configuração do Ambiente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar Supabase
Crie um arquivo `.env` baseado no `.env.example` com suas credenciais do Supabase.

### 3. Configurar VS Code
O projeto já inclui configurações do VS Code na pasta `.vscode/`:
- **settings.json:** Configurações específicas do projeto
- **extensions.json:** Extensões recomendadas
- **css_custom_data.json:** Definições customizadas para Tailwind CSS

**Extensões recomendadas:**
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Prettier - Code formatter
- ESLint

## 🎨 Solução de Problemas Comuns

### ❌ Erro "Unknown at rule @tailwind"

Se você ver este erro no arquivo `src/index.css`, siga estes passos:

1. **Instale a extensão Tailwind CSS IntelliSense:**
   - Abra o VS Code
   - Vá em Extensions (Ctrl+Shift+X)
   - Procure por "Tailwind CSS IntelliSense"
   - Instale a extensão oficial da Tailwind Labs

2. **Recarregue o VS Code:**
   - Pressione `Ctrl+Shift+P`
   - Digite "Developer: Reload Window"

3. **Verifique as configurações:**
   As configurações já estão incluídas em `.vscode/settings.json` e devem resolver automaticamente o problema.

### 🔄 Cache do VS Code
Se o problema persistir, limpe o cache do VS Code:
```bash
# Feche o VS Code e execute:
rm -rf ~/.vscode/extensions/bradlc.vscode-tailwindcss-*/
# Reinstale a extensão
```

## 📱 Responsividade

O projeto é totalmente responsivo com breakpoints:
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px  
- **Desktop:** > 1024px
