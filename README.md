# Sistema de Gestão de Vendas

> **Controle total de vendas, clientes e equipes em uma plataforma moderna e acessível.**

---

## Descrição Geral

O Sistema de Gestão de Vendas é uma solução completa para pequenas e médias empresas, representantes comerciais e equipes de vendas que buscam eficiência, organização e performance. Com interface intuitiva, recursos avançados e foco em acessibilidade, o sistema centraliza o controle de pedidos, clientes, produtos, usuários, regiões e relatórios em um só lugar.

---

## Principais Funcionalidades

- Gestão de vendas e pedidos
- Cadastro e gerenciamento de clientes
- Controle de produtos e estoque
- Dashboard com indicadores e gráficos
- Relatórios exportáveis e detalhados
- Gestão de usuários e permissões (admin/representante)
- Gerenciamento de regiões e representantes
- Processamento de pagamentos (Stripe)
- Autenticação segura (Passport.js)
- Interface responsiva e acessível (WCAG)

---

## Tecnologias Utilizadas

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- Radix UI (componentes acessíveis)
- React Query
- Wouter (roteamento)
- Recharts (gráficos)
- React Hook Form + Zod

**Backend:**
- Node.js + Express + TypeScript
- Drizzle ORM
- PostgreSQL
- Passport.js (autenticação)
- WebSocket

**Ferramentas de Desenvolvimento:**
- Vite
- ESBuild
- Drizzle Kit
- Cypress (testes E2E)

---

## Público-alvo

- Pequenas e médias empresas
- Representantes comerciais
- Equipes de vendas e gestores

---

## Instalação e Configuração

### Pré-requisitos
- Node.js (LTS)
- PostgreSQL
- NPM ou Yarn

### Passos

1. Clone o repositório:
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd gestao-vendas
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz com:
   ```env
   DATABASE_URL=sua_url_do_banco
   SESSION_SECRET=seu_secret
   ```
4. Execute as migrações do banco:
   ```bash
   npm run db:push
   ```
5. Inicie o sistema:
   - Desenvolvimento: `npm run dev`
   - Produção: `npm run build` e `npm run start`

---

## Estrutura do Projeto

```
gestao-vendas/
├── client/           # Frontend React
├── server/           # Backend Express
├── shared/           # Código compartilhado
├── cypress/          # Testes E2E
├── dist/             # Build de produção
└── backups/          # Backups do banco de dados
```

---

## Autenticação e Segurança
- Login local com sessões persistentes
- Controle de acesso por perfil (admin/representante)
- Proteção de rotas sensíveis
- Variáveis de ambiente para dados sensíveis

---

## Acessibilidade
- Componentes acessíveis (Radix UI)
- Verificador de contraste e recursos WCAG
- Interface responsiva e navegação por teclado

---

## Testes
- Testes end-to-end com Cypress
- Para rodar:
  ```bash
  npm run cypress:open
  ```

---

## Contribuição

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NomeDaFeature`)
3. Commit suas mudanças seguindo o padrão de commits
4. Push para a branch (`git push origin feature/NomeDaFeature`)
5. Abra um Pull Request

---

## Licença

Este projeto está sob a licença MIT.

---

## Contato e Suporte

Joelson Lopes · Full Stack Developer  
📞 (51) 99432-5454  
✉️ joelsonlopes.dev@gmail.com

--- 