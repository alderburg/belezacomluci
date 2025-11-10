# 🌸 Beleza com Luci

Plataforma de beleza exclusiva com conteúdos premium, produtos digitais e cupons de desconto.

## 📋 Sobre o Projeto

"Beleza com Luci" é uma plataforma completa de beleza onde usuários podem:

- 🎥 Assistir vídeos exclusivos
- 📚 Baixar produtos digitais (e-books, cursos, PDFs)
- 🎁 Acessar cupons de desconto de marcas parceiras
- 💬 Participar da comunidade com posts e comentários
- 🏆 Completar missões e desafios de gamificação
- 📱 Experiência mobile-first totalmente responsiva

## 🚀 Tecnologias

### Frontend
- **React 18** + **TypeScript**
- **Vite** para build rápido
- **TailwindCSS** + **Shadcn/UI**
- **TanStack Query** para gerenciamento de estado
- **Wouter** para roteamento

### Backend
- **Node.js** + **Express**
- **TypeScript** com ESM
- **Passport.js** para autenticação
- **Drizzle ORM** para banco de dados
- **WebSocket** para notificações em tempo real

### Banco de Dados
- **PostgreSQL** (Locaweb)
- Migrações com Drizzle Kit

## 🏗️ Estrutura do Projeto

```
/
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── hooks/       # Custom hooks
│   │   └── contexts/    # Contextos React
├── server/              # Backend Express
│   ├── auth.ts         # Autenticação
│   ├── routes.ts       # Rotas da API
│   ├── db.ts           # Configuração do banco
│   └── websocket.ts    # WebSocket service
├── shared/             # Código compartilhado
│   └── schema.ts       # Schema do banco (Drizzle)
└── migrations/         # Migrações do banco
```

## ⚙️ Configuração Local

### 1. Clonar o Repositório

```bash
git clone https://github.com/alderburg/belezacomluci.git
cd belezacomluci
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Banco de Dados
LOCAWEB_DB_HOST=seu_host
LOCAWEB_DB_PORT=5432
LOCAWEB_DB_NAME=seu_banco
LOCAWEB_DB_USER=seu_usuario
LOCAWEB_DB_PASSWORD=sua_senha

# Configuração
SESSION_SECRET=sua_chave_secreta
NODE_ENV=development
```

### 4. Executar em Desenvolvimento

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:5000`

## 🚢 Deploy

### Railway

Veja o guia completo em [DEPLOY.md](./DEPLOY.md)

**Passos rápidos:**

1. Importe o repositório no Railway
2. Configure as variáveis de ambiente
3. O deploy será automático!

### Replit

O projeto já está configurado para funcionar no Replit:

1. Importe o repositório
2. Configure o arquivo `.env`
3. Execute `npm run dev`

## 📦 Scripts Disponíveis

```bash
npm run dev      # Desenvolvimento (Vite + Express)
npm run build    # Build para produção
npm start        # Iniciar em produção
npm run check    # Verificar tipos TypeScript
npm run db:push  # Aplicar mudanças no schema ao banco
```

## 🎨 Funcionalidades

### Para Usuários
- ✅ Sistema de autenticação completo
- ✅ Planos Free e Premium
- ✅ Acesso a vídeos exclusivos
- ✅ Download de produtos digitais
- ✅ Cupons de desconto
- ✅ Feed de comunidade
- ✅ Sistema de notificações
- ✅ Gamificação com missões e recompensas

### Para Administradores
- ✅ Painel administrativo completo
- ✅ Gerenciamento de vídeos
- ✅ Gerenciamento de produtos
- ✅ Gerenciamento de cupons
- ✅ Gerenciamento de usuários
- ✅ Sistema de banners/carrossel
- ✅ Sistema de popups
- ✅ Analytics de uso

## 🔒 Segurança

- Senhas hasheadas com scrypt
- Sessões seguras com PostgreSQL
- CORS configurado
- Proteção de rotas admin
- Validação de dados com Zod
- Limites de upload de arquivos

## 📱 Mobile

A aplicação é totalmente responsiva com:
- Interface adaptada para mobile
- Navegação bottom bar em mobile
- Componentes otimizados para toque
- Performance otimizada

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Autor

**Alderburg**
- GitHub: [@alderburg](https://github.com/alderburg)
- Email: ritialdeburg@gmail.com

## 🙏 Agradecimentos

- Comunidade React
- Shadcn/UI pelos componentes
- Railway pela hospedagem
- Locaweb pelo banco de dados

---

Feito com 💖 por Alderburg
