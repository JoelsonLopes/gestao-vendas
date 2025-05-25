# 🚀 PROMPT: Sistema de Gestão de Vendas - Next.js + Supabase

## 📋 CONTEXTO DO PROJETO

Você deve criar um **Sistema de Gestão de Vendas** completo, moderno e escalável, seguindo rigorosamente os princípios **SOLID**, **Clean Code** e **melhores práticas de desenvolvimento**.

### 🎯 OBJETIVO
Reconstruir um sistema de gestão comercial existente usando tecnologias modernas, com foco em:
- **Arquitetura limpa e escalável**
- **Segurança robusta**
- **UX/UI excepcional**
- **Performance otimizada**
- **Manutenibilidade alta**

---

## 🛠️ STACK TECNOLÓGICA OBRIGATÓRIA

### **Frontend & Fullstack**
- ✅ **Next.js 14** (App Router + Server Components)
- ✅ **TypeScript** (configuração rigorosa)
- ✅ **Shadcn/ui** (sistema de componentes)
- ✅ **Tailwind CSS** (estilização)
- ✅ **React Hook Form** + **Zod** (validação)
- ✅ **TanStack Query** (gerenciamento de estado)

### **Backend & Database**
- ✅ **Supabase** (banco + auth + real-time)
- ✅ **Prisma** (ORM type-safe)
- ✅ **NextAuth.js** (autenticação)

### **Ferramentas de Qualidade**
- ✅ **ESLint** + **Prettier** (formatação)
- ✅ **Husky** + **lint-staged** (pre-commits)
- ✅ **Jest** + **Testing Library** (testes)
- ✅ **Playwright** (E2E)
- ✅ **Storybook** (documentação de componentes)

---

## 🏗️ ARQUITETURA OBRIGATÓRIA (CLEAN ARCHITECTURE)

### **Estrutura de Pastas**
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rotas auth
│   ├── (dashboard)/              # Grupo de rotas protegidas
│   ├── api/                      # API Routes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # Componentes UI
│   ├── ui/                       # Shadcn components
│   ├── forms/                    # Formulários específicos
│   ├── charts/                   # Componentes de gráficos
│   └── layout/                   # Layout components
├── lib/                          # Utilities & Config
│   ├── db/                       # Database config
│   ├── auth/                     # Auth config
│   ├── utils/                    # Utilities
│   ├── validations/              # Zod schemas
│   └── constants/                # Constantes
├── hooks/                        # Custom hooks
├── stores/                       # Zustand stores
├── types/                        # TypeScript types
├── services/                     # Business logic layer
│   ├── user-service.ts
│   ├── client-service.ts
│   ├── order-service.ts
│   └── ...
├── repositories/                 # Data access layer
│   ├── user-repository.ts
│   ├── client-repository.ts
│   └── ...
└── use-cases/                    # Application business rules
    ├── user/
    ├── client/
    └── order/
