# Plano de Refatoração: `storage.ts` e `routes.ts`

## Objetivo
Refatorar os arquivos para:
- Melhorar legibilidade, manutenção e testabilidade
- Seguir princípios SOLID, Clean Code e boas práticas
- Manter funcionamento atual (retrocompatibilidade)

---

## Checklist de Refatoração

### 1. Diagnóstico Atual
- [x] Leitura completa de `storage.ts` (1341 linhas)
- [x] Leitura completa de `routes.ts` (1552 linhas)
- [x] Mapeamento de métodos, endpoints e responsabilidades

---

### 2. Refatoração de `storage.ts`

- [x] **Dividir por domínio:** Criar arquivos em `server/storage/` para cada domínio:
  - [x] `user.storage.ts`
  - [x] `region.storage.ts`
  - [x] `client.storage.ts`
  - [x] `product.storage.ts`
  - [x] `order.storage.ts`
  - [x] `discount.storage.ts`
  - [x] `stats.storage.ts`
  - [x] `clientHistory.storage.ts`
  - [x] `session.store.ts`
- [x] **Interfaces por domínio:** Ex: `IUserStorage`, `IClientStorage`, etc.
- [x] **Index centralizador:** `storage/index.ts` exportando um objeto agregador.
- [x] **Reaproveitar lógica comum:** Funções utilitárias para validação, tratamento de erros, etc. (parcialmente, pode evoluir)
- [ ] **Documentar métodos** (JSDoc).
- [ ] **Testes unitários** (se possível).
- [x] **Excluir storage.ts antigo após migração total**

---

### 3. Refatoração de `routes.ts`

- [x] **Dividir por domínio:** Criar arquivos em `server/routes/`:
  - [x] `user.routes.ts`
  - [x] `region.routes.ts`
  - [x] `client.routes.ts`
  - [x] `product.routes.ts`
  - [x] `order.routes.ts`
  - [x] `discount.routes.ts`
  - [x] `stats.routes.ts`
  - [x] `notification.routes.ts`
- [x] **Usar Router do Express:** Cada arquivo exporta um `Router`.
- [x] **Index centralizador:** `routes/index.ts` importa e registra todos os routers.
- [x] **Separar middlewares e validações** por domínio.
- [x] **Documentar endpoints** (JSDoc ou Swagger).

#### **Exclusão total de `routes.ts`:**
- [x] Migrar o setup de autenticação, websocket e notification para o bootstrap do servidor (`infra/server.ts`)
- [x] Remover a dependência de `registerRoutes` no ponto de entrada do servidor
- [x] Deletar `routes.ts` após migração completa

---

### 4. Garantia de Funcionamento

- [x] Testar manualmente todos os endpoints após refatoração dos storages.
- [ ] Rodar testes automatizados (se existirem).
- [x] Comparar respostas antes/depois para garantir compatibilidade.

---

### 5. Manutenção e Evolução

- [ ] Atualizar README/documentação do projeto.
- [ ] Sugerir criação de testes automatizados se não existirem.
- [ ] Sugerir uso de linter/formatter para padronização.

---

## Observações

- **Status:**  
  - Refatoração dos storages concluída e 100% modularizada.
  - `storage.ts` removido com sucesso.
  - Rotas de domínio modularizadas e centralizadas.
  - Setup de autenticação, websocket e notification migrados para o bootstrap do servidor (`infra/server.ts`).
  - `routes.ts` removido do projeto.
  - Sistema testado manualmente e funcionando normalmente.
- **Próximos passos sugeridos:**  
  - Rodar testes automatizados (se existirem).
  - Atualizar README/documentação.
  - Evoluir middlewares, controllers e testes conforme necessário.
  - Manter retrocompatibilidade e boas práticas.

---

## Próximos Passos

1. [ ] Rodar testes automatizados (se existirem).
2. [ ] Atualizar README/documentação do projeto.
3. [ ] Sugerir/implementar linter e formatter para padronização.
4. [ ] Evoluir middlewares, controllers e testes conforme necessário.
5. [ ] Documentar métodos e endpoints (JSDoc/Swagger). 