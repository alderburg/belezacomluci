# 🚀 Plano Completo: Transformação Whitelabel Multi-Tenant

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Fluxo de Cadastro e Landing Page](#fluxo-de-cadastro-e-landing-page)
3. [Fase 0: Landing Page, Cadastro e Login Centralizado](#fase-0-landing-page-cadastro-e-login-centralizado)
4. [Fase 1: Fundação do Banco de Dados](#fase-1-fundação-do-banco-de-dados)
5. [Fase 2: Sistema de Autenticação Multi-Tenant](#fase-2-sistema-de-autenticação-multi-tenant)
6. [Fase 3: Refatoração do Backend](#fase-3-refatoração-do-backend)
7. [Fase 4: Atualização do Frontend](#fase-4-atualização-do-frontend)
8. [Fase 5: Sistema de Domínios](#fase-5-sistema-de-domínios)
9. [Fase 6: Features Específicas](#fase-6-features-específicas)
10. [Fase 7: Testes e Deploy](#fase-7-testes-e-deploy)
11. [Checklist Geral](#checklist-geral)

---

## Visão Geral

### O que é Tenant?
**Tenant** = Espaço de trabalho isolado para cada influencer/marca

**Exemplo:**
- `belezacomluci.minhainfluencer.com` → Tenant da Luci
- `mariabeauty.minhainfluencer.com` → Tenant da Maria
- Cada um com seus próprios vídeos, cupons, comunidade, etc.

### Tempo Estimado
- **Implementação Completa**: 4-6 semanas
- **MVP Funcional**: 2-3 semanas
- **Proof of Concept**: 1 semana

### Estrutura de Domínios
```
Domínio Principal: minhainfluencer.com
├── Landing Page & Cadastro: minhainfluencer.com
│   ├── / (página inicial)
│   ├── /cadastro (criar conta + escolher subdomínio)
│   ├── /login (redireciona para subdomínio)
│   └── /sobre, /precos, etc.
│
├── Subdomínios: *.minhainfluencer.com
│   ├── luci.minhainfluencer.com → App da Luci
│   ├── maria.minhainfluencer.com → App da Maria
│   └── joao.minhainfluencer.com → App do João
│
└── Domínios Customizados (opcional):
    ├── belezacomluci.com.br → CNAME → proxy
    └── mariabeauty.com → CNAME → proxy
```

---

## Fluxo de Cadastro e Landing Page

### 🎯 Como Funciona o Cadastro Centralizado

**Passo 1: Usuário acessa o site principal**
```
https://minhainfluencer.com
```
- Landing page com informações sobre a plataforma
- Botão "Criar Minha Conta"

**Passo 2: Página de cadastro**
```
https://minhainfluencer.com/cadastro
```
- Formulário pede:
  - ✅ Nome completo
  - ✅ Email
  - ✅ Senha
  - ✅ **Nome do subdomínio** (ex: "luci")
  - ✅ Nome da marca/negócio (ex: "Beleza com Luci")

**Passo 3: Sistema valida o subdomínio**
- Verifica se "luci" está disponível
- Mostra preview: `luci.minhainfluencer.com`
- Valida se não tem caracteres inválidos

**Passo 4: Sistema cria o tenant**
- Cria registro em `tenants` com subdomínio "luci"
- Cria o usuário
- Vincula usuário como "owner" do tenant
- Cria subdomínio automaticamente

**Passo 5: Redirecionamento automático**
```
Redireciona para: https://luci.minhainfluencer.com
```
- Usuário já está logado
- Cai direto no dashboard do seu espaço
- Pronto para configurar!

### 🏗️ Estrutura Técnica

```
minhainfluencer.com (Domínio principal)
└── Hospeda a landing page + cadastro
    ├── Frontend: React (páginas públicas)
    ├── Backend: Express (mesma API)
    └── Detecção: Se não tem subdomínio → mostra landing

luci.minhainfluencer.com (Subdomínio do tenant)
└── Hospeda o app completo da Luci
    ├── Frontend: Todo o app (vídeos, cupons, etc)
    ├── Backend: Mesma API (filtra por tenant)
    └── Detecção: Tem subdomínio → mostra app
```

**TUDO no mesmo servidor!** 
- Mesma aplicação Express
- Mesmo código React
- Middleware detecta se é landing ou app

---

# Fase 0: Landing Page, Cadastro e Login Centralizado

**Duração**: 3-5 dias  
**Complexidade**: 🟡 Média

### ✅ Tarefa 0.1: Criar Rota de Login no Domínio Principal

**Arquivo**: `server/routes.ts`

```typescript
// ✅ NOVO: Login especial no domínio principal (apenas para admins)
app.post("/api/auth/login-admin", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    // 2. Verificar senha
    const isMatch = await crypto.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    // 3. Verificar se é owner ou admin em algum tenant
    const membership = await db.query.tenantMembers.findFirst({
      where: (members, { and, eq, or }) => 
        and(
          eq(members.userId, user.id),
          or(
            eq(members.role, 'owner'),
            eq(members.role, 'admin')
          ),
          eq(members.status, 'active')
        ),
      with: {
        tenant: true
      }
    });

    if (!membership) {
      return res.status(403).json({ 
        message: "Apenas administradores podem fazer login aqui. Membros devem acessar o subdomínio do influencer." 
      });
    }

    // 4. Fazer login e retornar subdomínio
    req.login({ 
      ...user, 
      tenantId: membership.tenantId, 
      role: membership.role 
    }, (err) => {
      if (err) return next(err);

      res.json({ 
        success: true,
        redirectUrl: `https://${membership.tenant.subdomain}.minhainfluencer.com`,
        tenant: {
          id: membership.tenant.id,
          slug: membership.tenant.slug,
          subdomain: membership.tenant.subdomain,
          displayName: membership.tenant.displayName,
        }
      });
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
```

---

### ✅ Tarefa 0.2: Criar Página de Login no Frontend (Domínio Principal)

**Arquivo**: `client/src/pages/admin-login-page.tsx` (NOVO)

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiRequest('/api/auth/login-admin', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      // Redirecionar para o subdomínio do admin
      window.location.href = data.redirectUrl;
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao fazer login',
        description: error.message || 'Verifique suas credenciais',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Login Administrativo
          </h1>
          <p className="text-muted-foreground">
            Acesse seu painel de controle
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Não tem uma conta?{' '}
            <a href="/cadastro" className="text-primary hover:underline">
              Crie seu espaço
            </a>
          </p>
          <p className="mt-2">
            É membro de uma comunidade?{' '}
            <span className="text-foreground">
              Faça login no subdomínio do influencer
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

---

### ✅ Tarefa 0.3: Atualizar Router para Incluir Login Admin

**Arquivo**: Seu arquivo de rotas do React Router

```typescript
// Adicionar rota para login administrativo
import AdminLoginPage from '@/pages/admin-login-page';

// No router:
{
  path: '/login',
  element: <AdminLoginPage />
}
```

---

## Fase 1: Fundação do Banco de Dados

**Duração**: 1-2 semanas  
**Complexidade**: 🔴 Muito Alta

## 1.1 Criar Novas Tabelas

### ✅ Tarefa 1.1.1: Adicionar Tabela `tenants`

**Arquivo**: `shared/schema.ts`

```typescript
// ========== MULTI-TENANT SYSTEM ==========

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Identificação
  slug: text("slug").notNull().unique(), // "belezacomluci"
  displayName: text("display_name").notNull(), // "Beleza com Luci"

  // Domínios
  subdomain: text("subdomain").notNull().unique(), // "belezacomluci"
  customDomain: text("custom_domain"), // "belezacomluci.com.br"

  // Plano e Status
  plan: text("plan").notNull().default("free"), // 'free', 'pro', 'enterprise'
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'trial'

  // Configurações personalizadas (JSON)
  settings: json("settings").default({
    branding: {
      primaryColor: "#ff6b9d",
      logoUrl: null,
      faviconUrl: null
    },
    limits: {
      maxVideos: 100,
      maxUsers: 1000,
      maxStorage: 5368709120 // 5GB em bytes
    },
    features: {
      gamificationEnabled: true,
      customDomainEnabled: false,
      analyticsEnabled: true
    }
  }),

  // Metadados
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  lastActiveAt: timestamp("last_active_at"),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  displayName: z.string().min(1).max(100),
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
```

---

### ✅ Tarefa 1.1.2: Adicionar Tabela `tenant_members`

**Arquivo**: `shared/schema.ts`

```typescript
export const tenantMembers = pgTable("tenant_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),

  role: text("role").notNull().default("member"), // 'owner', 'admin', 'editor', 'member'
  status: text("status").notNull().default("active"), // 'active', 'pending', 'suspended'

  invitedBy: varchar("invited_by").references(() => users.id),
  lastActiveAt: timestamp("last_active_at"),

  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => {
  return {
    uniqueMembership: unique("unique_tenant_user").on(table.tenantId, table.userId),
    tenantIdx: index("idx_tenant_members_tenant").on(table.tenantId),
    userIdx: index("idx_tenant_members_user").on(table.userId),
  };
});

export const insertTenantMemberSchema = createInsertSchema(tenantMembers).omit({ 
  id: true, 
  createdAt: true 
});

export type TenantMember = typeof tenantMembers.$inferSelect;
export type InsertTenantMember = z.infer<typeof insertTenantMemberSchema>;
```

---

### ✅ Tarefa 1.1.3: Adicionar Tabela `tenant_invitations`

**Arquivo**: `shared/schema.ts`

```typescript
export const tenantInvitations = pgTable("tenant_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),

  email: text("email").notNull(),
  role: text("role").notNull().default("member"),

  invitedBy: varchar("invited_by").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),

  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),

  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => {
  return {
    tenantIdx: index("idx_invitations_tenant").on(table.tenantId),
    emailIdx: index("idx_invitations_email").on(table.email),
  };
});

export const insertTenantInvitationSchema = createInsertSchema(tenantInvitations).omit({ 
  id: true, 
  createdAt: true,
  token: true,
});

export type TenantInvitation = typeof tenantInvitations.$inferSelect;
export type InsertTenantInvitation = z.infer<typeof insertTenantInvitationSchema>;
```

---

### ✅ Tarefa 1.1.4: Adicionar Tabela `tenant_domains`

**Arquivo**: `shared/schema.ts`

```typescript
export const tenantDomains = pgTable("tenant_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),

  domain: text("domain").notNull().unique(), // "belezacomluci.com.br"
  type: text("type").notNull(), // 'subdomain', 'custom'

  isPrimary: boolean("is_primary").default(false),

  // Verificação de domínio customizado
  verificationToken: text("verification_token"),
  verifiedAt: timestamp("verified_at"),

  // SSL
  sslStatus: text("ssl_status").default("pending"), // 'pending', 'active', 'failed'
  sslIssuedAt: timestamp("ssl_issued_at"),

  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => {
  return {
    tenantIdx: index("idx_domains_tenant").on(table.tenantId),
  };
});

export const insertTenantDomainSchema = createInsertSchema(tenantDomains).omit({ 
  id: true, 
  createdAt: true,
  verificationToken: true,
});

export type TenantDomain = typeof tenantDomains.$inferSelect;
export type InsertTenantDomain = z.infer<typeof insertTenantDomainSchema>;
```

---

### ✅ Tarefa 1.1.5: Adicionar Relations

**Arquivo**: `shared/schema.ts`

```typescript
// Tenant Relations
export const tenantRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  invitations: many(tenantInvitations),
  domains: many(tenantDomains),
  videos: many(videos),
  products: many(products),
  coupons: many(coupons),
  posts: many(posts),
}));

export const tenantMemberRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantMembers.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [tenantMembers.userId], references: [users.id] }),
  invitedByUser: one(users, { fields: [tenantMembers.invitedBy], references: [users.id] }),
}));

export const tenantInvitationRelations = relations(tenantInvitations, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantInvitations.tenantId], references: [tenants.id] }),
  invitedByUser: one(users, { fields: [tenantInvitations.invitedBy], references: [users.id] }),
}));

export const tenantDomainRelations = relations(tenantDomains, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantDomains.tenantId], references: [tenants.id] }),
}));
```

---

## 1.2 Adicionar `tenantId` em TODAS as Tabelas Existentes

### ✅ Tarefa 1.2.1: Modificar Tabela `users`

**Arquivo**: `shared/schema.ts`

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // ADICIONAR ESTE CAMPO
  // Nota: userId não tem tenantId direto, mas sim via tenant_members
  // Removemos isAdmin (será substituído por role em tenant_members)

  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),

  // ... resto dos campos permanecem iguais

  // REMOVER ESTE CAMPO (será migrado para tenant_members.role)
  // isAdmin: boolean("is_admin").default(false), // ❌ DELETAR

  createdAt: timestamp("created_at").default(sql`now()`),
});
```

**⚠️ IMPORTANTE**: 
- `users` NÃO recebe `tenantId` diretamente
- Um usuário pode pertencer a múltiplos tenants via `tenant_members`
- O campo `isAdmin` será substituído por `role` em `tenant_members`