```

### **Princípios SOLID Aplicados**

#### **1. Single Responsibility Principle (SRP)**
- Cada service tem uma única responsabilidade
- Componentes fazem apenas uma coisa
- Hooks específicos para cada funcionalidade

#### **2. Open/Closed Principle (OCP)**
- Interfaces para abstrair implementações
- Componentes extensíveis via props
- Estratégias de autenticação plugáveis

#### **3. Liskov Substitution Principle (LSP)**
- Interfaces consistentes entre implementações
- Polimorfismo em services

#### **4. Interface Segregation Principle (ISP)**
- Interfaces específicas e focadas
- Props de componentes bem definidas

#### **5. Dependency Inversion Principle (DIP)**
- Injeção de dependências
- Abstrações para dados externos

---

## 📊 FUNCIONALIDADES OBRIGATÓRIAS

### **🔐 Autenticação & Autorização**
- Login/registro com email/senha
- Autenticação social (Google, GitHub)
- Perfis: `admin` | `representative`
- Aprovação de representantes por admins
- Proteção de rotas por permissão
- Sessões persistentes

### **👥 Gestão de Usuários**
- CRUD completo de usuários
- Aprovação/rejeição de representantes
- Vinculação usuário ↔ região
- Histórico de ações
- Avatar upload

### **🏢 Gestão de Clientes**
- CRUD completo de clientes
- Importação em massa (CSV/Excel)
- Vinculação cliente ↔ representante ↔ região
- Validação de CNPJ
- Histórico de interações
- Busca avançada

### **📦 Gestão de Produtos**
- CRUD completo de produtos
- Códigos únicos e códigos de barras
- Categorias e marcas
- Produtos equivalentes/conversões
- Controle de estoque
- Busca inteligente
- Importação em massa

### **💰 Gestão de Vendas**
- Formulário de pedidos complexo
- Status: cotação ↔ confirmado
- Cálculo automático (subtotal, desconto, impostos, total)
- Múltiplos produtos por pedido
- Descontos configuráveis
- Condições de pagamento
- Comissões por representante

### **📍 Gestão de Regiões**
- CRUD de regiões
- Vinculação representante ↔ região
- Relatórios por região

### **📊 Dashboard & Relatórios**
- Indicadores em tempo real
- Gráficos interativos (vendas, clientes, produtos)
- Relatórios exportáveis (PDF, Excel)
- Filtros avançados por período/região/representante
- Metas e performance

### **🔔 Notificações & Real-time**
- Notificações em tempo real (Supabase Realtime)
- Novos pedidos, aprovações, etc.
- Email notifications (Resend/SendGrid)
- Toast notifications

### **⚙️ Configurações & Admin**
- Painel administrativo
- Configurações do sistema
- Gerenciamento de descontos
- Backup/restauração
- Logs de auditoria

---

## 🔒 REQUISITOS DE SEGURANÇA OBRIGATÓRIOS

### **Autenticação Robusta**
- Senhas hasheadas (bcrypt)
- JWT tokens seguros
- Rate limiting em login
- Bloqueio por tentativas excessivas
- MFA opcional (TOTP)

### **Autorização Granular**
- RBAC (Role-Based Access Control)
- Middleware de proteção
- Validação server-side
- Sanitização de inputs

### **Proteção de Dados**
- Validação rigorosa (Zod)
- SQL injection prevention
- XSS protection
- CSRF tokens
- Headers de segurança

### **Monitoramento**
- Logs estruturados
- Auditoria de ações críticas
- Alertas de segurança
- Error tracking (Sentry)

---

## 🎨 REQUISITOS DE UI/UX

### **Design System**
- Shadcn/ui como base
- Tema customizado (dark/light)
- Componentes acessíveis (ARIA)
- Responsive design (mobile-first)
- Animações fluidas (Framer Motion)

### **Performance**
- Server Components por padrão
- Lazy loading de componentes
- Otimização de imagens (Next.js Image)
- Caching inteligente
- Bundle analysis

### **Acessibilidade**
- WCAG 2.1 AA compliance
- Navegação por teclado
- Screen reader support
- Contraste adequado
- Focus management

---

## 📝 PADRÕES DE CÓDIGO OBRIGATÓRIOS

### **Nomenclatura**
- **PascalCase**: Componentes, Types, Interfaces
- **camelCase**: Funções, variáveis, métodos
- **kebab-case**: Arquivos, URLs
- **SCREAMING_SNAKE_CASE**: Constantes

### **Estrutura de Componentes**
```typescript
// components/ui/button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  children,
  ...props 
}: ButtonProps) {
  // Implementação
}
```

### **Services (Business Logic)**
```typescript
// services/client-service.ts
export class ClientService {
  constructor(
    private clientRepository: ClientRepository,
    private userService: UserService
  ) {}

  async createClient(data: CreateClientData): Promise<Client> {
    // Validação de business rules
    // Chamada ao repository
    // Return result
  }

  async getClientsByRepresentative(userId: string): Promise<Client[]> {
    // Lógica específica
  }
}
```

### **Use Cases**
```typescript
// use-cases/client/create-client-use-case.ts
export class CreateClientUseCase {
  constructor(private clientService: ClientService) {}

  async execute(data: CreateClientData): Promise<Result<Client, Error>> {
    try {
      // Validações
      // Business rules
      // Delegation to service
      return Success(client)
    } catch (error) {
      return Failure(error)
    }
  }
}
```

### **Error Handling**
```typescript
// Resultado tipado para operações
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E }

// Custom errors
export class BusinessRuleError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}
```

---

## 🗄️ ESQUEMA DE BANCO (Supabase)

### **Tabelas Obrigatórias**
```sql
-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'representative');
CREATE TYPE order_status AS ENUM ('cotacao', 'confirmado');

