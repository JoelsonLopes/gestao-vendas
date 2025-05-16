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

- [ ] **Dividir por domínio:** Criar arquivos em `server/storage/` para cada domínio:
  - `user.storage.ts`
  - `region.storage.ts`
  - `client.storage.ts`
  - `product.storage.ts`
  - `order.storage.ts`
  - `discount.storage.ts`
  - `stats.storage.ts`
- [ ] **Interfaces por domínio:** Ex: `IUserStorage`, `IClientStorage`, etc.
- [ ] **Index centralizador:** `storage/index.ts` exportando um objeto agregador.
- [ ] **Reaproveitar lógica comum:** Funções utilitárias para validação, tratamento de erros, etc.
- [ ] **Documentar métodos** (JSDoc).
- [ ] **Testes unitários** (se possível).

---

### 3. Refatoração de `routes.ts`

- [ ] **Dividir por domínio:** Criar arquivos em `server/routes/`:
  - `user.routes.ts`
  - `region.routes.ts`
  - `client.routes.ts`
  - `product.routes.ts`
  - `order.routes.ts`
  - `discount.routes.ts`
  - `stats.routes.ts`
  - `notification.routes.ts`
- [ ] **Usar Router do Express:** Cada arquivo exporta um `Router`.
- [ ] **Index centralizador:** `routes/index.ts` importa e registra todos os routers.
- [ ] **Separar middlewares e validações** por domínio.
- [ ] **Documentar endpoints** (JSDoc ou Swagger).

---

### 4. Garantia de Funcionamento

- [ ] Testar manualmente todos os endpoints após refatoração.
- [ ] Rodar testes automatizados (se existirem).
- [ ] Comparar respostas antes/depois para garantir compatibilidade.

---

### 5. Manutenção e Evolução

- [ ] Atualizar README/documentação do projeto.
- [ ] Sugerir criação de testes automatizados se não existirem.
- [ ] Sugerir uso de linter/formatter para padronização.

---

## Estrutura Sugerida Pós-Refatoração

```
server/
  storage/
    user.storage.ts
    region.storage.ts
    client.storage.ts
    product.storage.ts
    order.storage.ts
    discount.storage.ts
    stats.storage.ts
    index.ts
  routes/
    user.routes.ts
    region.routes.ts
    client.routes.ts
    product.routes.ts
    order.routes.ts
    discount.routes.ts
    stats.routes.ts
    notification.routes.ts
    index.ts
  controllers/
  services/
  middlewares/
  infra/
```

---

## Observações

- **Prioridade:** Começar pelos domínios mais críticos (User, Client, Product, Order).
- **Retrocompatibilidade:** Garantir que a API não quebre para o frontend.
- **Testes:** Validar cada etapa antes de avançar para o próximo domínio.

---

## Próximos Passos

1. Confirmar entendimento e prioridades.
2. Iniciar refatoração por domínio.
3. Testar e validar.
4. Iterar para os próximos domínios. 