---

### ✅ Tarefa 1.2.2: Adicionar `tenantId` nas Tabelas de Conteúdo

**Arquivo**: `shared/schema.ts`

Para **CADA UMA** destas tabelas, adicionar o campo `tenantId`:

```typescript
// Lista de TODAS as tabelas que precisam de tenantId:
// ✅ videos
// ✅ products
// ✅ coupons
// ✅ banners
// ✅ categories
// ✅ popups
// ✅ posts
// ✅ comments
// ✅ comment_likes
// ✅ comment_replies
// ✅ saved_posts
// ✅ post_likes
// ✅ post_tags
// ✅ notifications
// ✅ user_notifications
// ✅ notification_settings
// ✅ missions
// ✅ user_missions
// ✅ user_points
// ✅ rewards
// ✅ user_rewards
// ✅ raffles
// ✅ raffle_entries
// ✅ raffle_winners
// ✅ achievements
// ✅ user_achievements
// ✅ analytics_targets
// ✅ page_views
// ✅ bio_clicks
// ✅ share_settings
// ✅ referrals
// ✅ subscriptions
// ✅ api_settings
// ✅ video_progress
// ✅ video_likes
// ✅ user_activity
```

**Exemplo para `videos`:**

```typescript
export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // ✅ ADICIONAR ESTE CAMPO NO INÍCIO
  tenantId: varchar("tenant_id")
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  // ... resto dos campos

  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => {
  return {
    // ✅ ADICIONAR ÍNDICE
    tenantIdx: index("idx_videos_tenant").on(table.tenantId),
  };
});
```

**Repetir para TODAS as 37 tabelas listadas acima!**

---

### ✅ Tarefa 1.2.3: Atualizar Constraints de Unicidade

Tabelas com campos `unique` precisam se tornar `unique` por tenant:

```typescript
// ANTES:
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull().unique(), // ❌ Global
  // ...
});

// DEPOIS:
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(), // Remove .unique()
  // ...
}, (table) => {
  return {
    tenantIdx: index("idx_categories_tenant").on(table.tenantId),
    // ✅ ADICIONAR unique constraint composto
    uniqueTitlePerTenant: unique("unique_category_title_per_tenant").on(table.tenantId, table.title),
  };
});
```

**Aplicar em:**
- `categories.title`
- `coupons.code` (código único por tenant)
- Qualquer outro campo com `.unique()`

---

### ✅ Tarefa 1.2.4: Sincronizar Schema com Banco

**Comando:**
```bash
npm run db:push --force
```

**⚠️ ATENÇÃO**: Este comando vai tentar alterar o banco de dados. **FAÇA BACKUP ANTES!**

---

## 1.3 Migração de Dados Existentes

### ✅ Tarefa 1.3.1: Criar Tenant Default

**Arquivo**: `server/migrations/create-default-tenant.ts` (NOVO)

```typescript
import { db } from '../db';
import { tenants, tenantMembers, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function createDefaultTenant() {
  console.log('🔄 Criando tenant default...');

  // 1. Criar tenant "Beleza com Luci"
  const [defaultTenant] = await db.insert(tenants).values({
    slug: 'belezacomluci',
    displayName: 'Beleza com Luci',
    subdomain: 'belezacomluci',
    plan: 'enterprise',
    status: 'active',
  }).returning();

  console.log('✅ Tenant criado:', defaultTenant.id);

  // 2. Buscar o admin atual (primeiro usuário ou o com is_admin = true)
  const adminUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.isAdmin, true) // Se ainda existe
  });

  if (!adminUser) {
    throw new Error('❌ Nenhum usuário admin encontrado!');
  }

  // 3. Adicionar admin como owner do tenant
  await db.insert(tenantMembers).values({
    tenantId: defaultTenant.id,
    userId: adminUser.id,
    role: 'owner',
    status: 'active',
  });

  console.log('✅ Admin vinculado ao tenant');

  return defaultTenant;
}
```

**Executar:**
```typescript
// Em server/index.ts, adicionar temporariamente:
import { createDefaultTenant } from './migrations/create-default-tenant';

// Executar UMA VEZ na inicialização
const runOnce = async () => {
  const defaultTenant = await createDefaultTenant();
  console.log('✅ Tenant default criado:', defaultTenant);
};

runOnce().catch(console.error);
```

---

### ✅ Tarefa 1.3.2: Preencher `tenantId` em Todas as Tabelas

**Arquivo**: `server/migrations/backfill-tenant-id.ts` (NOVO)

```typescript
import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function backfillTenantId() {
  console.log('🔄 Preenchendo tenantId em todas as tabelas...');

  // Buscar o ID do tenant default
  const defaultTenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.slug, 'belezacomluci')
  });

  if (!defaultTenant) {
    throw new Error('❌ Tenant default não encontrado!');
  }

  const tenantId = defaultTenant.id;

  // Lista de TODAS as tabelas que precisam de tenantId
  const tables = [
    'videos',
    'products',
    'coupons',
    'banners',
    'categories',
    'popups',
    'posts',
    'comments',
    'comment_likes',
    'comment_replies',
    'saved_posts',
    'post_likes',
    'post_tags',
    'notifications',
    'user_notifications',
    'notification_settings',
    'missions',
    'user_missions',
    'user_points',
    'rewards',
    'user_rewards',
    'raffles',
    'raffle_entries',
    'raffle_winners',
    'achievements',
    'user_achievements',
    'analytics_targets',
    'page_views',
    'bio_clicks',
    'share_settings',
    'referrals',
    'subscriptions',
    'api_settings',
    'video_progress',
    'video_likes',
    'user_activity',
  ];

  for (const table of tables) {
    try {
      const result = await db.execute(
        sql`UPDATE ${sql.identifier(table)} SET tenant_id = ${tenantId} WHERE tenant_id IS NULL`
      );
      console.log(`✅ ${table}: ${result.rowCount} linhas atualizadas`);
    } catch (error) {
      console.error(`❌ Erro em ${table}:`, error);
    }
  }

  console.log('✅ Backfill concluído!');
}
```

**Executar:**
```bash
# Adicionar script em package.json:
"scripts": {
  "migrate:backfill": "tsx server/migrations/backfill-tenant-id.ts"
}

# Executar:
npm run migrate:backfill
```

---

### ✅ Tarefa 1.3.3: Migrar Campo `isAdmin` para `tenant_members.role`

**Arquivo**: `server/migrations/migrate-admin-to-role.ts` (NOVO)

```typescript
import { db } from '../db';
import { tenantMembers, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function migrateAdminToRole() {
  console.log('🔄 Migrando isAdmin para tenant_members.role...');

  // Buscar tenant default
  const defaultTenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.slug, 'belezacomluci')
  });

  if (!defaultTenant) throw new Error('Tenant default não encontrado');

  // Buscar todos os usuários
  const allUsers = await db.query.users.findMany();

  for (const user of allUsers) {
    // Verificar se já existe membership
    const existingMember = await db.query.tenantMembers.findFirst({
      where: (members, { and, eq }) => 
        and(
          eq(members.tenantId, defaultTenant.id),
          eq(members.userId, user.id)
        )
    });

    if (!existingMember) {
      // Criar membership baseado em isAdmin
      const role = user.isAdmin ? 'owner' : 'member';

      await db.insert(tenantMembers).values({
        tenantId: defaultTenant.id,
        userId: user.id,
        role,
        status: 'active',
      });

      console.log(`✅ ${user.email}: ${role}`);
    }
  }

  console.log('✅ Migração concluída!');
}
```

---

## 1.4 Checklist Fase 1

- [ ] 1.1.1: Tabela `tenants` criada
- [ ] 1.1.2: Tabela `tenant_members` criada
- [ ] 1.1.3: Tabela `tenant_invitations` criada
- [ ] 1.1.4: Tabela `tenant_domains` criada
- [ ] 1.1.5: Relations adicionadas
- [ ] 1.2.1: Tabela `users` modificada (remover `isAdmin`)
- [ ] 1.2.2: `tenantId` adicionado em todas as 37 tabelas
- [ ] 1.2.3: Constraints de unicidade atualizados
- [ ] 1.2.4: Schema sincronizado (`npm run db:push --force`)
- [ ] 1.3.1: Tenant default criado
- [ ] 1.3.2: `tenantId` preenchido em todas as tabelas
- [ ] 1.3.3: `isAdmin` migrado para `role`
- [ ] Backup do banco feito antes das mudanças ✅

---

# Fase 2: Sistema de Autenticação Multi-Tenant

**Duração**: 1-2 semanas  
**Complexidade**: 🔴 Muito Alta

## 2.1 Middleware de Resolução de Tenant

### ✅ Tarefa 2.1.1: Criar Middleware `resolveTenant`

**Arquivo**: `server/middleware/resolveTenant.ts` (NOVO)

```typescript
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { tenants, tenantDomains } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Estender tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        displayName: string;
        plan: string;
        settings: any;
      };
    }
  }
}

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const hostname = req.hostname; // "belezacomluci.minhainfluencer.com"

    let tenant = null;

    // 1. Tentar por domínio customizado
    const customDomain = await db.query.tenantDomains.findFirst({
      where: (domains, { and, eq }) => 
        and(
          eq(domains.domain, hostname),
          eq(domains.type, 'custom')
        ),
      with: {
        tenant: true
      }
    });

    if (customDomain) {
      tenant = customDomain.tenant;
    }

    // 2. Tentar por subdomínio
    if (!tenant) {
      const subdomain = hostname.split('.')[0]; // "belezacomluci"

      // Apenas se NÃO for o domínio principal
      if (subdomain !== 'minhainfluencer' && subdomain !== 'www') {
        tenant = await db.query.tenants.findFirst({
          where: (tenants, { eq }) => eq(tenants.subdomain, subdomain)
        });
      }
    }

    // 3. Fallback: query param (desenvolvimento)
    if (!tenant && req.query.tenant) {
      tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.slug, req.query.tenant as string)
      });
    }

    // 4. Fallback: tenant default (desenvolvimento local)
    if (!tenant && (hostname === 'localhost' || hostname.includes('repl.co'))) {
      tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.slug, 'belezacomluci')
      });
    }

    if (!tenant) {
      return res.status(404).json({ 
        message: 'Tenant não encontrado',
        hostname 
      });
    }

    // Verificar se tenant está ativo
    if (tenant.status !== 'active') {
      return res.status(403).json({ 
        message: 'Tenant suspenso ou inativo' 
      });
    }

    // Anexar tenant ao request
    req.tenant = tenant;

    next();
  } catch (error) {
    console.error('Erro ao resolver tenant:', error);
    res.status(500).json({ message: 'Erro ao resolver tenant' });
  }
}
```

---

### ✅ Tarefa 2.1.2: Aplicar Middleware em Todas as Rotas

**Arquivo**: `server/routes.ts`

```typescript
import { resolveTenant } from './middleware/resolveTenant';

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // ✅ ADICIONAR: Resolver tenant em TODAS as rotas
  // Exceção: rotas públicas que não precisam de tenant
  const publicRoutes = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/login-admin' // Rota de login admin
  ];

  // Aplicar middleware de tenant em rotas que não são públicas
  app.use((req, res, next) => {
    if (publicRoutes.includes(req.path)) {
      return next();
    }
    // Ignorar o resolveTenant para rotas de autenticação que podem não ter tenant ainda
    if (req.path.startsWith('/api/auth/') && req.method === 'POST') {
      return next();
    }
    return resolveTenant(req, res, next);
  });

  // ... resto das rotas
}
```

---

## 2.2 Modificar Sistema de Autenticação

### ✅ Tarefa 2.2.1: Atualizar Processo de Login

**Arquivo**: `server/auth.ts`

