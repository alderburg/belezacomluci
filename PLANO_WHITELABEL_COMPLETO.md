# 🚀 Plano Completo: Transformação Whitelabel Multi-Tenant

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Fluxo de Cadastro e Landing Page](#fluxo-de-cadastro-e-landing-page)
3. [Fase 0: Landing Page e Cadastro Centralizado](#fase-0-landing-page-e-cadastro-centralizado)
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

# Fase 1: Fundação do Banco de Dados

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
  ];
  
  // Aplicar middleware de tenant em rotas que não são públicas
  app.use((req, res, next) => {
    if (publicRoutes.includes(req.path)) {
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
import { users, tenantMembers, type User as SelectUser } from "@shared/schema";
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

          // 3. ✅ NOVO: Verificar se usuário pertence ao tenant da requisição
          const tenantId = req.tenant?.id;
          
          if (tenantId) {
            const membership = await db.query.tenantMembers.findFirst({
              where: (members, { and, eq }) => 
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

          // Fallback: login sem tenant (para migração)
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
      tenantId: user.tenantId,
      role: user.role 
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

      // Anexar dados do tenant da sessão
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

  // ... resto permanece igual (login, logout, etc)
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Autenticação necessária" });
    }

    const userRole = req.user?.role || 'member';
    const userRoleLevel = roleHierarchy[userRole] || 0;
    const minRoleLevel = roleHierarchy[minRole];

    if (userRoleLevel < minRoleLevel) {
      return res.status(403).json({ 
        message: `Acesso negado. Requer role: ${minRole}` 
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
- [ ] 2.1.2: Middleware aplicado em todas as rotas
- [ ] 2.2.1: Login modificado para multi-tenant
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
class DatabaseStorage implements IStorage {
  // ✅ EXEMPLO: Implementação com tenant filter
  
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
  
  // ✅ NOVO: Métodos de tenant
  async getTenant(tenantId: string): Promise<Tenant | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return tenant;
  }
  
  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
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
  
  // ✅ REPETIR este padrão para TODOS os métodos!
  // getProducts, getCoupons, getPosts, etc.
}
```

**⚠️ CRÍTICO**: Aplicar o padrão `tenantId` em **TODOS** os métodos:
- `getProducts()`
- `getCoupons()`
- `getCategories()`
- `getPosts()`
- `getComments()`
- `getBanners()`
- `getPopups()`
- `getMissions()`
- `getRaffles()`
- `getRewards()`
- etc. (37 tabelas!)

---

## 3.2 Atualizar Rotas da API

### ✅ Tarefa 3.2.1: Modificar TODAS as Rotas

**Arquivo**: `server/routes.ts`

```typescript
// ✅ ANTES:
app.get("/api/videos", async (req, res) => {
  try {
    const videos = await storage.getVideos(); // ❌ Sem tenant
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

// ✅ DEPOIS:
app.get("/api/videos", async (req, res) => {
  try {
    const tenantId = req.tenant!.id; // ✅ Pegar tenant do middleware
    const videos = await storage.getVideos(tenantId); // ✅ Passar tenant
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

// ✅ EXEMPLO: Rota protegida por role
import { requireAdmin } from './middleware/requireTenantRole';

app.post("/api/videos", requireAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const videoData = insertVideoSchema.parse(req.body);
    const video = await storage.createVideo(tenantId, videoData);
    
    res.status(201).json(video);
  } catch (error) {
    res.status(400).json({ message: "Invalid video data" });
  }
});
```

**Aplicar em TODAS as rotas:**
- `/api/videos` ✅
- `/api/produtos` ✅
- `/api/coupons` ✅
- `/api/banners` ✅
- `/api/categories` ✅
- `/api/posts` ✅
- `/api/comments` ✅
- `/api/popups` ✅
- `/api/notifications` ✅
- `/api/gamification/*` ✅
- `/api/analytics/*` ✅
- etc.

---

### ✅ Tarefa 3.2.2: Atualizar Rota de Perfil Público (Bio)

**Arquivo**: `server/routes.ts`

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
- [ ] WebSocket atualizado para incluir tenant ✅

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

**Arquivo**: `server/routes.ts`

```typescript
// ✅ NOVO: Endpoint para frontend buscar tenant atual
app.get('/api/tenant/current', async (req, res) => {
  try {
    if (!req.tenant) {
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
```

---

### ✅ Tarefa 4.1.3: Integrar TenantProvider no App

**Arquivo**: `client/src/App.tsx`

```typescript
import { TenantProvider } from '@/contexts/tenant-context';

// ... imports

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
  const { tenant } = useTenant();
  
  return (
    <header>
      <h1>{tenant?.displayName || 'Loading...'}</h1>
      <p>Plano: {tenant?.plan}</p>
    </header>
  );
}
```

---

## 4.4 Checklist Fase 4

- [ ] 4.1.1: `TenantContext` criado
- [ ] 4.1.2: Rota `/api/tenant/current` criada
- [ ] 4.1.3: `TenantProvider` integrado no App
- [ ] 4.2.1: Queries funcionando com tenant automático
- [ ] 4.3.1: UI mostrando nome do tenant
- [ ] Branding customizado por tenant (cores, logo) ✅

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

**Arquivo**: `server/routes.ts`

```typescript
import { requireOwner } from './middleware/requireTenantRole';

// Listar domínios do tenant
app.get('/api/tenant/domains', requireOwner, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    
    const domains = await db.query.tenantDomains.findMany({
      where: (domains, { eq }) => eq(domains.tenantId, tenantId)
    });
    
    res.json(domains);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar domínios" });
  }
});

// Adicionar domínio customizado
app.post('/api/tenant/domains', requireOwner, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const { domain } = req.body;
    
    // Validar formato do domínio
    if (!domain || !domain.includes('.')) {
      return res.status(400).json({ message: "Domínio inválido" });
    }
    
    // Verificar se domínio já existe
    const existing = await db.query.tenantDomains.findFirst({
      where: (domains, { eq }) => eq(domains.domain, domain)
    });
    
    if (existing) {
      return res.status(400).json({ message: "Domínio já está em uso" });
    }
    
    // Gerar token de verificação
    const verificationToken = Math.random().toString(36).substring(2, 15);
    
    // Criar domínio
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
      verificationInstructions: `Adicione um registro TXT no seu DNS:\nNome: _verification\nValor: ${verificationToken}`
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar domínio" });
  }
});

// Verificar domínio
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
      return res.status(404).json({ message: "Domínio não encontrado" });
    }
    
    // Verificar DNS (verificação real via DNS lookup)
    const dns = require('dns').promises;
    
    try {
      const txtRecords = await dns.resolveTxt(`_verification.${domain.domain}`);
      const hasValidToken = txtRecords.some(record => 
        record.some(txt => txt.includes(domain.verificationToken!))
      );
      
      if (!hasValidToken) {
        return res.status(400).json({ 
          message: "Token de verificação não encontrado no DNS" 
        });
      }
      
      // Verificar domínio
      await db.update(tenantDomains)
        .set({ 
          verifiedAt: new Date(),
          verificationToken: null 
        })
        .where(eq(tenantDomains.id, domainId));
      
      res.json({ message: "Domínio verificado com sucesso!" });
    } catch (dnsError) {
      res.status(400).json({ 
        message: "Não foi possível verificar o DNS. Certifique-se de que adicionou o registro TXT." 
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao verificar domínio" });
  }
});

// Deletar domínio
app.delete('/api/tenant/domains/:id', requireOwner, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const domainId = req.params.id;
    
    await db.delete(tenantDomains)
      .where(
        and(
          eq(tenantDomains.id, domainId),
          eq(tenantDomains.tenantId, tenantId)
        )
      );
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar domínio" });
  }
});
```

---

### ✅ Tarefa 5.2.2: UI de Gerenciamento de Domínios (Admin)

**Arquivo**: `client/src/pages/admin-domains-page.tsx` (NOVO)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useTenant } from '@/contexts/tenant-context';

export default function AdminDomainsPage() {
  const { tenant } = useTenant();
  const [newDomain, setNewDomain] = useState('');
  
  const { data: domains, isLoading } = useQuery({
    queryKey: ['/api/tenant/domains'],
  });
  
  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      return apiRequest('/api/tenant/domains', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/domains'] });
      setNewDomain('');
    },
  });
  
  const verifyDomain = useMutation({
    mutationFn: async (domainId: string) => {
      return apiRequest(`/api/tenant/domains/${domainId}/verify`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/domains'] });
    },
  });
  
  const deleteDomain = useMutation({
    mutationFn: async (domainId: string) => {
      return apiRequest(`/api/tenant/domains/${domainId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/domains'] });
    },
  });
  
  if (isLoading) return <div>Carregando...</div>;
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Domínios</h1>
      
      {/* Subdomínio padrão */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">Subdomínio Padrão</h2>
        <p className="text-muted-foreground">
          {tenant?.subdomain}.minhainfluencer.com
        </p>
      </Card>
      
      {/* Adicionar domínio customizado */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Adicionar Domínio Customizado</h2>
        <div className="flex gap-2">
          <Input
            placeholder="exemplo.com.br"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <Button 
            onClick={() => addDomain.mutate(newDomain)}
            disabled={addDomain.isPending}
          >
            Adicionar
          </Button>
        </div>
      </Card>
      
      {/* Lista de domínios */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Domínios Customizados</h2>
        
        {domains?.map((domain: any) => (
          <Card key={domain.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{domain.domain}</p>
                <p className="text-sm text-muted-foreground">
                  {domain.verifiedAt ? '✅ Verificado' : '⏳ Aguardando verificação'}
                </p>
                
                {!domain.verifiedAt && domain.verificationToken && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    <p className="font-semibold">Instruções:</p>
                    <p>Adicione este registro TXT no seu DNS:</p>
                    <code className="block mt-1">
                      Nome: _verification.{domain.domain}<br/>
                      Valor: {domain.verificationToken}
                    </code>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {!domain.verifiedAt && (
                  <Button
                    size="sm"
                    onClick={() => verifyDomain.mutate(domain.id)}
                    disabled={verifyDomain.isPending}
                  >
                    Verificar
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteDomain.mutate(domain.id)}
                  disabled={deleteDomain.isPending}
                >
                  Remover
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        {domains?.length === 0 && (
          <p className="text-muted-foreground">Nenhum domínio customizado adicionado.</p>
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

**Arquivo**: `server/routes.ts`

```typescript
// ✅ MODIFICAR: Multer para salvar em pastas por tenant
const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.tenant?.id || 'default';
    const tenantUploadDir = path.join(uploadDir, tenantId); // /uploads/{tenantId}/
    
    // Criar pasta se não existir
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
```

---

### ✅ Tarefa 6.1.2: Servir Uploads com Verificação de Tenant

**Arquivo**: `server/routes.ts`

```typescript
// ✅ MODIFICAR: Verificar acesso antes de servir arquivo
app.use('/uploads/:tenantId/:filename', async (req, res, next) => {
  const requestedTenantId = req.params.tenantId;
  const currentTenantId = req.tenant?.id;
  
  // Verificar se está acessando arquivos do próprio tenant
  if (requestedTenantId !== currentTenantId) {
    return res.status(403).json({ message: "Acesso negado" });
  }
  
  next();
}, express.static(uploadDir));
```

---

## 6.2 Analytics por Tenant

### ✅ Tarefa 6.2.1: Filtrar Analytics

**Arquivo**: `server/routes.ts`

```typescript
// ✅ EXEMPLO: Analytics filtrado por tenant
app.get('/api/analytics/stats', requireAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    
    // Buscar views apenas do tenant
    const pageViews = await db.query.pageViews.findMany({
      where: (views, { eq }) => eq(views.tenantId, tenantId) // ✅ Filtrar
    });
    
    const bioClicks = await db.query.bioClicks.findMany({
      where: (clicks, { eq }) => eq(clicks.tenantId, tenantId) // ✅ Filtrar
    });
    
    res.json({
      totalViews: pageViews.length,
      totalClicks: bioClicks.length,
      // ... outras métricas
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar analytics" });
  }
});
```

---

## 6.3 WebSocket por Tenant

### ✅ Tarefa 6.3.1: Rooms por Tenant no WebSocket

**Arquivo**: `server/websocket.ts` (ou onde o WebSocket está configurado)

```typescript
// ✅ MODIFICAR: Criar rooms por tenant
wsService.on('connection', (socket, req) => {
  const tenantId = req.tenant?.id;
  
  if (!tenantId) {
    socket.close();
    return;
  }
  
  // Adicionar socket ao room do tenant
  socket.join(`tenant:${tenantId}`);
  
  console.log(`Socket conectado ao tenant: ${tenantId}`);
});

// ✅ MODIFICAR: Broadcast apenas para o tenant
function broadcastDataUpdate(type: string, action: string, data: any, tenantId: string) {
  io.to(`tenant:${tenantId}`).emit('data_update', {
    type,
    action,
    data,
  });
}
```

---

## 6.4 Checklist Fase 6

- [ ] 6.1.1: Uploads salvos em `/uploads/{tenantId}/`
- [ ] 6.1.2: Verificação de acesso a uploads
- [ ] 6.2.1: Analytics filtrado por tenant
- [ ] 6.3.1: WebSocket com rooms por tenant
- [ ] Notificações isoladas por tenant ✅
- [ ] Comunidade isolada por tenant ✅

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
import { tenants, tenantMembers, users, videos } from '../shared/schema';
import { storage } from '../server/storage';

describe('Tenant Isolation Tests', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;
  
  beforeEach(async () => {
    // Setup: Criar 2 tenants e 2 usuários
    const [t1] = await db.insert(tenants).values({
      slug: 'tenant1',
      displayName: 'Tenant 1',
      subdomain: 'tenant1',
    }).returning();
    tenant1Id = t1.id;
    
    const [t2] = await db.insert(tenants).values({
      slug: 'tenant2',
      displayName: 'Tenant 2',
      subdomain: 'tenant2',
    }).returning();
    tenant2Id = t2.id;
    
    // Criar usuários...
  });
  
  it('deve impedir que tenant1 acesse vídeos do tenant2', async () => {
    // Criar vídeo no tenant2
    const video = await storage.createVideo(tenant2Id, {
      title: 'Vídeo do Tenant 2',
      videoUrl: 'https://youtube.com/watch?v=test',
      description: 'Teste',
      type: 'video',
      categoryId: 'some-category',
    });
    
    // Tentar buscar vídeos do tenant1 (não deve incluir vídeo do tenant2)
    const tenant1Videos = await storage.getVideos(tenant1Id);
    
    expect(tenant1Videos).not.toContainEqual(
      expect.objectContaining({ id: video.id })
    );
  });
  
  it('deve permitir que tenant1 acesse apenas seus próprios cupons', async () => {
    // Criar cupom no tenant1
    const coupon1 = await storage.createCoupon(tenant1Id, {
      code: 'TENANT1',
      brand: 'Marca 1',
      // ... outros campos
    });
    
    // Criar cupom no tenant2
    const coupon2 = await storage.createCoupon(tenant2Id, {
      code: 'TENANT2',
      brand: 'Marca 2',
      // ... outros campos
    });
    
    const tenant1Coupons = await storage.getCoupons(tenant1Id);
    
    expect(tenant1Coupons).toContainEqual(
      expect.objectContaining({ id: coupon1.id })
    );
    expect(tenant1Coupons).not.toContainEqual(
      expect.objectContaining({ id: coupon2.id })
    );
  });
  
  // ... mais testes para posts, comments, analytics, etc.
});
```

---

### ✅ Tarefa 7.1.2: Testes Manuais

**Checklist de Testes Manuais:**

1. **Criar 2 tenants de teste:**
   - [ ] tenant1: `teste1.minhainfluencer.com`
   - [ ] tenant2: `teste2.minhainfluencer.com`

2. **Testar isolamento de dados:**
   - [ ] Criar vídeo em tenant1 → não aparece em tenant2 ✅
   - [ ] Criar cupom em tenant2 → não aparece em tenant1 ✅
   - [ ] Criar post em tenant1 → comunidade separada ✅
   - [ ] Analytics separados ✅

3. **Testar autenticação:**
   - [ ] Login em tenant1 → acesso apenas a tenant1 ✅
   - [ ] Trocar de tenant → dados diferentes ✅
   - [ ] Tentar acessar tenant2 com credenciais de tenant1 → negado ✅

4. **Testar uploads:**
   - [ ] Upload em tenant1 → salvo em `/uploads/tenant1/` ✅
   - [ ] Tentar acessar `/uploads/tenant2/` de tenant1 → negado ✅

5. **Testar domínios:**
   - [ ] Acessar por subdomínio → correto ✅
   - [ ] Adicionar domínio customizado → funciona ✅
   - [ ] Verificar domínio → validação correta ✅

---

## 7.2 Performance e Otimização

### ✅ Tarefa 7.2.1: Adicionar Índices de Performance

**Executar no banco:**

```sql
-- Índices críticos para performance multi-tenant
CREATE INDEX IF NOT EXISTS idx_videos_tenant_created ON videos(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_created ON posts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_active ON coupons(tenant_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_tenant_date ON page_views(tenant_id, created_at DESC);

-- Índices compostos para queries comuns
CREATE INDEX IF NOT EXISTS idx_tenant_members_lookup ON tenant_members(tenant_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(tenant_id, category_id, is_active);
```

---

### ✅ Tarefa 7.2.2: Implementar Cache por Tenant

**Arquivo**: `server/cache.ts` (NOVO - Opcional)

```typescript
// Cache em memória por tenant (opcional)
const tenantCache = new Map<string, Map<string, any>>();

export function getCachedData(tenantId: string, key: string) {
  return tenantCache.get(tenantId)?.get(key);
}

export function setCachedData(tenantId: string, key: string, data: any, ttl = 60000) {
  if (!tenantCache.has(tenantId)) {
    tenantCache.set(tenantId, new Map());
  }
  
  tenantCache.get(tenantId)!.set(key, data);
  
  // Auto-expiração
  setTimeout(() => {
    tenantCache.get(tenantId)?.delete(key);
  }, ttl);
}
```

---

## 7.3 Documentação

### ✅ Tarefa 7.3.1: Criar Guia de Onboarding

**Arquivo**: `ONBOARDING_TENANT.md` (NOVO)

```markdown
# Guia de Onboarding - Novo Tenant

## Passo 1: Criar Conta
1. Acesse `minhainfluencer.com/register`
2. Preencha os dados
3. Escolha seu subdomínio (ex: `seunome.minhainfluencer.com`)
4. Crie sua conta

## Passo 2: Configuração Inicial
1. Adicione seu logo
2. Configure cores da marca
3. Preencha informações de perfil
4. Conecte redes sociais

## Passo 3: Adicionar Conteúdo
1. Importe vídeos do YouTube
2. Cadastre cupons de desconto
3. Configure categorias
4. Crie posts na comunidade

## Passo 4: Convidar Equipe (Opcional)
1. Acesse Configurações → Equipe
2. Adicione emails dos membros
3. Defina permissões (admin, editor, membro)
4. Envie convites

## Passo 5: Domínio Customizado (Opcional)
1. Acesse Configurações → Domínios
2. Adicione seu domínio (ex: `seusite.com.br`)
3. Configure DNS conforme instruções
4. Verifique e ative
```

---

## 7.4 Deploy

### ✅ Tarefa 7.4.1: Preparar para Produção

**Checklist de Deploy:**

1. **Variáveis de Ambiente:**
   ```bash
   # .env.production
   NODE_ENV=production
   SESSION_SECRET=secret-super-seguro-aqui
   RAILWAY_DB_HOST=...
   RAILWAY_DB_PORT=...
   RAILWAY_DB_NAME=...
   RAILWAY_DB_USER=...
   RAILWAY_DB_PASSWORD=...
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Migração do Banco:**
   ```bash
   # Backup COMPLETO antes de aplicar
   npm run migrate:backfill
   npm run db:push --force
   ```

4. **Verificar:**
   - [ ] Todos os dados migrados corretamente
   - [ ] Tenant default criado
   - [ ] Memberships criados
   - [ ] Uploads funcionando
   - [ ] DNS configurado

---

## 7.5 Checklist Fase 7

- [ ] 7.1.1: Testes automatizados criados
- [ ] 7.1.2: Testes manuais executados
- [ ] 7.2.1: Índices de performance criados
- [ ] 7.2.2: Cache implementado (opcional)
- [ ] 7.3.1: Documentação de onboarding criada
- [ ] 7.4.1: Deploy em produção realizado
- [ ] Backup do banco antes do deploy ✅
- [ ] Plano de rollback preparado ✅

---

# Checklist Geral

## Banco de Dados ✅
- [ ] 4 novas tabelas criadas (tenants, tenant_members, tenant_invitations, tenant_domains)
- [ ] tenantId adicionado em todas as 37 tabelas
- [ ] Índices criados
- [ ] Constraints atualizados
- [ ] Dados migrados para tenant default
- [ ] isAdmin migrado para role

## Autenticação ✅
- [ ] Middleware resolveTenant criado
- [ ] Login multi-tenant implementado
- [ ] Sessão armazena tenantId + role
- [ ] Registro permite criar tenant
- [ ] Middleware de autorização por role

## Backend ✅
- [ ] Storage interface atualizada
- [ ] Todos os métodos filtram por tenant
- [ ] Todas as rotas usam tenant
- [ ] Bio page usa dados do tenant
- [ ] WebSocket com rooms por tenant

## Frontend ✅
- [ ] TenantContext criado
- [ ] TenantProvider integrado
- [ ] UI mostra nome do tenant
- [ ] Queries funcionam automaticamente

## Domínios ✅
- [ ] DNS wildcard configurado
- [ ] API de domínios criada
- [ ] UI de gerenciamento de domínios
- [ ] Verificação de domínios funcionando

## Features ✅
- [ ] Uploads isolados por tenant
- [ ] Analytics filtrado por tenant
- [ ] Comunidade isolada
- [ ] Gamificação isolada

## Testes e Deploy ✅
- [ ] Testes de isolamento executados
- [ ] Performance otimizada
- [ ] Documentação criada
- [ ] Deploy em produção

---

# Próximos Passos (Pós-Implementação)

## Features Futuras
1. **Planos e Billing**
   - Integração com Stripe
   - Limites por plano (vídeos, usuários, storage)
   - Upgrade/downgrade automático

2. **Analytics Avançado**
   - Dashboard por tenant
   - Comparação de performance
   - Relatórios exportáveis

3. **Automações**
   - Email marketing por tenant
   - Webhooks personalizados
   - Integrações com ferramentas externas

4. **Whitelabel Completo**
   - CSS customizado por tenant
   - Upload de logo e favicon
   - Template de emails customizável

---

# Suporte e Dúvidas

**Durante a Implementação:**
- Seguir este documento passo a passo
- Fazer backup antes de cada fase crítica
- Testar em ambiente de desenvolvimento primeiro
- Documentar problemas encontrados

**Após Implementação:**
- Monitorar performance e erros
- Coletar feedback dos primeiros tenants
- Iterar e melhorar continuamente

---

**Boa sorte com a implementação! 🚀**

*Última atualização: Novembro 2024*
