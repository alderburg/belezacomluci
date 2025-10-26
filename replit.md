# Overview

This is "Beleza com Luci", a beauty platform built for followers to access exclusive content, digital products, and discount coupons. The application serves as a comprehensive beauty community platform where users can watch exclusive videos, download digital products like e-books and courses, access discount coupons from partner brands, and engage with the community. The platform includes a subscription system with free and premium tiers, where premium content is gated behind paid subscriptions.

# Recent Changes

## 2025-10-26: Sistema de Diferenciação de Cursos (Vídeo Único vs Playlist)
- Implementado dois novos tipos de produto: `course_video` (Curso - Vídeo Único) e `course_playlist` (Curso - Playlist)
- Sistema agora detecta automaticamente o tipo ao inserir URL do YouTube no admin:
  - URLs com `list=` são identificadas como playlist e o tipo é alterado para `course_playlist`
  - URLs de vídeo único (sem `list=`) são identificadas como vídeo e o tipo é alterado para `course_video`
- ProductCard agora navega corretamente:
  - `course_video` → abre em `/video/{id}` (player de vídeo único)
  - `course_playlist` → abre em `/playlist/{id}` (player de playlist)
- Mantida compatibilidade com produtos antigos que têm `type='course'` (detecta automaticamente pela URL)
- Filtro "Cursos" na página /produtos inclui ambos os tipos (course_video e course_playlist)

## 2025-10-26: Configuração do Banco de Dados Railway
- Conectado ao banco de dados PostgreSQL do Railway
- Credenciais configuradas via variáveis de ambiente RAILWAY_DB_*
- Sistema funcionando com banco de dados externo

## 2025-10-14: Correção de Espaçamento em /meuperfil Desktop
- Corrigido padding-top da página /meuperfil para seguir o padrão das outras páginas
- Aplicado pt-16 (64px) no desktop e pt-32 (128px) no mobile no elemento <main>
- Resolvido problema onde título, subtítulo e botão voltar ficavam cobertos pela topbar

## 2025-10-14: Sistema de Banners na Página /bio
- Adicionada opção "Link da Bio" no formulário de cadastro de banners no admin
- A página /bio agora suporta banners dinâmicos cadastrados pelo admin
- Banners são exibidos verticalmente (um abaixo do outro), não em formato carrossel
- Banners respeitam configurações de ativação, ordem e período de exibição (data/hora início e fim)
- Integração completa com sistema de filtros e validação de banners ativos

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript**: Modern single-page application built with React 18, TypeScript for type safety, and Vite as the build tool
- **Styling**: TailwindCSS for utility-first styling with Shadcn/UI component library providing pre-built accessible components
- **Routing**: Wouter for lightweight client-side routing with protected routes for authenticated users
- **State Management**: TanStack Query for server state management, React Context for authentication state
- **Form Handling**: React Hook Form with Zod validation for type-safe form validation
- **Mobile-First Design**: Responsive sidebar navigation that adapts to mobile/desktop with useIsMobile hook

## Backend Architecture
- **Node.js + Express**: RESTful API server with Express.js framework
- **Authentication**: Passport.js with local strategy for username/password authentication
- **Session Management**: Express sessions with PostgreSQL session store for persistent login state
- **Password Security**: Scrypt-based password hashing with salt for secure credential storage
- **Middleware**: Request logging, JSON parsing, and error handling middleware

## Database Design
- **PostgreSQL**: Primary database with Drizzle ORM for type-safe database operations
- **Schema Structure**:
  - Users table with authentication credentials and admin flags
  - Subscriptions table linking users to plan types (free/premium)
  - Videos table with exclusive content flags and view tracking
  - Products table for digital downloads (e-books, courses, PDFs)
  - Coupons table with brand partnerships and expiration tracking
  - Banners table for homepage carousel advertisements
  - Posts and Comments for community features
  - Activity tracking for user engagement analytics

## Content Management
- **Video System**: Embedded video player with exclusive content restrictions based on subscription status
- **Digital Products**: File download system with usage tracking and access control
- **Coupon System**: Brand partnership integration with category filtering and usage analytics
- **Banner Carousel**: Monetizable advertising space with admin-controlled rotation

## Access Control
- **Role-Based Permissions**: Admin users have full CRUD access to all content via dedicated admin panel
- **Subscription Gates**: Premium content requires active subscription validation
- **Protected Routes**: Authentication middleware ensures proper access control

## User Experience Features
- **Activity Tracking**: Comprehensive user engagement analytics (videos watched, downloads, coupon usage)
- **Search and Filtering**: Category-based filtering for videos, products, and coupons
- **Community Features**: Forum-style posts and comments for user interaction
- **Responsive Design**: Mobile-optimized interface with collapsible sidebar navigation

# External Dependencies

## Database Services
- **Locaweb PostgreSQL**: External PostgreSQL database hosted by Locaweb (configured via environment variables)
- **Drizzle Kit**: Database migration and schema management tools
- **Connection**: The database is configured via the following environment variables:
  - `LOCAWEB_DB_HOST`: Database server hostname
  - `LOCAWEB_DB_PORT`: Database port (default: 5432)
  - `LOCAWEB_DB_NAME`: Database name
  - `LOCAWEB_DB_USER`: Database username
  - `LOCAWEB_DB_PASSWORD`: Database password