```typescript
import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, tenantMembers, type User as SelectUser, tenants } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// ✅ MODIFICAR: Interface de usuário autenticado
declare global {
  namespace Express {
    interface User extends SelectUser {
      tenantId?: string; // Tenant ativo na sessão
      role?: string; // Role no tenant ativo
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPLIT_DEV_DOMAIN ? 'beleza-com-luci-secret-key-dev' : (process.env.SESSION_SECRET || 'beleza-com-luci-secret-key'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000, // 24 horas
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...sessionSettings.cookie,
      secure: true,
      sameSite: 'none',
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ✅ MODIFICAR: Estratégia de autenticação
  passport.use(
    new LocalStrategy(
      { 
        usernameField: 'email',
        passReqToCallback: true // Permite acesso ao req
      },
      async (req, email, password, done) => {
        try {
          // 1. Buscar usuário por email
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Email ou senha incorretos" });
          }

          // 2. Verificar senha
          const isMatch = await crypto.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Email ou senha incorretos" });
          }

          // 3. ✅ NOVO: Verificar se usuário pertence ao tenant da requisição (se houver)
          const tenantId = req.tenant?.id;

          if (tenantId) {
            const membership = await db.query.tenantMembers.findFirst({
              where: (members, { and, eq, }) => 
                and(
                  eq(members.userId, user.id),
                  eq(members.tenantId, tenantId),
                  eq(members.status, 'active')
                )
            });

            if (!membership) {
              return done(null, false, { 
                message: "Você não tem acesso a este espaço de trabalho" 
              });
            }

            // 4. ✅ NOVO: Anexar tenantId e role ao usuário
            const userWithTenant = {
              ...user,
              tenantId: tenantId,
              role: membership.role
            };

            return done(null, userWithTenant);
          }

          // Fallback: login normal sem tenant (para rotas públicas)
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // ✅ MODIFICAR: Serialização (salvar na sessão)
  passport.serializeUser((user, done) => {
    done(null, { 
      id: user.id,
      tenantId: user.tenantId, // Pode ser undefined se for login público
      role: user.role        // Pode ser undefined se for login público
    });
  });

  // ✅ MODIFICAR: Desserialização (carregar da sessão)
  passport.deserializeUser(async (sessionData: any, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, sessionData.id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      // Anexar dados do tenant da sessão (se existirem)
      const userWithTenant = {
        ...user,
        tenantId: sessionData.tenantId,
        role: sessionData.role
      };

      done(null, userWithTenant);
    } catch (err) {
      done(err);
    }
  });

  // ✅ MODIFICAR: Rota de registro
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, name, username, createTenant, tenantSlug, tenantName } = req.body;

      // Validação básica
      if (!email || !password || !name || !username) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      // Verificar se email já existe
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      // Criar usuário
      const hashedPassword = await crypto.hash(password);
      const [user] = await db
        .insert(users)
        .values({
          email,
          username,
          name,
          password: hashedPassword,
        })
        .returning();

      // ✅ NOVO: Criar tenant se solicitado
      if (createTenant && tenantSlug && tenantName) {
        // Verificar se o slug do tenant já existe
        const existingTenant = await db.query.tenants.findFirst({
          where: (tenants, { eq }) => eq(tenants.slug, tenantSlug),
        });

        if (existingTenant) {
          return res.status(400).json({ message: "Nome do espaço de trabalho já em uso." });
        }

        const [tenant] = await db.insert(tenants).values({
          slug: tenantSlug,
          displayName: tenantName,
          subdomain: tenantSlug,
          plan: 'free',
          status: 'trial',
        }).returning();

        // Adicionar usuário como owner
        await db.insert(tenantMembers).values({
          tenantId: tenant.id,
          userId: user.id,
          role: 'owner',
          status: 'active',
        });

        // Fazer login automático
        req.login({ ...user, tenantId: tenant.id, role: 'owner' }, (err) => {
          if (err) return next(err);
          res.json({ 
            message: "Usuário e espaço de trabalho criados com sucesso!",
            tenant: {
              id: tenant.id,
              slug: tenant.slug,
              subdomain: tenant.subdomain,
            }
          });
        });
      } else {
        // Registro normal (convite ou sem tenant)
        res.json({ message: "Usuário criado com sucesso! Faça login para continuar." });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Rota de login normal (para subdomínios)
  app.post('/api/auth/login', (req, res, next) => {
    // Se já estiver autenticado e com tenant, redireciona para o tenant
    if (req.isAuthenticated() && req.user?.tenantId) {
      // Assumindo que o objeto 'tenant' está anexado ao req.user pelo resolveTenant
      // e que este foi carregado via deserializeUser. Se não, a lógica precisa ser ajustada.
      // Para simplificar, vamos buscar o subdomínio aqui se não estiver disponível.
      const userTenantId = req.user.tenantId;
      db.query.tenants.findFirst({ where: eq(tenants.id, userTenantId) })
        .then(tenant => {
          if (tenant) {
            res.json({
              success: true,
              redirectUrl: `https://${tenant.subdomain}.minhainfluencer.com`,
            });
          } else {
            // Usuário logado mas tenant não encontrado - situação inesperada
             req.logout((err) => {
               if (err) return next(err);
               res.status(401).json({ message: 'Sessão inválida. Por favor, faça login novamente.' });
             });
          }
        })
        .catch(err => {
           console.error("Erro ao buscar tenant durante login reautenticado:", err);
           res.status(500).json({ message: "Erro interno ao processar sessão." });
        });
      return;
    }

    passport.authenticate('local', (err: any, user: Express.User, info: any) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || 'Falha na autenticação' });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: loginErr.message });
        }

        // Redirecionar para o subdomínio do tenant logado, ou para um dashboard padrão
        const redirectUrl = user.tenantId
          ? `https://${user.tenant.subdomain}.minhainfluencer.com` // Assumindo que tenant está no user
          : '/dashboard'; // Rota padrão se não houver tenant associado

        res.json({ success: true, redirectUrl });
      });
    })(req, res, next);
  });


  // Rota de logout
  app.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: 'Logout bem-sucedido' });
    });
  });
}

export { crypto };
```

---

### ✅ Tarefa 2.2.2: Criar Middleware de Autorização por Tenant

**Arquivo**: `server/middleware/requireTenantRole.ts` (NOVO)

```typescript
import { Request, Response, NextFunction } from 'express';

type TenantRole = 'owner' | 'admin' | 'editor' | 'member';

export function requireTenantRole(minRole: TenantRole = 'member') {
  const roleHierarchy: { [key: string]: number } = {
    owner: 4,
    admin: 3,
    editor: 2,
    member: 1,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // Verificar se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Autenticação necessária" });
    }

    // Verificar se o tenant está presente na requisição
    if (!req.tenant || !req.tenant.id) {
      // Se o usuário está logado, mas o tenant não foi resolvido (ex: /api/auth/login),
      // permita que ele prossiga para que o login possa definir o tenant.
      // Para outras rotas, isso indicaria um erro.
      if (req.path.startsWith('/api/auth/') && req.method === 'POST') {
         return next();
      }
      return res.status(400).json({ message: "Espaço de trabalho não identificado" });
    }

    const userRole = req.user?.role || 'member';
    const userRoleLevel = roleHierarchy[userRole] || 0;
    const minRoleLevel = roleHierarchy[minRole];

    if (userRoleLevel < minRoleLevel) {
      return res.status(403).json({ 
        message: `Acesso negado. Requer role: ${minRole}. Seu role: ${userRole}` 
      });
    }

    next();
  };
}

// Atalhos úteis
export const requireOwner = requireTenantRole('owner');
export const requireAdmin = requireTenantRole('admin');
export const requireEditor = requireTenantRole('editor');
```

---

## 2.3 Checklist Fase 2

- [ ] 2.1.1: Middleware `resolveTenant` criado
- [ ] 2.1.2: Middleware aplicado em todas as rotas (com exceções corretas)
- [ ] 2.2.1: Login modificado para multi-tenant (incluindo login admin)
- [ ] 2.2.2: Middleware de autorização por role criado
- [ ] Sessão armazena `tenantId` e `role` ✅
- [ ] Registro permite criar novo tenant ✅
- [ ] Login verifica membership no tenant ✅

---

# Fase 3: Refatoração do Backend

**Duração**: 2 semanas  
**Complexidade**: 🟠 Alta

## 3.1 Refatorar Storage Layer

### ✅ Tarefa 3.1.1: Atualizar Interface `IStorage`

**Arquivo**: `server/storage.ts`

```typescript
// ✅ MODIFICAR: TODAS as funções devem receber tenantId

export interface IStorage {
  // Users
  getAllUsers(tenantId: string): Promise<SelectUser[]>; // ✅ ADICIONAR tenantId
  getUser(userId: string, tenantId: string): Promise<SelectUser | undefined>; // ✅ ADICIONAR tenantId
  updateUser(userId: string, tenantId: string, data: Partial<InsertUser>): Promise<SelectUser>; // ✅ ADICIONAR tenantId

  // Videos
  getVideos(tenantId: string, isExclusive?: boolean, categoryId?: string): Promise<SelectVideo[]>; // ✅ MODIFICAR
  getVideo(videoId: string, tenantId: string): Promise<SelectVideo | undefined>; // ✅ ADICIONAR tenantId
  createVideo(tenantId: string, data: InsertVideo): Promise<SelectVideo>; // ✅ ADICIONAR tenantId
  updateVideo(videoId: string, tenantId: string, data: Partial<InsertVideo>): Promise<SelectVideo>; // ✅ ADICIONAR tenantId
  deleteVideo(videoId: string, tenantId: string): Promise<void>; // ✅ ADICIONAR tenantId

  // Products
  getProducts(tenantId: string, type?: string, includeInactive?: boolean): Promise<SelectProduct[]>; // ✅ MODIFICAR
  getProduct(productId: string, tenantId: string): Promise<SelectProduct | undefined>; // ✅ ADICIONAR tenantId
  createProduct(tenantId: string, data: InsertProduct): Promise<SelectProduct>; // ✅ ADICIONAR tenantId
  updateProduct(productId: string, tenantId: string, data: Partial<InsertProduct>): Promise<SelectProduct>; // ✅ ADICIONAR tenantId
  deleteProduct(productId: string, tenantId: string): Promise<void>; // ✅ ADICIONAR tenantId

  // Coupons
  getCoupons(tenantId: string, isExclusive?: boolean, categoryId?: string): Promise<SelectCoupon[]>; // ✅ MODIFICAR
  getCoupon(couponId: string, tenantId: string): Promise<SelectCoupon | undefined>; // ✅ ADICIONAR tenantId
  createCoupon(tenantId: string, data: InsertCoupon): Promise<SelectCoupon>; // ✅ ADICIONAR tenantId
  updateCoupon(couponId: string, tenantId: string, data: Partial<InsertCoupon>): Promise<SelectCoupon>; // ✅ ADICIONAR tenantId
  deleteCoupon(couponId: string, tenantId: string): Promise<void>; // ✅ ADICIONAR tenantId

  // ... REPETIR PARA TODOS OS MÉTODOS
  // Categories, Posts, Comments, Banners, Popups, Missions, etc.

  // ✅ NOVO: Métodos específicos de tenant
  getTenant(tenantId: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;

  // ✅ MODIFICAR: Substitui getAdminUser
  getTenantOwner(tenantId: string): Promise<SelectUser | undefined>;
  getTenantMembers(tenantId: string): Promise<TenantMember[]>;
}
```

---

### ✅ Tarefa 3.1.2: Implementar Métodos com Filtro por Tenant

**Arquivo**: `server/storage.ts`

```typescript
import { db } from './db';
import { 
  users, 
  tenants, 
  tenantMembers, 
  tenantDomains, 
  videos, 
  products, 
  coupons,
  posts,
  comments,
  // ... importar outras tabelas necessárias
} from '@shared/schema';
import { 
  type User as SelectUser, 
  type Tenant, 
  type TenantMember, 
  type Video as SelectVideo,
  type Product as SelectProduct,
  type Coupon as SelectCoupon,
  // ... importar outros tipos
} from '@shared/schema';
import { type InsertUser, type InsertVideo, type InsertProduct, type InsertCoupon } from '@shared/schema';
import { desc, eq, and, sql, asc } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '../uploads'); // Pasta de uploads

// Implementação de exemplo para vídeos
class DatabaseStorage implements IStorage {
  // Users
  async getAllUsers(tenantId: string): Promise<SelectUser[]> {
    // Nota: users não tem tenantId direto, mas pode ser filtrado via tenantMembers
    // Esta função pode precisar de uma lógica mais complexa dependendo do uso
    console.warn('getAllUsers chamado sem filtro de tenant específico. Implementar filtragem via tenantMembers se necessário.');
    // Retorna todos os usuários, mas idealmente deveria ser filtrado pelo tenant
    // Para retornar usuários apenas deste tenant, seria necessário join com tenantMembers
    return db.select().from(users).all();
  }

  async getUser(userId: string, tenantId: string): Promise<SelectUser | undefined> {
     const user = await db.query.users.findFirst({
       where: eq(users.id, userId),
     });
     if (!user) return undefined;

     // Verificar se o usuário pertence ao tenant
     const membership = await db.query.tenantMembers.findFirst({
       where: (members, { and, eq }) => 
         and(
           eq(members.userId, userId),
           eq(members.tenantId, tenantId)
         )
     });

     if (!membership) return undefined; // Usuário não pertence a este tenant

     return user;
  }

