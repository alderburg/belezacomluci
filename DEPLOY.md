# Guia de Deploy no Railway

Este guia explica como fazer o deploy do "Beleza com Luci" no Railway usando o banco de dados da Locaweb.

## 📋 Pré-requisitos

- Conta no Railway (https://railway.app)
- Repositório no GitHub já configurado
- Credenciais do banco de dados Locaweb

## 🚀 Passos para Deploy

### 1. Importar Projeto do GitHub

1. Acesse https://railway.app/new
2. Faça login com sua conta GitHub
3. Clique em "Deploy from GitHub repo"
4. Selecione o repositório `belezacomluci`
5. Railway irá detectar automaticamente o projeto Node.js

### 2. Configurar Variáveis de Ambiente

No painel do Railway, vá em **Variables** e adicione:

#### Banco de Dados Locaweb (OBRIGATÓRIO)
```
LOCAWEB_DB_HOST=seu_host.postgresql.dbaas.com.br
LOCAWEB_DB_PORT=5432
LOCAWEB_DB_NAME=seu_banco_aqui
LOCAWEB_DB_USER=seu_usuario_aqui
LOCAWEB_DB_PASSWORD=sua_senha_aqui
```

#### Autenticação
```
SESSION_SECRET=sua_chave_secreta_session_aqui
```

**Nota:** As credenciais do Google/YouTube (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID) agora são configuradas através da interface de administração em `/perfil/configuracoes/apis` e armazenadas no banco de dados.

#### Configuração do Ambiente
```
NODE_ENV=production
```

#### URLs (Atualizar após deploy)
Depois que o Railway gerar a URL do seu app, você precisa atualizar:
```
BASE_URL=https://seu-app.up.railway.app
WEBSOCKET=https://seu-app.up.railway.app
```

### 3. Deploy Automático

O Railway irá automaticamente:
1. Instalar as dependências (`npm install`)
2. Executar o build (`npm run build`)
3. Iniciar o servidor (`npm start`)

### 4. Verificar Deploy

1. Acesse a URL gerada pelo Railway (ex: `https://seu-app.up.railway.app`)
2. Verifique se a página de login carrega corretamente
3. Teste o login com as credenciais padrão

### 5. Atualizar URLs Dinâmicas

Após o primeiro deploy, copie a URL do Railway e atualize as variáveis:
- `BASE_URL`
- `WEBSOCKET`

O Railway irá fazer um redeploy automático.

## 🔧 Configurações Importantes

### Porta do Servidor
O Railway atribui automaticamente uma porta através da variável `PORT`. O servidor já está configurado para usar essa variável.

### Health Check
O Railway verifica a saúde do app em `/api/health`. Endpoint já configurado.

### Banco de Dados Externo
O projeto está configurado para usar o PostgreSQL da Locaweb através das variáveis de ambiente. Não é necessário criar um banco no Railway.

### Build e Start
- **Build**: `npm run build` - Compila o frontend e backend
- **Start**: `npm start` - Inicia o servidor em produção

## 📊 Monitoramento

No painel do Railway você pode:
- Ver logs em tempo real
- Monitorar uso de recursos
- Configurar alertas
- Ver métricas de performance

## 🔄 Atualizações

Sempre que você fizer push para o branch `main` do GitHub, o Railway irá automaticamente:
1. Detectar as mudanças
2. Fazer o build novamente
3. Fazer o deploy da nova versão

## 🐛 Troubleshooting

### Erro de conexão com banco
- Verifique se todas as variáveis LOCAWEB_DB_* estão corretas
- Confirme que o servidor Locaweb permite conexões externas

### Erro 502 Bad Gateway
- Verifique os logs no Railway
- Confirme que o servidor está iniciando na porta correta (variável PORT)

### WebSocket não conecta
- Atualize a variável WEBSOCKET com a URL correta do Railway
- Verifique se a URL usa HTTPS (não HTTP)

## 💡 Dicas

1. **Custos**: Railway oferece $5 de crédito grátis por mês
2. **Domínio Custom**: Você pode adicionar seu próprio domínio nas configurações
3. **Logs**: Sempre verifique os logs se algo não funcionar
4. **SSL**: Railway fornece HTTPS automático para todas as apps

## 📞 Suporte

Se encontrar problemas:
- Verifique os logs no Railway Dashboard
- Consulte a documentação: https://docs.railway.app
- Verifique se o banco Locaweb está acessível