## Authentication & Sessions
- **Passport.js**: Authentication middleware with local strategy
- **Connect-PG-Simple**: PostgreSQL-backed session storage for persistent authentication

## Frontend Libraries
- **Radix UI**: Headless UI components for accessibility and consistent behavior
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date formatting and manipulation utilities

## Development Tools
- **Vite**: Fast build tool and development server
- **ESBuild**: Production bundle optimization
- **TypeScript**: Static type checking across the entire application
- **Replit Integration**: Development environment plugins for live editing

# Configurações de Portabilidade para Replit

Esta seção documenta as configurações críticas que garantem que o projeto funcione consistentemente em qualquer instância do Replit sem erros de resolução de módulos.

## Configurações Essenciais do Vite

O arquivo `vite.config.ts` deve usar a seguinte configuração padrão para garantir portabilidade:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "client"),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "client/src")
      },
      {
        find: "@shared", 
        replacement: path.resolve(__dirname, "shared")
      },
      {
        find: "@assets",
        replacement: path.resolve(__dirname, "attached_assets")
      }
    ]
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    hmr: false,
  },
});
```

## Correções Críticas de Paths

### 1. HTML Script Path
No arquivo `client/index.html`, usar caminho relativo:
```html
<script type="module" src="./src/main.tsx"></script>
```
Em vez de caminho absoluto `/src/main.tsx`

### 2. Server Vite Template Path  
No arquivo `server/vite.ts`, ajustar o replace para o caminho correto:
```typescript
template = template.replace(
  `src="./src/main.tsx"`,
  `src="./src/main.tsx?v=${nanoid()}"`,
);
```

### 3. Usar fileURLToPath para Compatibilidade
Sempre usar `fileURLToPath` em vez de `import.meta.dirname` para máxima compatibilidade:
```typescript
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## Dependências Essenciais

O projeto requer estas dependências críticas:
- `@paralleldrive/cuid2` - Para geração de IDs únicos
- Todas as dependências do `package.json` devem estar instaladas via `npm install`

## Comandos de Inicialização

Para garantir funcionamento em nova instância:
1. Copiar `.env.example` para `.env` e preencher as credenciais do banco Locaweb
2. `npm install` - Instalar todas as dependências
3. `npm run dev` - Executar em modo desenvolvimento

## Configuração do Ambiente

O projeto requer um arquivo `.env` na raiz com as seguintes variáveis:

```env
# Banco de dados Locaweb
LOCAWEB_DB_HOST=seu_host_aqui
LOCAWEB_DB_PORT=5432
LOCAWEB_DB_NAME=seu_banco_aqui
LOCAWEB_DB_USER=seu_usuario_aqui
LOCAWEB_DB_PASSWORD=sua_senha_aqui

# APIs externas
YOUTUBE_API_KEY=sua_chave_youtube
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret

# Configuração da aplicação
BASE_URL=https://seu-replit-url.replit.dev
WEBSOCKET=https://seu-replit-url.replit.dev
SESSION_SECRET=sua_chave_secreta
NODE_ENV=development
```

**IMPORTANTE**: O arquivo `.env` está no `.gitignore` e nunca deve ser commitado ao repositório por segurança.  

## Estrutura de Arquivos Crítica

A seguinte estrutura deve ser mantida:
```
/
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── ...
│   └── index.html
├── server/
│   ├── index.ts
│   └── vite.ts
├── shared/
├── vite.config.ts
├── tsconfig.json
└── package.json
```

Estas configurações garantem que o projeto funcione imediatamente em qualquer nova instância do Replit sem necessidade de correções manuais.

# Deploy no Railway

## Configuração do Projeto

O projeto está configurado para deploy no Railway com as seguintes configurações:

### Arquivos de Configuração
- `railway.json` - Configuração do Railway com health check
- `DEPLOY.md` - Guia completo de deploy

### Banco de Dados
O projeto usa o banco PostgreSQL da Locaweb (externo ao Railway):
- Conexão via variáveis de ambiente LOCAWEB_DB_*
- Migrações executadas automaticamente no startup
- Não é necessário provisionar banco no Railway

### Variáveis de Ambiente Necessárias no Railway
```
LOCAWEB_DB_HOST=seu_host.postgresql.dbaas.com.br
LOCAWEB_DB_PORT=5432
LOCAWEB_DB_NAME=seu_banco
LOCAWEB_DB_USER=seu_usuario
LOCAWEB_DB_PASSWORD=sua_senha
YOUTUBE_API_KEY=sua_chave_youtube
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
SESSION_SECRET=sua_chave_session_secreta
NODE_ENV=production
BASE_URL=https://seu-app.up.railway.app
WEBSOCKET=https://seu-app.up.railway.app
```

### Health Check
- Endpoint: `/api/health`
- Timeout: 100ms
- Retorna: status, uptime, timestamp, environment

### Build e Deploy
- Build: `npm run build` (Vite frontend + esbuild backend)
- Start: `npm start` (node dist/index.js)
- Porta: Automática via variável PORT do Railway
- Restart: ON_FAILURE com 10 retries

## Diferenças entre Replit e Railway

### Replit (Desenvolvimento)
- Porta: 5000 (fixa)
- Vite em modo dev com HMR
- WebSocket para hot reload
- Ambiente: development

### Railway (Produção)
- Porta: Dinâmica (variável PORT)
- Frontend servido como arquivos estáticos
- WebSocket para notificações
- Ambiente: production