  async updateUser(userId: string, tenantId: string, data: Partial<InsertUser>): Promise<SelectUser> {
    // Adicionar verificação de tenant aqui para garantir que o usuário pertence ao tenant
     const user = await this.getUser(userId, tenantId);
     if (!user) throw new Error("Usuário não encontrado ou não pertence a este tenant.");

    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Videos
  async getVideos(tenantId: string, isExclusive?: boolean, categoryId?: string): Promise<SelectVideo[]> {
    let query = db
      .select()
      .from(videos)
      .where(eq(videos.tenantId, tenantId)); // ✅ SEMPRE filtrar por tenant

    if (isExclusive !== undefined) {
      query = query.where(eq(videos.isExclusive, isExclusive));
    }

    if (categoryId) {
      query = query.where(eq(videos.categoryId, categoryId));
    }

    return query.orderBy(desc(videos.createdAt));
  }

  async getVideo(videoId: string, tenantId: string): Promise<SelectVideo | undefined> {
    const [video] = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.id, videoId),
          eq(videos.tenantId, tenantId) // ✅ SEMPRE verificar tenant
        )
      )
      .limit(1);

    return video;
  }

  async createVideo(tenantId: string, data: InsertVideo): Promise<SelectVideo> {
    const [video] = await db
      .insert(videos)
      .values({
        ...data,
        tenantId, // ✅ SEMPRE definir tenantId
      })
      .returning();

    return video;
  }

  async updateVideo(videoId: string, tenantId: string, data: Partial<InsertVideo>): Promise<SelectVideo> {
    const [video] = await db
      .update(videos)
      .set(data)
      .where(
        and(
          eq(videos.id, videoId),
          eq(videos.tenantId, tenantId) // ✅ SEMPRE verificar tenant
        )
      )
      .returning();
    return video;
  }

  async deleteVideo(videoId: string, tenantId: string): Promise<void> {
    await db
      .delete(videos)
      .where(
        and(
          eq(videos.id, videoId),
          eq(videos.tenantId, tenantId) // ✅ NUNCA deletar de outro tenant
        )
      );
  }

  // Products
  async getProducts(tenantId: string, type?: string, includeInactive?: boolean): Promise<SelectProduct[]> {
    let query = db.select().from(products).where(eq(products.tenantId, tenantId));
    if (type) query = query.where(eq(products.type, type));
    if (!includeInactive) query = query.where(eq(products.isActive, true));
    return query.orderBy(asc(products.name));
  }

  async getProduct(productId: string, tenantId: string): Promise<SelectProduct | undefined> {
    const [product] = await db.select().from(products).where(
      and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId)
      )
    ).limit(1);
    return product;
  }

  async createProduct(tenantId: string, data: InsertProduct): Promise<SelectProduct> {
    const [product] = await db.insert(products).values({ ...data, tenantId }).returning();
    return product;
  }

  async updateProduct(productId: string, tenantId: string, data: Partial<InsertProduct>): Promise<SelectProduct> {
     const [product] = await db.update(products).set(data).where(
       and(
         eq(products.id, productId),
         eq(products.tenantId, tenantId)
       )
     ).returning();
     return product;
  }

  async deleteProduct(productId: string, tenantId: string): Promise<void> {
     await db.delete(products).where(
       and(
         eq(products.id, productId),
         eq(products.tenantId, tenantId)
       )
     );
  }

  // Coupons
  async getCoupons(tenantId: string, isExclusive?: boolean, categoryId?: string): Promise<SelectCoupon[]> {
    let query = db.select().from(coupons).where(eq(coupons.tenantId, tenantId));
    if (isExclusive !== undefined) query = query.where(eq(coupons.isExclusive, isExclusive));
    if (categoryId) query = query.where(eq(coupons.categoryId, categoryId));
    return query.orderBy(desc(coupons.createdAt));
  }

  async getCoupon(couponId: string, tenantId: string): Promise<SelectCoupon | undefined> {
     const [coupon] = await db.select().from(coupons).where(
       and(
         eq(coupons.id, couponId),
         eq(coupons.tenantId, tenantId)
       )
     ).limit(1);
     return coupon;
  }

  async createCoupon(tenantId: string, data: InsertCoupon): Promise<SelectCoupon> {
     const [coupon] = await db.insert(coupons).values({ ...data, tenantId }).returning();
     return coupon;
  }

  async updateCoupon(couponId: string, tenantId: string, data: Partial<InsertCoupon>): Promise<SelectCoupon> {
    const [coupon] = await db.update(coupons).set(data).where(
      and(
        eq(coupons.id, couponId),
        eq(coupons.tenantId, tenantId)
      )
    ).returning();
    return coupon;
  }

  async deleteCoupon(couponId: string, tenantId: string): Promise<void> {
     await db.delete(coupons).where(
       and(
         eq(coupons.id, couponId),
         eq(coupons.tenantId, tenantId)
       )
     );
  }

  // Posts
  async getPosts(tenantId: string, categoryId?: string): Promise<any[]> { // Substituir 'any[]' pelo tipo correto
    let query = db.select().from(posts).where(eq(posts.tenantId, tenantId));
    if (categoryId) query = query.where(eq(posts.categoryId, categoryId));
    return query.orderBy(desc(posts.createdAt));
  }

  // Comments
  async getComments(postId: string, tenantId: string): Promise<any[]> { // Substituir 'any[]' pelo tipo correto
    return db.select().from(comments).where(
      and(
        eq(comments.postId, postId),
        eq(comments.tenantId, tenantId)
      )
    ).orderBy(asc(comments.createdAt));
  }

  // Tenants
  async getTenant(tenantId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return tenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
     const [tenant] = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
     return tenant;
  }

  async getTenantOwner(tenantId: string): Promise<SelectUser | undefined> {
    const ownerMembership = await db.query.tenantMembers.findFirst({
      where: (members, { and, eq }) => 
        and(
          eq(members.tenantId, tenantId),
          eq(members.role, 'owner')
        ),
      with: {
        user: true
      }
    });

    return ownerMembership?.user;
  }

  async getTenantMembers(tenantId: string): Promise<TenantMember[]> {
    return db.query.tenantMembers.findMany({
      where: eq(tenantMembers.tenantId, tenantId),
      with: { user: true } // Inclui os dados do usuário
    });
  }
}

