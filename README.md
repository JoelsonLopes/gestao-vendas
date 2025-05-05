# Sistema de Gestão de Vendas

Um sistema moderno e completo para gestão de vendas, desenvolvido com tecnologias atuais e boas práticas de desenvolvimento.

## 🚀 Tecnologias

Este projeto utiliza as seguintes tecnologias:

- **Frontend:**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Radix UI (Componentes acessíveis)
  - React Query (Gerenciamento de estado e cache)
  - Wouter (Roteamento)
  - Recharts (Gráficos)
  - React Hook Form (Formulários)
  - Zod (Validação)

- **Backend:**
  - Node.js
  - Express
  - TypeScript
  - Drizzle ORM
  - PostgreSQL
  - Passport.js (Autenticação)
  - WebSocket (Comunicação em tempo real)

- **Ferramentas de Desenvolvimento:**
  - Vite
  - ESBuild
  - TypeScript
  - Drizzle Kit
  - Cypress (Testes)

## 📋 Pré-requisitos

- Node.js (versão LTS recomendada)
- PostgreSQL
- NPM ou Yarn

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd gestao-vendas
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
DATABASE_URL=sua_url_do_banco
SESSION_SECRET=seu_secret
```

4. Execute as migrações do banco de dados:
```bash
npm run db:push
```

## 🚀 Executando o projeto

Para desenvolvimento:
```bash
npm run dev
```

Para build de produção:
```bash
npm run build
```

Para iniciar em produção:
```bash
npm run start
```

## 📁 Estrutura do Projeto

```
gestao-vendas/
├── client/           # Frontend React
├── server/           # Backend Express
├── shared/           # Código compartilhado
├── cypress/          # Testes E2E
├── dist/             # Build de produção
└── backups/          # Backups do banco de dados
```

## 🔐 Autenticação

O sistema utiliza Passport.js para autenticação, com suporte a:
- Login local
- Sessões persistentes
- Proteção de rotas

## 💳 Pagamentos

Integração com Stripe para processamento de pagamentos.

## 📊 Funcionalidades Principais

- Gestão de vendas
- Dashboard com gráficos
- Relatórios exportáveis
- Gestão de usuários
- Processamento de pagamentos
- Interface responsiva e moderna

## 🧪 Testes

O projeto utiliza Cypress para testes end-to-end. Para executar os testes:

```bash
npm run cypress:open
```

## 📝 Licença

Este projeto está sob a licença MIT.

## 👥 Contribuição

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, envie um email para [seu-email@exemplo.com] 