-- Users (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'representative',
  active BOOLEAN NOT NULL DEFAULT true,
  approved BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  region_id INTEGER REFERENCES regions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regions
CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  representative_id UUID REFERENCES profiles(id),
  region_id INTEGER REFERENCES regions(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT,
  category TEXT,
  brand TEXT,
  conversion TEXT,
  conversion_brand TEXT,
  equivalent_brands JSONB,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discounts
CREATE TABLE discounts (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  commission DECIMAL(5,2) NOT NULL
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  representative_id UUID NOT NULL REFERENCES profiles(id),
  status order_status NOT NULL DEFAULT 'cotacao',
  payment_terms TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  taxes DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_id INTEGER REFERENCES discounts(id),
  discount_percentage DECIMAL(5,2),
  commission DECIMAL(5,2),
  subtotal DECIMAL(10,2) NOT NULL
);

-- Client History
CREATE TABLE client_history (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Row Level Security (RLS)**
```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas de exemplo
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Representatives can only see their clients" ON clients
  FOR SELECT USING (
    representative_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 🧪 REQUISITOS DE TESTES

### **Testes Unitários (Jest)**
- Services e use-cases
- Utilities e helpers
- Custom hooks
- Cobertura mínima: 80%

### **Testes de Integração**
- API routes
- Database operations
- Auth flows

### **Testes E2E (Playwright)**
- Fluxos críticos de usuário
- Login/logout
- Criar pedido completo
- Importação de dados

### **Testes de Componentes**
- Testing Library
- Interações do usuário
- Estados de loading/error

---

## 📚 DOCUMENTAÇÃO OBRIGATÓRIA

### **README.md Completo**
- Setup do projeto
- Comandos disponíveis
- Estrutura de pastas
- Como contribuir

### **API Documentation**
- OpenAPI/Swagger
- Exemplos de requests/responses
- Error codes

### **Storybook**
- Todos os componentes UI
- Variações e estados
- Design tokens

---

## 🚀 CRITÉRIOS DE ACEITAÇÃO

### **Funcional**
- ✅ Todas as funcionalidades implementadas
- ✅ Fluxos de usuário completos
- ✅ Responsividade perfeita
- ✅ Performance otimizada (Core Web Vitals)

### **Técnico**
- ✅ TypeScript sem erros
- ✅ ESLint/Prettier configurados
- ✅ Testes passando
- ✅ Build sem warnings
- ✅ Lighthouse score 90+

### **Segurança**
- ✅ Autenticação robusta
- ✅ Autorização granular
- ✅ Validação server-side
- ✅ Headers de segurança

### **Code Quality**
- ✅ Princípios SOLID aplicados
- ✅ Clean Code principles
- ✅ DRY (Don't Repeat Yourself)
- ✅ Comentários quando necessário
- ✅ Abstrações bem definidas

---

## 🎯 ENTREGÁVEIS ESPERADOS

1. **Projeto Next.js configurado** com todas as dependências
2. **Design system** completo com Shadcn/ui
3. **Banco Supabase** estruturado com RLS
4. **Autenticação** completa com NextAuth
5. **Todas as funcionalidades** implementadas
6. **Testes** configurados e funcionando
7. **Documentação** completa
8. **Deploy** configurado (Vercel + Supabase)

---

## 🔄 METODOLOGIA DE DESENVOLVIMENTO

### **Abordagem Incremental**
1. **Setup inicial** - Configuração base
2. **Auth system** - Autenticação e autorização
3. **CRUD básico** - Uma entidade por vez
4. **Business logic** - Regras complexas
5. **UI/UX polish** - Refinamento visual
6. **Performance** - Otimizações
7. **Testes** - Cobertura completa
8. **Deploy** - Produção

### **Padrão de Commits**
```
feat: adicionar autenticação com NextAuth
fix: corrigir validação de CNPJ
refactor: extrair lógica de cálculo para service
test: adicionar testes para ClientService
docs: atualizar README com setup
style: formatar código com Prettier
```

---

## ⚡ INSTRUÇÕES FINAIS

1. **Siga RIGOROSAMENTE** os princípios SOLID e Clean Code
2. **Implemente TODAS** as funcionalidades listadas
3. **Mantenha** consistência de código
4. **Documente** decisões arquiteturais
5. **Teste** cada funcionalidade
6. **Otimize** para performance
7. **Garanta** acessibilidade
8. **Priorize** segurança

**Resultado esperado:** Sistema de gestão de vendas profissional, escalável, seguro e maintível, pronto para produção.

---

*Prompt criado com base na análise do sistema atual e melhores práticas de desenvolvimento moderno.* 