export const storage = new DatabaseStorage();
```

---

## 3.2 Atualizar Rotas da API

### ✅ Tarefa 3.2.1: Modificar TODAS as Rotas

**Arquivo**: `server/routes.ts`

```typescript
import { Express, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { setupAuth } from './auth';
import { Server } from 'http';
import { insertVideoSchema, insertProductSchema, insertCouponSchema, insertPostSchema } from '@shared/schemas'; // Assumindo que os schemas estão aqui
import { requireAdmin, requireOwner } from './middleware/requireTenantRole';
import { resolveTenant } from './middleware/resolveTenant';
import path from 'path'; // Import path
import fs from 'fs'; // Import fs
import multer from 'multer'; // Import multer

// Dummy function for Server type, replace with actual if available
declare class Server {}

// Configuração do Multer para uploads por tenant
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage_multer = multer.diskStorage({
  destination: function (req: Request, file, cb) {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return cb(new Error('Tenant ID não encontrado para upload'), ''); 
    }
    const tenantUploadDir = path.join(uploadDir, tenantId);
    if (!fs.existsSync(tenantUploadDir)) {
      fs.mkdirSync(tenantUploadDir, { recursive: true });
    }
    cb(null, tenantUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage_multer });


export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Middleware para resolver o tenant em todas as rotas (exceto as públicas)
  const publicRoutes = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/login-admin', // Rota de login admin
    '/api/tenant/current', // Rota para o frontend buscar o tenant atual
  ];

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (publicRoutes.includes(req.path)) {
      return next();
    }
    // Para rotas de autenticação POST, não resolve o tenant ainda
    if (req.path.startsWith('/api/auth/') && req.method === 'POST') {
      return next();
    }
    return resolveTenant(req, res, next);
  });

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.status(200).send('OK');
  });

  // Rota para obter o tenant atual (usada pelo frontend)
  app.get('/api/tenant/current', async (req, res) => {
    try {
      if (!req.tenant || !req.tenant.id) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }
      res.json({
        id: req.tenant.id,
        slug: req.tenant.slug,
        displayName: req.tenant.displayName,
        subdomain: req.tenant.subdomain,
        plan: req.tenant.plan,
        settings: req.tenant.settings,
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar tenant" });
    }
  });

  // Videos
  app.get('/api/videos', async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const { isExclusive, categoryId } = req.query;
      const videos = await storage.getVideos(tenantId, isExclusive === 'true', categoryId as string);
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ message: `Falha ao buscar vídeos: ${error.message}` });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const video = await storage.getVideo(req.params.id, tenantId);
      if (!video) return res.status(404).json({ message: 'Vídeo não encontrado' });
      res.json(video);
    } catch (error: any) {
      res.status(500).json({ message: `Falha ao buscar vídeo: ${error.message}` });
    }
  });

  app.post('/api/videos', requireAdmin, upload.single('videoFile'), async (req, res) => { // Adicionado upload.single
    try {
      const tenantId = req.tenant!.id;
      // Os dados do body e o file path precisam ser combinados
      const videoData = insertVideoSchema.parse(req.body); 
      // Se o upload foi bem-sucedido, req.file conterá informações
      if (req.file) {
        videoData.videoUrl = `/uploads/${tenantId}/${req.file.filename}`; // Armazena o path relativo
      } else {
         // Se não houve upload mas veio uma URL, usa a URL
         if (!videoData.videoUrl) {
             return res.status(400).json({ message: "URL do vídeo ou arquivo é obrigatório." });
         }
      }

      const video = await storage.createVideo(tenantId, videoData);
      res.status(201).json(video);
    } catch (error: any) {
      res.status(400).json({ message: `Dados inválidos: ${error.message}` });
    }
  });

  app.put('/api/videos/:id', requireAdmin, upload.single('videoFile'), async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const videoData = insertVideoSchema.parse(req.body); 
      if (req.file) {
        videoData.videoUrl = `/uploads/${tenantId}/${req.file.filename}`; 
      }
      
      const video = await storage.updateVideo(req.params.id, tenantId, videoData);
      if (!video) return res.status(404).json({ message: 'Vídeo não encontrado' });
      res.json(video);
    } catch (error: any) {
      res.status(400).json({ message: `Dados inválidos: ${error.message}` });
    }
  });

  app.delete('/api/videos/:id', requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      await storage.deleteVideo(req.params.id, tenantId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: `Falha ao deletar vídeo: ${error.message}` });
    }
  });

  // Products
  app.get('/api/products', async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const { type, includeInactive } = req.query;
      const products = await storage.getProducts(tenantId, type as string, includeInactive === 'true');
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: `Falha ao buscar produtos: ${error.message}` });
    }
  });

   app.get('/api/products/:id', async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       const product = await storage.getProduct(req.params.id, tenantId);
       if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
       res.json(product);
     } catch (error: any) {
       res.status(500).json({ message: `Falha ao buscar produto: ${error.message}` });
     }
   });

   app.post('/api/products', requireAdmin, async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       const productData = insertProductSchema.parse(req.body);
       const product = await storage.createProduct(tenantId, productData);
       res.status(201).json(product);
     } catch (error: any) {
       res.status(400).json({ message: `Dados inválidos: ${error.message}` });
     }
   });

   app.put('/api/products/:id', requireAdmin, async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       const productData = insertProductSchema.parse(req.body);
       const product = await storage.updateProduct(req.params.id, tenantId, productData);
       if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
       res.json(product);
     } catch (error: any) {
       res.status(400).json({ message: `Dados inválidos: ${error.message}` });
     }
   });

   app.delete('/api/products/:id', requireAdmin, async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       await storage.deleteProduct(req.params.id, tenantId);
       res.status(204).send();
     } catch (error: any) {
       res.status(500).json({ message: `Falha ao deletar produto: ${error.message}` });
     }
   });

  // Coupons
  app.get('/api/coupons', async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const { isExclusive, categoryId } = req.query;
      const coupons = await storage.getCoupons(tenantId, isExclusive === 'true', categoryId as string);
      res.json(coupons);
    } catch (error: any) {
      res.status(500).json({ message: `Falha ao buscar cupons: ${error.message}` });
    }
  });

  app.get('/api/coupons/:id', async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       const coupon = await storage.getCoupon(req.params.id, tenantId);
       if (!coupon) return res.status(404).json({ message: 'Cupom não encontrado' });
       res.json(coupon);
     } catch (error: any) {
       res.status(500).json({ message: `Falha ao buscar cupom: ${error.message}` });
     }
   });

   app.post('/api/coupons', requireAdmin, async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       const couponData = insertCouponSchema.parse(req.body);
       const coupon = await storage.createCoupon(tenantId, couponData);
       res.status(201).json(coupon);
     } catch (error: any) {
       res.status(400).json({ message: `Dados inválidos: ${error.message}` });
     }
   });

   app.put('/api/coupons/:id', requireAdmin, async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       const couponData = insertCouponSchema.parse(req.body);
       const coupon = await storage.updateCoupon(req.params.id, tenantId, couponData);
       if (!coupon) return res.status(404).json({ message: 'Cupom não encontrado' });
       res.json(coupon);
     } catch (error: any) {
       res.status(400).json({ message: `Dados inválidos: ${error.message}` });
     }
   });

   app.delete('/api/coupons/:id', requireAdmin, async (req, res) => {
     try {
       const tenantId = req.tenant!.id;
       await storage.deleteCoupon(req.params.id, tenantId);
       res.status(204).send();
     } catch (error: any) {
       res.status(500).json({ message: `Falha ao deletar cupom: ${error.message}` });
     }
   });

  // Posts
  app.get('/api/posts', async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const { categoryId } = req.query;
      const posts = await storage.getPosts(tenantId, categoryId as string);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: `Falha ao buscar posts: ${error.message}` });
    }
  });

  app.post('/api/posts', requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(tenantId, postData); // Assumindo que createPost existe em storage
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ message: `Dados inválidos: ${error.message}` });
    }
  });

  // Comments
  app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const comments = await storage.getComments(req.params.postId, tenantId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: `Falha ao buscar comentários: ${error.message}` });
    }
  });

  // Tenant management
  app.get('/api/tenant/domains', requireOwner, async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const domains = await db.query.tenantDomains.findMany({
        where: (domains, { eq }) => eq(domains.tenantId, tenantId)
      });
      res.json(domains);
    } catch (error: any) {
      res.status(500).json({ message: `Erro ao buscar domínios: ${error.message}` });
    }
  });

  app.post('/api/tenant/domains', requireOwner, async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const { domain } = req.body;

      if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
        return res.status(400).json({ message: "Formato de domínio inválido. Ex: exemplo.com.br" });
      }

      const existing = await db.query.tenantDomains.findFirst({
        where: (domains, { eq }) => eq(domains.domain, domain)
      });

      if (existing) {
        return res.status(400).json({ message: "Este domínio já está em uso por outro tenant." });
      }

      const verificationToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

      const [newDomain] = await db.insert(tenantDomains).values({
        tenantId,
        domain,
        type: 'custom',
        verificationToken,
        isPrimary: false,
        sslStatus: 'pending',
      }).returning();

      res.status(201).json({
        ...newDomain,
        verificationInstructions: `Para verificar seu domínio, adicione um registro TXT no DNS com:\nNome: _verification.${domain}\nValor: ${verificationToken}\n\nApós adicionar o registro, aguarde alguns minutos e clique em 'Verificar'.`
      });
    } catch (error: any) {
      res.status(500).json({ message: `Erro ao adicionar domínio: ${error.message}` });
    }
  });

  app.post('/api/tenant/domains/:id/verify', requireOwner, async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const domainId = req.params.id;

      const domain = await db.query.tenantDomains.findFirst({
        where: (domains, { and, eq }) => 
          and(
            eq(domains.id, domainId),
            eq(domains.tenantId, tenantId)
          )
      });

      if (!domain) {
        return res.status(404).json({ message: "Domínio não encontrado para este tenant" });
      }

      if (!domain.verificationToken) {
         return res.status(400).json({ message: "Domínio já verificado ou token inválido." });
      }

      const dns = require('dns').promises;
      const verificationRecordName = `_verification.${domain.domain}`;

      try {
        const txtRecords = await dns.resolveTxt(verificationRecordName);
        const hasValidToken = txtRecords.some(record => 
          record.some(txt => txt === domain.verificationToken)
        );

        if (!hasValidToken) {
          console.error(`DNS TXT lookup failed for ${verificationRecordName}. Expected: ${domain.verificationToken}`);
          return res.status(400).json({ 
            message: `Token de verificação não encontrado ou incorreto no DNS para ${verificationRecordName}. Verifique o valor e aguarde a propagação.` 
          });
        }

        await db.update(tenantDomains)
          .set({ 
            verifiedAt: new Date(),
            verificationToken: null 
          })
          .where(eq(tenantDomains.id, domainId));

        res.json({ message: "Domínio verificado com sucesso!" });
      } catch (dnsError: any) {
        console.error(`DNS resolution error for ${verificationRecordName}:`, dnsError);
        if (dnsError.code === 'ENODATA' || dnsError.code === 'NXDOMAIN') {
           return res.status(400).json({ 
             message: `Registro TXT '${verificationRecordName}' não encontrado. Certifique-se de que foi adicionado corretamente no seu DNS e aguarde a propagação.` 
           });
        }
        return res.status(500).json({ 
          message: `Erro ao consultar DNS: ${dnsError.message}. Tente novamente em alguns minutos.` 
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Erro interno ao verificar domínio: ${error.message}` });
    }
  });

  app.delete('/api/tenant/domains/:id', requireOwner, async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const domainId = req.params.id;

      const result = await db.delete(tenantDomains)
        .where(
          and(
            eq(tenantDomains.id, domainId),
            eq(tenantDomains.tenantId, tenantId)
          )
        );

      if (result.count === 0) {
         return res.status(404).json({ message: "Domínio não encontrado para este tenant." });
      }

      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: `Erro ao deletar domínio: ${error.message}` });
    }
  });

  // Servir arquivos estáticos de upload com verificação
  app.use('/uploads/:tenantId/*', (req: Request, res: Response, next) => {
    const requestedTenantId = req.params.tenantId;
    const currentTenantId = req.tenant?.id;

    if (requestedTenantId === currentTenantId || requestedTenantId === 'default') {
       next();
    } else {
       res.status(403).send('Acesso negado');
    }
  }, express.static(uploadDir)); // Serve arquivos de dentro do diretório 'uploads'

  // Rota de exemplo para analytics
  app.get('/api/analytics/stats', requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenant!.id;
      const pageViews = await db.query.pageViews.findMany({ 
        where: (views, { eq }) => eq(views.tenantId, tenantId) 
      });
      const bioClicks = await db.query.bioClicks.findMany({ 
        where: (clicks, { eq }) => eq(clicks.tenantId, tenantId) 
      });
      res.json({
        totalViews: pageViews.length,
        totalClicks: bioClicks.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: `Erro ao buscar analytics: ${error.message}` });
    }
  });


  // Retornar o servidor para permitir que ele seja iniciado
  return app as any; // Adapte conforme a necessidade do seu framework
}

// Dummy storage methods for compilation
const storage: IStorage = {
  getAllUsers: async () => [],
  getUser: async () => undefined,
  updateUser: async () => ({} as any),
  getVideos: async () => [],
  getVideo: async () => undefined,
  createVideo: async () => ({} as any),
  updateVideo: async () => ({} as any),
  deleteVideo: async () => {},
  getProducts: async () => [],
  getProduct: async () => undefined,
  createProduct: async () => ({} as any),
  updateProduct: async () => ({} as any),
  deleteProduct: async () => {},
  getCoupons: async () => [],
  getCoupon: async () => undefined,
  createCoupon: async () => ({} as any),
  updateCoupon: async () => ({} as any),
  deleteCoupon: async () => {},
  getPosts: async () => [],
  getComments: async () => [],
  getTenant: async () => undefined,
  getTenantBySlug: async () => undefined,
  getTenantBySubdomain: async () => undefined,
  getTenantOwner: async () => undefined,
  getTenantMembers: async () => [],
  createPost: async () => ({} as any),
};

interface IStorage {
  getAllUsers(tenantId: string): Promise<any[]>;
  getUser(userId: string, tenantId: string): Promise<any | undefined>;
  updateUser(userId: string, tenantId: string, data: Partial<any>): Promise<any>;
  getVideos(tenantId: string, isExclusive?: boolean, categoryId?: string): Promise<any[]>;
  getVideo(videoId: string, tenantId: string): Promise<any | undefined>;
  createVideo(tenantId: string, data: any): Promise<any>;
  updateVideo(videoId: string, tenantId: string, data: Partial<any>): Promise<any>;
  deleteVideo(videoId: string, tenantId: string): Promise<void>;
  getProducts(tenantId: string, type?: string, includeInactive?: boolean): Promise<any[]>;
  getProduct(productId: string, tenantId: string): Promise<any | undefined>;
  createProduct(tenantId: string, data: any): Promise<any>;
  updateProduct(productId: string, tenantId: string, data: Partial<any>): Promise<any>;
  deleteProduct(productId: string, tenantId: string): Promise<void>;
  getCoupons(tenantId: string, isExclusive?: boolean, categoryId?: string): Promise<any[]>;
  getCoupon(couponId: string, tenantId: string): Promise<any | undefined>;
  createCoupon(tenantId: string, data: any): Promise<any>;
  updateCoupon(couponId: string, tenantId: string, data: Partial<any>): Promise<any>;
  deleteCoupon(couponId: string, tenantId: string): Promise<void>;
  getPosts(tenantId: string, categoryId?: string): Promise<any[]>;
  createPost(tenantId: string, data: any): Promise<any>; 
  getComments(postId: string, tenantId: string): Promise<any[]>;
  getTenant(tenantId: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  getTenantOwner(tenantId: string): Promise<any | undefined>;
  getTenantMembers(tenantId: string): Promise<TenantMember[]>;
}
type Tenant = any;
type TenantMember = any;
type SelectUser = any;
type SelectVideo = any;
type SelectProduct = any;
type SelectCoupon = any;
type InsertVideo = any;
type InsertProduct = any;
type InsertCoupon = any;
type InsertPost = any;
type InsertComment = any;

export { Server }; // Export Server type
```

---

### ✅ Tarefa 3.2.2: Atualizar Rota de Perfil Público (Bio)

**Arquivo**: `server/routes.ts` (já incluído acima)

```typescript
// ✅ MODIFICAR: Bio page usa dados do tenant
app.get('/api/admin/public-profile', async (req, res) => {
  try {
    const tenantId = req.tenant!.id; // ✅ Tenant da requisição

    // Buscar owner do tenant
    const ownerUser = await storage.getTenantOwner(tenantId);

    if (!ownerUser) {
      return res.status(404).json({ message: "Tenant owner not found" });
    }

    // Buscar tenant para configurações
    const tenant = await storage.getTenant(tenantId);

    res.json({
      name: ownerUser.name,
      avatar: ownerUser.avatar,
      bio: ownerUser.communitySubtitle || tenant?.settings?.bio || 'Bem-vindo!',
      socialNetworks: ownerUser.socialNetworks || [],
      tenantName: tenant?.displayName,
    });
  } catch (error) {
    console.error('Error fetching admin public profile:', error);
    res.status(500).json({ message: "Failed to fetch admin profile" });
  }
});
```

---

## 3.3 Checklist Fase 3

- [ ] 3.1.1: Interface `IStorage` atualizada com `tenantId`
- [ ] 3.1.2: Métodos implementados com filtro por tenant
- [ ] 3.2.1: TODAS as rotas modificadas para usar tenant
- [ ] 3.2.2: Bio page atualizada
- [ ] Rotas protegidas com `requireAdmin/requireOwner` ✅
- [ ] WebSocket atualizado para incluir tenant ✅ (Necessário implementar em `server/websocket.ts`)

---

# Fase 4: Atualização do Frontend

**Duração**: 1 semana  
**Complexidade**: 🟡 Média

## 4.1 Context de Tenant

### ✅ Tarefa 4.1.1: Criar TenantContext

**Arquivo**: `client/src/contexts/tenant-context.tsx` (NOVO)

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient'; // Assumindo que apiRequest está em lib/queryClient

interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  subdomain: string;
  plan: string;
  settings: {
    branding?: {
      primaryColor?: string;
      logoUrl?: string;
    };
    features?: {
      gamificationEnabled?: boolean;
      analyticsEnabled?: boolean;
    };
  };
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  refetch: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  // Buscar tenant atual do backend
  const { data: tenant, isLoading, refetch } = useQuery<Tenant>({
    queryKey: ['/api/tenant/current'],
    staleTime: Infinity, // Tenant raramente muda
    // retry: false, // Não tentar novamente se falhar (ex: em rotas públicas)
  });

  return (
    <TenantContext.Provider value={{ tenant: tenant || null, isLoading, refetch }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
```

---

### ✅ Tarefa 4.1.2: Adicionar Rota `/api/tenant/current`

**Arquivo**: `server/routes.ts` (já incluído na seção 3.2.1)

---

### ✅ Tarefa 4.1.3: Integrar TenantProvider no App

**Arquivo**: `client/src/App.tsx`

```typescript
import { TenantProvider } from '@/contexts/tenant-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/auth-context'; // Ajuste o caminho se necessário
import Router from './routes'; // Assumindo que o Router está definido
import { MobileDetectionProvider } from './contexts/mobile-detection-context'; // Ajuste o caminho
import { AdminProvider } from './contexts/admin-context'; // Ajuste o caminho
import { SidebarProvider } from './contexts/sidebar-context'; // Ajuste o caminho
import { TooltipProvider } from './contexts/tooltip-context'; // Ajuste o caminho
import { LoginPopupTrigger } from './components/auth/login-popup-trigger'; // Ajuste o caminho
import { PopupSystem } from './components/layout/popup-system'; // Ajuste o caminho
import { Toaster } from './components/ui/toaster'; // Ajuste o caminho

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider> {/* ✅ ADICIONAR */}
        <MobileDetectionProvider>
          <AuthProvider>
            <AdminProvider>
              <SidebarProvider>
                <TooltipProvider>
                  <Router />
                  <LoginPopupTrigger />
                  <PopupSystem trigger="scheduled" />
                  <Toaster />
                </TooltipProvider>
              </SidebarProvider>
            </AdminProvider>
          </AuthProvider>
        </MobileDetectionProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;
```

---

## 4.2 Atualizar Queries

### ✅ Tarefa 4.2.1: Queries Automáticas com Tenant

As queries já funcionarão automaticamente, pois o backend sempre filtra por tenant!

```typescript
// ✅ NÃO PRECISA MUDAR
const { data: videos } = useQuery({
  queryKey: ['/api/videos'],
  // Backend automaticamente filtra pelo tenant da requisição
});

// ✅ NÃO PRECISA MUDAR
const { data: cupons } = useQuery({
  queryKey: ['/api/coupons'],
  // Backend automaticamente filtra pelo tenant da requisição
});
```

---

## 4.3 UI de Tenant

### ✅ Tarefa 4.3.1: Mostrar Nome do Tenant no Header

**Arquivo**: Componente de header (exemplo genérico)

```typescript
import { useTenant } from '@/contexts/tenant-context';

export function AppHeader() {
  const { tenant, isLoading } = useTenant();

  if (isLoading) {
    return <header>Carregando tenant...</header>;
  }

  return (
    <header>
      <h1>{tenant?.displayName || 'Seu Espaço'}</h1>
      {tenant && <p>Plano: {tenant.plan}</p>}
    </header>
  );
}
```

---

## 4.4 Checklist Fase 4

- [ ] 4.1.1: `TenantContext` criado
- [ ] 4.1.2: Rota `/api/tenant/current` criada e acessível
- [ ] 4.1.3: `TenantProvider` integrado no App
- [ ] 4.2.1: Queries funcionando com tenant automático
- [ ] 4.3.1: UI mostrando nome do tenant
- [ ] Branding customizado por tenant (cores, logo) ✅ (Requer implementação adicional)

---

# Fase 5: Sistema de Domínios

**Duração**: 1 semana  
**Complexidade**: 🟠 Alta

## 5.1 Configurar Wildcard Subdomains

### ✅ Tarefa 5.1.1: Configuração DNS

**Provider**: Seu provedor de DNS (Cloudflare, GoDaddy, etc.)

```
# Adicionar registro DNS:
Tipo: A
Nome: *
Valor: [IP do seu servidor]
TTL: Auto

# Resultado:
*.minhainfluencer.com → IP do servidor

# Exemplos funcionais:
belezacomluci.minhainfluencer.com → IP
mariabeauty.minhainfluencer.com → IP
qualquercoisa.minhainfluencer.com → IP
```

---

### ✅ Tarefa 5.1.2: Configurar Express para Múltiplos Domínios

**Arquivo**: `server/index.ts`

```typescript
// Express já suporta múltiplos domínios automaticamente
// O middleware resolveTenant já detecta o subdomínio corretamente
// Nenhuma mudança necessária aqui! ✅
```

---

## 5.2 Domínios Customizados

### ✅ Tarefa 5.2.1: API de Gerenciamento de Domínios

**Arquivo**: `server/routes.ts` (Já incluído na seção 3.2.1, mas revisando e adicionando detalhes)

```typescript
// ... (código anterior de outras rotas)

// Tenant management
app.get('/api/tenant/domains', requireOwner, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;

    const domains = await db.query.tenantDomains.findMany({
      where: (domains, { eq }) => eq(domains.tenantId, tenantId)
    });

    res.json(domains);
  } catch (error: any) {
    res.status(500).json({ message: `Erro ao buscar domínios: ${error.message}` });
  }
});

app.post('/api/tenant/domains', requireOwner, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const { domain } = req.body;

    if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
      return res.status(400).json({ message: "Formato de domínio inválido. Ex: exemplo.com.br" });
    }

    const existing = await db.query.tenantDomains.findFirst({
      where: (domains, { eq }) => eq(domains.domain, domain)
    });

    if (existing) {
      return res.status(400).json({ message: "Este domínio já está em uso por outro tenant." });
    }

    const verificationToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const [newDomain] = await db.insert(tenantDomains).values({
      tenantId,
      domain,
      type: 'custom',
      verificationToken,
      isPrimary: false,
      sslStatus: 'pending',
    }).returning();

    res.status(201).json({
      ...newDomain,
      verificationInstructions: `Para verificar seu domínio, adicione um registro TXT no DNS com:\nNome: _verification.${domain}\nValor: ${verificationToken}\n\nApós adicionar o registro, aguarde alguns minutos e clique em 'Verificar'.`
    });
  } catch (error: any) {
    res.status(500).json({ message: `Erro ao adicionar domínio: ${error.message}` });
  }
});

app.post('/api/tenant/domains/:id/verify', requireOwner, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const domainId = req.params.id;

    const domain = await db.query.tenantDomains.findFirst({
      where: (domains, { and, eq }) => 
        and(
          eq(domains.id, domainId),
          eq(domains.tenantId, tenantId)
        )
    });

    if (!domain) {
      return res.status(404).json({ message: "Domínio não encontrado para este tenant" });
    }

    if (!domain.verificationToken) {
       return res.status(400).json({ message: "Domínio já verificado ou token inválido." });
    }

    const dns = require('dns').promises;
    const verificationRecordName = `_verification.${domain.domain}`;

    try {
      const txtRecords = await dns.resolveTxt(verificationRecordName);
      const hasValidToken = txtRecords.some(record => 
        record.some(txt => txt === domain.verificationToken)
      );

      if (!hasValidToken) {
        console.error(`DNS TXT lookup failed for ${verificationRecordName}. Expected: ${domain.verificationToken}`);
        return res.status(400).json({ 
          message: `Token de verificação não encontrado ou incorreto no DNS para ${verificationRecordName}. Verifique o valor e aguarde a propagação.` 
        });
      }

      await db.update(tenantDomains)
        .set({ 
          verifiedAt: new Date(),
          verificationToken: null 
        })
        .where(eq(tenantDomains.id, domainId));

      res.json({ message: "Domínio verificado com sucesso!" });
    } catch (dnsError: any) {
      console.error(`DNS resolution error for ${verificationRecordName}:`, dnsError);
      if (dnsError.code === 'ENODATA' || dnsError.code === 'NXDOMAIN') {
         return res.status(400).json({ 
           message: `Registro TXT '${verificationRecordName}' não encontrado. Certifique-se de que foi adicionado corretamente no seu DNS e aguarde a propagação.` 
         });
      }
      return res.status(500).json({ 
        message: `Erro ao consultar DNS: ${dnsError.message}. Tente novamente em alguns minutos.` 
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: `Erro interno ao verificar domínio: ${error.message}` });
  }
});

app.delete('/api/tenant/domains/:id', requireOwner, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const domainId = req.params.id;

    const result = await db.delete(tenantDomains)
      .where(
        and(
          eq(tenantDomains.id, domainId),
          eq(tenantDomains.tenantId, tenantId)
        )
      );

    if (result.count === 0) {
       return res.status(404).json({ message: "Domínio não encontrado para este tenant." });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: `Erro ao deletar domínio: ${error.message}` });
  }
});

// ... (resto das rotas)
```

---

### ✅ Tarefa 5.2.2: UI de Gerenciamento de Domínios (Admin)

**Arquivo**: `client/src/pages/admin-domains-page.tsx` (NOVO)

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient'; // Assumindo que apiRequest está aqui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTenant } from '@/contexts/tenant-context';
import { useToast } from '@/hooks/use-toast'; // Assumindo que useToast está aqui

interface Domain {
  id: string;
  domain: string;
  type: 'subdomain' | 'custom';
  isPrimary: boolean;
  verifiedAt: string | null;
  verificationToken: string | null;
}

export default function AdminDomainsPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newDomain, setNewDomain] = useState('');

  const { data: domains, isLoading, error } = useQuery<Domain[]>({
    queryKey: ['/api/tenant/domains'],
    enabled: !!tenant, // Só executa se o tenant estiver carregado
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      return apiRequest('/api/tenant/domains', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/domains'] });
      setNewDomain('');
      toast({
        title: 'Domínio adicionado',
        description: `"${newDomain}" foi adicionado. Siga as instruções de verificação.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao adicionar domínio',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return apiRequest(`/api/tenant/domains/${domainId}/verify`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/domains'] });
      toast({
        title: 'Domínio verificado',
        description: 'Seu domínio customizado foi verificado com sucesso!',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao verificar domínio',
        description: err.message || 'Certifique-se que o registro TXT está correto no DNS.',
        variant: 'destructive',
      });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return apiRequest(`/api/tenant/domains/${domainId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/domains'] });
      toast({
        title: 'Domínio removido',
        description: 'O domínio customizado foi removido.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao remover domínio',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  if (error) return <div>Erro ao carregar domínios: {error.message}</div>;
  if (isLoading) return <div>Carregando domínios...</div>;

  const customDomains = domains?.filter(d => d.type === 'custom') || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Gerenciamento de Domínios</h1>

      {/* Subdomínio Padrão */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">Subdomínio Padrão</h2>
        <p className="text-muted-foreground break-all">
          {tenant?.subdomain || 'N/A'}.minhainfluencer.com
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Este é o seu endereço principal na plataforma.
        </p>
      </Card>

      {/* Adicionar Domínio Customizado */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Adicionar Domínio Customizado</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow space-y-1">
            <Label htmlFor="custom-domain">Novo Domínio</Label>
            <Input
              id="custom-domain"
              placeholder="exemplo.com.br"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
              disabled={addDomainMutation.isPending}
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => addDomainMutation.mutate(newDomain)}
              disabled={addDomainMutation.isPending || !newDomain}
            >
              {addDomainMutation.isPending ? 'Adicionando...' : 'Adicionar Domínio'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Domínios Customizados */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Seus Domínios Customizados</h2>

        {customDomains.length > 0 ? (
          customDomains.map((domain: Domain) => (
            <Card key={domain.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-grow">
                  <p className="font-medium break-all">{domain.domain}</p>
                  <p className={`text-sm ${domain.verifiedAt ? 'text-green-600' : 'text-yellow-700'} font-medium`}>
                    {domain.verifiedAt ? '✅ Verificado' : '⏳ Pendente de Verificação'}
                  </p>

                  {!domain.verifiedAt && domain.verificationToken && (
                    <div className="mt-3 p-3 bg-muted rounded-md text-sm border border-dashed border-muted-foreground">
                      <p className="font-semibold mb-1">Instruções de Verificação:</p>
                      <p>Adicione um registro **TXT** no DNS do seu domínio com os seguintes valores:</p>
                      <code className="block mt-1 font-mono p-2 bg-background rounded border border-input">
                        <strong>Host/Nome:</strong> `_verification.{domain.domain}`<br/>
                        <strong>Valor:</strong> <span className="text-primary font-bold">{domain.verificationToken}</span>
                      </code>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pode levar alguns minutos (ou até horas, dependendo do seu provedor de DNS) para a propagação.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {!domain.verifiedAt && domain.verificationToken && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifyDomainMutation.mutate(domain.id)}
                      disabled={verifyDomainMutation.isPending}
                    >
                      {verifyDomainMutation.isPending ? 'Verificando...' : 'Tentar Verificar Agora'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteDomainMutation.mutate(domain.id)}
                    disabled={deleteDomainMutation.isPending}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground">Você ainda não adicionou nenhum domínio customizado.</p>
        )}
      </div>
    </div>
  );
}
```

---

## 5.3 SSL Automático (Opcional - Avançado)

### ✅ Tarefa 5.3.1: Integração com Let's Encrypt

**Requer**: Certificados SSL dinâmicos

**Opções:**
1. **Usar Cloudflare** (Recomendado - Mais fácil)
   - Configurar domínio customizado via CNAME para Cloudflare
   - SSL automático e gratuito

2. **Usar Caddy Server** (Alternativa)
   - Proxy reverso com SSL automático via ACME

3. **Certificados manuais**
   - Let's Encrypt + Certbot
   - Renovação automática via cron

**Não implementar agora - adicionar depois se necessário!**

---

## 5.4 Checklist Fase 5

- [ ] 5.1.1: DNS wildcard configurado (`*.minhainfluencer.com`)
- [ ] 5.1.2: Express aceita múltiplos domínios
- [ ] 5.2.1: API de domínios criada
- [ ] 5.2.2: UI de gerenciamento de domínios criada
- [ ] Verificação de domínio funcionando ✅
- [ ] SSL (opcional) ✅

---

# Fase 6: Features Específicas

**Duração**: 3-5 dias  
**Complexidade**: 🟡 Média

## 6.1 Uploads por Tenant

### ✅ Tarefa 6.1.1: Modificar Storage de Uploads

**Arquivo**: `server/routes.ts` (Configuração do Multer)

```typescript
// Na inicialização do servidor Express (ex: server/index.ts ou server/routes.ts)
// ... (imports anteriores) ...

// Configuração do Multer para uploads por tenant
const uploadDir = path.join(__dirname, '../uploads');

// Criar diretório base de uploads se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage_multer = multer.diskStorage({
  destination: function (req: Request, file, cb) {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      // Se não houver tenant (ex: rota pública), usar um diretório padrão ou retornar erro
      // return cb(new Error('Tenant ID não encontrado para upload'), ''); 
      return cb(null, path.join(uploadDir, 'default')); // Ou um diretório genérico
    }
    const tenantUploadDir = path.join(uploadDir, tenantId);

    // Criar pasta do tenant se não existir
    if (!fs.existsSync(tenantUploadDir)) {
      fs.mkdirSync(tenantUploadDir, { recursive: true });
    }

    cb(null, tenantUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage_multer }); // Instancia o multer
```

---

### ✅ Tarefa 6.1.2: Servir Uploads com Verificação de Tenant

**Arquivo**: `server/routes.ts` (Nova rota para servir arquivos)

```typescript
// ... (outras rotas)

// Servir arquivos de upload com verificação de tenant
app.use('/uploads/:tenantId/*', (req: Request, res: Response, next) => {
  const requestedTenantId = req.params.tenantId;
  const currentTenantId = req.tenant?.id;

  // Permitir acesso se o usuário estiver autenticado e o tenant corresponder
  // Ou se for um tenant padrão (se aplicável)
  if (requestedTenantId === currentTenantId || requestedTenantId === 'default') {
     // Verificar se o usuário tem permissão para acessar este arquivo específico (mais granular)
     // Por enquanto, apenas verifica se o tenantId na URL corresponde ao tenant da sessão
     next();
  } else {
     res.status(403).send('Acesso negado');
  }
});
app.use('/uploads', express.static(uploadDir)); // Serve arquivos de dentro do diretório 'uploads'


// ... (resto das rotas)
```

---

## 6.2 Analytics por Tenant

### ✅ Tarefa 6.2.1: Filtrar Analytics

**Arquivo**: `server/routes.ts` (Exemplo de rota de analytics)

```typescript
// Rota de exemplo para buscar estatísticas de analytics
app.get('/api/analytics/stats', requireAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;

    // Buscar views apenas do tenant
    const pageViews = await db.query.pageViews.findMany({ // Assumindo que pageViews existe
      where: (views, { eq }) => eq(views.tenantId, tenantId) // ✅ Filtrar
    });

    const bioClicks = await db.query.bioClicks.findMany({ // Assumindo que bioClicks existe
      where: (clicks, { eq }) => eq(clicks.tenantId, tenantId) // ✅ Filtrar
    });

    // ... buscar outras métricas filtrando por tenantId

    res.json({
      totalViews: pageViews.length,
      totalClicks: bioClicks.length,
      // ... outras métricas
    });
  } catch (error: any) {
    res.status(500).json({ message: `Erro ao buscar analytics: ${error.message}` });
  }
});
```

---

## 6.3 WebSocket por Tenant

### ✅ Tarefa 6.3.1: Rooms por Tenant no WebSocket

**Arquivo**: `server/websocket.ts` (ou onde o WebSocket está configurado)

```typescript
// Exemplo conceitual - a implementação real depende da sua biblioteca WebSocket (Socket.IO, ws, etc.)
import { Server as WebSocketServer } from 'ws'; // Ou a classe correta da sua lib
import http from 'http';
import { Request } from 'express'; // Para obter o tenant da requisição

// Assumindo que 'io' é sua instância do servidor Socket.IO ou similar
// const io = new Server(httpServer);

// Mock para demonstração
const mockIo = {
  of: (namespace: string) => ({
    on: (event: string, handler: (socket: any, req?: Request) => void) => {
      if (event === 'connection') {
        // Simular uma conexão com um tenant
        const mockSocket = {
          join: (room: string) => console.log(`Socket joined room: ${room}`),
          close: () => console.log('Socket closed'),
          emit: (event: string, data: any) => console.log(`Socket emitted: ${event}`, data),
        };
        const mockReq = { tenant: { id: 'mock-tenant-id' } } as Request; // Simula o tenant na requisição
        handler(mockSocket, mockReq);
      }
    },
    to: (room: string) => ({ // Simula o método 'to' do Socket.IO
      emit: (event: string, data: any) => console.log(`Broadcasting to room ${room}: ${event}`, data),
    }),
  }),
};

// Substitua mockIo pela sua instância real (ex: io)
const wsService = mockIo as any; // Ajuste o tipo conforme sua biblioteca

wsService.of('/').on('connection', (socket: any, req: Request) => {
  const tenantId = req.tenant?.id;

  if (!tenantId) {
    console.log('Sem tenantId, fechando socket.');
    socket.close();
    return;
  }

  // Juntar o socket ao "room" do tenant
  socket.join(`tenant:${tenantId}`);
  console.log(`Socket conectado ao tenant: ${tenantId}. Juntou-se ao room 'tenant:${tenantId}'.`);

  // Exemplo de evento recebido do cliente
  socket.on('message', (message: string) => {
     console.log(`Mensagem recebida no tenant ${tenantId}: ${message}`);
     // Processar mensagem e possivelmente reenviar para o mesmo room
  });
});

// Função para emitir atualizações apenas para um tenant específico
function broadcastToTenant(tenantId: string, event: string, data: any) {
  wsService.of('/').to(`tenant:${tenantId}`).emit(event, data);
  console.log(`Broadcasting para tenant ${tenantId}: Evento '${event}', Dados:`, data);
}

// Exemplo de uso:
// broadcastToTenant('tenant123', 'data_updated', { type: 'videos', count: 5 });

// Exportar a função se necessário
// export { broadcastToTenant };

```

---

## 6.4 Checklist Fase 6

- [ ] 6.1.1: Uploads salvos em `/uploads/{tenantId}/`
- [ ] 6.1.2: Verificação de acesso a uploads
- [ ] 6.2.1: Analytics filtrado por tenant
- [ ] 6.3.1: WebSocket com rooms por tenant
- [ ] Notificações isoladas por tenant ✅ (Requer implementação)
- [ ] Comunidade isolada por tenant ✅ (Requer implementação)

---

# Fase 7: Testes e Deploy

**Duração**: 1-2 semanas  
**Complexidade**: 🟠 Alta

## 7.1 Testes de Isolamento

### ✅ Tarefa 7.1.1: Criar Testes Automatizados

**Arquivo**: `tests/tenant-isolation.test.ts` (NOVO)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db';
import { tenants, tenantMembers, users, videos, coupons } from '../shared/schema'; // Importar schemas necessários
import { storage } from '../server/storage'; // Importar o serviço de storage

describe('Tenant Isolation Tests', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;

  beforeEach(async () => {
    // Limpar tabelas antes de cada teste
    await db.delete(tenantMembers);
    await db.delete(tenants);
    await db.delete(users);

    // Setup: Criar 2 tenants
    const [t1] = await db.insert(tenants).values({
      slug: 'tenant1',
      displayName: 'Tenant 1',
      subdomain: 'tenant1',
      plan: 'free',
      status: 'active',
    }).returning();
    tenant1Id = t1.id;

    const [t2] = await db.insert(tenants).values({
      slug: 'tenant2',
      displayName: 'Tenant 2',
      subdomain: 'tenant2',
      plan: 'free',
      status: 'active',
    }).returning();
    tenant2Id = t2.id;

    // Setup: Criar 2 usuários e adicioná-los aos tenants
    const [u1] = await db.insert(users).values({
      username: 'user1',
      email: 'user1@example.com',
      name: 'User One',
      password: 'hashed_password_1', // Use a função de hash real aqui
    }).returning();
    user1Id = u1.id;

    await db.insert(tenantMembers).values({
      tenantId: tenant1Id,
      userId: user1Id,
      role: 'owner',
      status: 'active',
    });

    const [u2] = await db.insert(users).values({
      username: 'user2',
      email: 'user2@example.com',
      name: 'User Two',
      password: 'hashed_password_2', // Use a função de hash real aqui
    }).returning();
    user2Id = u2.id;

    await db.insert(tenantMembers).values({
      tenantId: tenant2Id,
      userId: user2Id,
      role: 'admin',
      status: 'active',
    });
  });

  it('deve impedir que tenant1 acesse vídeos do tenant2', async () => {
    // Criar vídeo no tenant2
    const videoDataT2 = { title: 'Vídeo do Tenant 2', videoUrl: 'url_t2', tenantId: tenant2Id, categoryId: 'cat1' };
    const [videoT2] = await db.insert(videos).values(videoDataT2).returning();

    // Tentar buscar vídeos do tenant1 (não deve incluir vídeo do tenant2)
    const tenant1Videos = await storage.getVideos(tenant1Id);

    expect(tenant1Videos).toEqual([]); // Esperado que a lista esteja vazia ou não contenha o vídeo T2
    expect(tenant1Videos.some(v => v.id === videoT2.id)).toBe(false);
  });

  it('deve permitir que tenant1 acesse apenas seus próprios cupons', async () => {
    // Criar cupom no tenant1
    const couponDataT1 = { code: 'CUPOM1', brand: 'Brand1', tenantId: tenant1Id, discount: 10 };
    const [couponT1] = await db.insert(coupons).values(couponDataT1).returning();

    // Criar cupom no tenant2
    const couponDataT2 = { code: 'CUPOM2', brand: 'Brand2', tenantId: tenant2Id, discount: 20 };
    const [couponT2] = await db.insert(coupons).values(couponDataT2).returning();

    const tenant1Coupons = await storage.getCoupons(tenant1Id);

    expect(tenant1Coupons).toHaveLength(1);
    expect(tenant1Coupons[0].id).toBe(couponT1.id);
    expect(tenant1Coupons.some((c: any) => c.id === couponT2.id)).toBe(false);
  });

  it('deve retornar undefined ao tentar buscar um recurso de outro tenant', async () => {
    // Criar um vídeo no tenant1
    const [videoT1] = await db.insert(videos).values({
      title: 'Vídeo T1', videoUrl: 'url_t1', tenantId: tenant1Id, categoryId: 'cat1'
    }).returning();

    // Tentar buscar o vídeo T1 usando o ID do tenant2
    const videoFromTenant2 = await storage.getVideo(videoT1.id, tenant2Id);
    expect(videoFromTenant2).toBeUndefined();
  });

  it('deve impedir a exclusão de um recurso de outro tenant', async () => {
     // Criar um vídeo no tenant1
     const [videoT1] = await db.insert(videos).values({
       title: 'Vídeo T1', videoUrl: 'url_t1', tenantId: tenant1Id, categoryId: 'cat1'
     }).returning();

     // Tentar deletar o vídeo T1 usando o ID do tenant2 (deve falhar silenciosamente ou com erro)
     // A implementação de deleteVideo deve garantir que o tenantId é verificado
     await storage.deleteVideo(videoT1.id, tenant2Id); // Isso não deve encontrar o vídeo

     // Verificar se o vídeo ainda existe
     const videoStillExists = await db.query.videos.findFirst({
       where: eq(videos.id, videoT1.id)
     });
     expect(videoStillExists).toBeDefined(); // Deve continuar existindo pois a deleção falhou
     expect(videoStillExists?.tenantId).toBe(tenant1Id); // E pertence ao tenant correto
  });

  // Adicionar mais testes para outras entidades (posts, comments, products, etc.)
});
```

---

### ✅ Tarefa 7.1.2: Testes Manuais

**Checklist de Testes Manuais:**

1.  **Criar 2 tenants de teste:**
    -   [ ] tenant1: Acessar `http://tenant1.localhost:3000` (ou subdomínio configurado)
    -   [ ] tenant2: Acessar `http://tenant2.localhost:3000`

2.  **Testar isolamento de dados:**
    -   [ ] Criar vídeo em tenant1 → não aparece em tenant2 ✅
    -   [ ] Criar cupom em tenant2 → não aparece em tenant1 ✅
    -   [ ] Criar post em tenant1 → comunidade separada ✅
    -   [ ] Analytics separados ✅

3.  **Testar autenticação:**
    -   [ ] Login em tenant1 → acesso apenas a tenant1 ✅
    -   [ ] Trocar de tenant (se houver UI para isso) → dados diferentes ✅
    -   [ ] Tentar acessar tenant2 com credenciais de tenant1 → negado ✅
    -   [ ] Login Admin no domínio principal → redireciona para subdomínio correto ✅

4.  **Testar uploads:**
    -   [ ] Upload em tenant1 → salvo em `/uploads/tenant1/` ✅
    -   [ ] Tentar acessar `/uploads/tenant2/` de tenant1 (via URL direta) → negado ✅

5.  **Testar domínios:**
    -   [ ] Acessar por subdomínio → correto ✅
    -   [ ] Adicionar domínio customizado → funciona ✅
    -   [ ] Verificar domínio → validação correta ✅ (Requer configuração DNS real)

---

## 7.2 Performance e Otimização

### ✅ Tarefa 7.2.1: Adicionar Índices de Performance

**Executar no banco (SQL):**

```sql
-- Índices críticos para performance multi-tenant (ajuste conforme necessário)

-- Para queries comuns de listagem de vídeos, posts, etc., por tenant
CREATE INDEX IF NOT EXISTS idx_videos_tenant_created ON videos(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_created ON posts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tenant_active ON products(tenant_id, is_active, name ASC);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_active ON coupons(tenant_id, is_active, created_at DESC);

-- Para queries de analytics por tenant
CREATE INDEX IF NOT EXISTS idx_page_views_tenant_date ON page_views(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bio_clicks_tenant_date ON bio_clicks(tenant_id, created_at DESC);

-- Para buscas rápidas de membros e domínios de um tenant
CREATE INDEX IF NOT EXISTS idx_tenant_members_lookup ON tenant_members(tenant_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON tenant_domains(tenant_id);

-- Índices em campos de relacionamento e unicidade
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(tenant_id, category_id) WHERE tenant_id IS NOT NULL; -- Exemplo com condição
CREATE UNIQUE INDEX IF NOT EXISTS unique_tenant_category_title ON categories(tenant_id, title) WHERE tenant_id IS NOT NULL;
```

---

### ✅ Tarefa 7.2.2: Implementar Cache por Tenant (Opcional)

**Arquivo**: `server/cache.ts` (NOVO - Exemplo com `node-cache`)

```typescript
import NodeCache from 'node-cache';

// Cache global com namespaces por tenant
const tenantCaches = new Map<string, NodeCache>();

// Obter ou criar um cache para um tenant específico
function getTenantCache(tenantId: string): NodeCache {
  if (!tenantCaches.has(tenantId)) {
    // Configuração do cache (ex: TTL padrão de 5 minutos)
    const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); 
    tenantCaches.set(tenantId, cache);
  }
  return tenantCaches.get(tenantId)!;
}

export function getCachedData<T>(tenantId: string, key: string): T | undefined {
  const cache = getTenantCache(tenantId);
  return cache.get(key) as T | undefined;
}

export function setCachedData(tenantId: string, key: string, data: any, ttlSeconds?: number): boolean {
  const cache = getTenantCache(tenantId);
  return cache.set(key, data, ttlSeconds); // Usa TTL padrão se não especificado
}

export function delCachedData(tenantId: string, key: string): number {
  const cache = getTenantCache(tenantId);
  return cache.del(key);
}

export function flushTenantCache(tenantId: string): number {
  if (tenantCaches.has(tenantId)) {
    const count = tenantCaches.get(tenantId)!.keys().length;
    tenantCaches.get(tenantId)!.flushAll();
    tenantCaches.delete(tenantId); // Remover o cache do Map para liberar memória
    return count;
  }
  return 0;
}
```

**Como usar:**
```typescript
// No controller/route handler:
import { getCachedData, setCachedData } from '../cache';

const tenantId = req.tenant!.id;
const cacheKey = 'tenant_settings';

let settings = getCachedData(tenantId, cacheKey);

if (!settings) {
  settings = await storage.getTenantSettings(tenantId); // Buscar do DB
  setCachedData(tenantId, cacheKey, settings, 600); // Cache por 10 minutos
}

res.json(settings);
```

---

## 7.3 Documentação

### ✅ Tarefa 7.3.1: Criar Guia de Onboarding

**Arquivo**: `ONBOARDING_TENANT.md` (NOVO)

```markdown
# Guia de Onboarding - Novo Tenant

## Bem-vindo(a) à Plataforma!

Este guia irá te ajudar a configurar seu novo espaço de trabalho (tenant) e começar a usar a plataforma.

---

## Passo 1: Acessando seu Espaço

1.  **Login:** Acesse o domínio principal (`minhainfluencer.com`) e clique em "Login Administrativo" ou use o subdomínio que você criou durante o cadastro (`seunome.minhainfluencer.com`).
2.  **Credenciais:** Utilize o email e senha que você registrou.
3.  **Redirecionamento:** Administradores serão redirecionados para o subdomínio do seu tenant. Usuários normais devem sempre acessar pelo subdomínio do influencer.

---

## Passo 2: Configuração Inicial do Perfil

Ao acessar seu painel pela primeira vez, é importante configurar as informações básicas:

1.  **Logo e Favicon:** Vá em `Configurações` > `Aparência` e envie seu logo e favicon.
2.  **Cores da Marca:** Defina a cor primária e secundária para personalizar a identidade visual.
3.  **Informações Gerais:** Preencha o nome da sua marca/negócio, um subtítulo ou slogan.
4.  **Redes Sociais:** Conecte seus perfis sociais (Instagram, YouTube, TikTok, etc.).

---

## Passo 3: Adicionando Conteúdo Principal

Agora, comece a popular seu espaço com conteúdo:

1.  **Vídeos:**
    *   Vá para `Conteúdo` > `Vídeos`.
    *   Clique em `Adicionar Vídeo`.
    *   Você pode adicionar vídeos diretamente (upload ou link) ou importar de plataformas como YouTube (se a funcionalidade estiver disponível).
2.  **Produtos/Serviços:**
    *   Vá para `Loja` > `Produtos`.
    *   Cadastre os produtos ou serviços que você deseja oferecer.
3.  **Cupons de Desconto:**
    *   Vá para `Marketing` > `Cupons`.
    *   Crie cupons personalizados para seus seguidores.
4.  **Comunidade/Posts:**
    *   Vá para `Comunidade` > `Posts`.
    *   Crie posts, enquetes ou inicie discussões.

---

## Passo 4: Convidando sua Equipe (Opcional)

Se você tem colaboradores, pode convidá-los para acessar seu espaço:

1.  Vá em `Configurações` > `Equipe`.
2.  Clique em `Convidar Membro`.
3.  Insira o email do colaborador e escolha a permissão (`Admin`, `Editor`, `Membro`).
4.  O convidado receberá um email para criar ou vincular sua conta.

---

## Passo 5: Configurando Domínio Customizado (Opcional)

Para ter uma presença ainda mais profissional, você pode usar seu próprio domínio:

1.  Vá em `Configurações` > `Domínios`.
2.  Clique em `Adicionar Domínio Customizado`.
3.  Insira seu domínio (ex: `www.suamarca.com.br`).
4.  Siga as instruções de verificação DNS (geralmente um registro TXT).
5.  Após a verificação, configure o apontamento (CNAME ou A record) para o nosso servidor.
6.  O certificado SSL será provisionado automaticamente.

---

## Próximos Passos

*   Explore as seções de `Analytics` para entender o desempenho.
*   Configure `Notificações` para se manter atualizado.
*   Explore as funcionalidades de `Gamificação` (se ativadas).

Se tiver dúvidas, consulte nossa central de ajuda ou entre em contato com o suporte.

---
*Última atualização: Novembro 2024*
```

---

## 7.4 Deploy

### ✅ Tarefa 7.4.1: Preparar para Produção

**Checklist de Deploy:**

1.  **Variáveis de Ambiente (.env.production):**
    ```dotenv
    NODE_ENV=production
    SESSION_SECRET=secret-super-seguro-aqui-mude-isso
    DATABASE_URL=postgresql://user:password@host:port/database # Ou as variáveis específicas do seu provedor (Railway, Vercel, etc.)
    # Outras variáveis como chaves de API, etc.
    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...
    ```

2.  **Build da Aplicação:**
    ```bash
    npm run build 
    # Ou o comando de build do seu framework frontend/backend
    ```

3.  **Migração do Banco de Dados em Produção:**
    *   **BACKUP COMPLETO DO BANCO DE DADOS ATUAL ANTES DE CONTINUAR!**
    *   Execute as migrações de schema:
        ```bash
        npm run db:push --force 
        # Ou `npx drizzle-kit push:pg --config=drizzle.config.ts`
        ```
    *   Execute as migrações de dados (se houver scripts específicos para produção):
        ```bash
        # Exemplo: Se você tiver um script para criar o tenant default em produção
        # node dist/server/migrations/create-default-tenant.js 
        ```

4.  **Configurações do Servidor/Plataforma:**
    *   **DNS:** Certifique-se de que os DNSs (domínio principal, wildcard `*`, e domínios customizados) estão apontando corretamente para o IP ou CNAME do seu servidor de produção.
    *   **Proxy Reverso (Nginx/Caddy):** Configure para encaminhar tráfego, lidar com SSL e servir arquivos estáticos.
    *   **Variáveis de Ambiente:** Configure todas as variáveis de ambiente necessárias na sua plataforma de hospedagem.

5.  **Verificações Finais:**
    *   [ ] Todos os dados migrados corretamente.
    *   [ ] Tenant default criado (se aplicável).
    *   [ ] Testes de login (normal e admin) funcionando.
    *   [ ] Uploads funcionando e acessíveis.
    *   [ ] Domínios customizados (se configurados) funcionando e verificados.
    *   [ ] Performance monitorada.

---

## 7.5 Checklist Fase 7

- [ ] 7.1.1: Testes automatizados criados e passando
- [ ] 7.1.2: Testes manuais executados com sucesso
- [ ] 7.2.1: Índices de performance criados no banco de produção
- [ ] 7.2.2: Cache implementado e funcionando (se optado por usar)
- [ ] 7.3.1: Documentação de onboarding criada e acessível
- [ ] 7.4.1: Deploy em produção realizado com sucesso
- [ ] Backup do banco antes do deploy ✅
- [ ] Plano de rollback preparado ✅

---

# Checklist Geral

## Banco de Dados ✅
- [ ] 4 novas tabelas criadas (tenants, tenant_members, tenant_invitations, tenant_domains)
- [ ] tenantId adicionado em todas as tabelas de conteúdo relevantes
- [ ] Índices criados para performance
- [ ] Constraints de unicidade atualizados por tenant
- [ ] Dados migrados corretamente (tenant default, etc.)
- [ ] Campo `isAdmin` em `users` removido/migrado

## Autenticação ✅
- [ ] Middleware `resolveTenant` implementado e aplicado
- [ ] Login multi-tenant (normal e admin) implementado
- [ ] Sessão armazena `tenantId` e `role` do usuário
- [ ] Registro permite a criação de novo tenant
- [ ] Middleware de autorização `requireTenantRole` implementado

## Backend ✅
- [ ] Interface `IStorage` atualizada para `tenantId`
- [ ] Todos os métodos de storage filtram por tenant
- [ ] Todas as rotas da API usam o `tenantId` da requisição
- [ ] Rota `/api/tenant/current` para frontend
- [ ] Rota `/api/auth/login-admin` para login centralizado
- [ ] Uploads e acesso a arquivos isolados por tenant
- [ ] WebSocket com rooms por tenant

## Frontend ✅
- [ ] `TenantContext` criado e integrado
- [ ] UI reflete o tenant atual (nome, logo, cores)
- [ ] Queries (useQuery) funcionam automaticamente com o tenant
- [ ] Páginas de login (normal e admin) e cadastro implementadas

## Domínios ✅
- [ ] Configuração DNS wildcard (`*.minhainfluencer.com`) realizada
- [ ] API para gerenciamento de domínios customizados implementada
- [ ] UI de gerenciamento de domínios implementada
- [ ] Verificação de domínios customizados funcionando
- [ ] Suporte a múltiplos domínios (subdomínio e customizado)

## Features Específicas ✅
- [ ] Uploads e acesso a arquivos isolados por tenant
- [ ] Analytics filtrados por tenant
- [ ] Comunidade isolada por tenant (requer implementação específica)
- [ ] Gamificação isolada por tenant (requer implementação específica)

## Testes e Deploy ✅
- [ ] Testes automatizados de isolamento criados
- [ ] Testes manuais executados em múltiplos tenants
- [ ] Índices de performance adicionados em produção
- [ ] Documentação de onboarding criada
- [ ] Deploy em produção realizado com sucesso
- [ ] Backup e plano de rollback executados

---

# Próximos Passos (Pós-Implementação)

## Features Futuras
1.  **Planos e Billing**
    *   Integração com Stripe
    *   Limites por plano (vídeos, usuários, storage)
    *   Upgrade/downgrade automático
2.  **Analytics Avançado**
    *   Dashboard por tenant
    *   Comparação de performance entre tenants
    *   Relatórios exportáveis
3.  **Automações**
    *   Email marketing por tenant
    *   Webhooks personalizados
    *   Integrações com ferramentas externas
4.  **Whitelabel Completo**
    *   CSS customizado por tenant
    *   Upload de logo e favicon
    *   Template de emails customizável

---

# Suporte e Dúvidas

**Durante a Implementação:**
- Seguir este documento passo a passo.
- Fazer backup do banco de dados antes de cada fase crítica.
- Testar exaustivamente em ambiente de desenvolvimento.
- Documentar quaisquer problemas ou desvios encontrados.

**Após Implementação:**
- Monitorar performance, logs e erros em produção.
- Coletar feedback dos primeiros usuários e tenants.
- Iterar e adicionar novas funcionalidades com base no feedback.

---

**Boa sorte com a implementação! 🚀**

*Última atualização: Novembro 2024*