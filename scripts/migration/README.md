# 🚀 Migração Locaweb → Railway

Scripts para migrar o banco de dados PostgreSQL da Locaweb para Railway.

## 📋 Pré-requisitos

Certifique-se de que as seguintes variáveis de ambiente estão configuradas:

### Locaweb (origem)
- `LOCAWEB_DB_HOST`
- `LOCAWEB_DB_PORT`
- `LOCAWEB_DB_NAME`
- `LOCAWEB_DB_USER`
- `LOCAWEB_DB_PASSWORD`

### Railway (destino)
- `RAILWAY_DB_HOST`
- `RAILWAY_DB_PORT`
- `RAILWAY_DB_NAME`
- `RAILWAY_DB_USER`
- `RAILWAY_DB_PASSWORD`

## 🔄 Processo de Migração

Execute os scripts na ordem:

### 1️⃣ Backup dos dados da Locaweb
```bash
tsx scripts/migration/01-backup-locaweb.ts
```

Este script:
- Conecta ao banco Locaweb
- Exporta todas as tabelas para arquivos JSON
- Salva em `scripts/migration/backup/`
- Gera um resumo do backup

### 2️⃣ Configurar tabelas na Railway
```bash
npm run db:push
```

Este comando:
- Usa o Drizzle para criar todas as tabelas
- Sincroniza o schema do código com o banco Railway
- Não precisa de migrações manuais

### 3️⃣ Importar dados para Railway
```bash
tsx scripts/migration/03-import-to-railway.ts
```

Este script:
- Lê os arquivos JSON do backup
- Importa os dados na ordem correta (respeitando foreign keys)
- Usa `ON CONFLICT DO NOTHING` para evitar duplicatas
- Mostra progresso e resumo

## 📦 Estrutura dos Backups

```
scripts/migration/backup/
├── users.json
├── subscriptions.json
├── videos.json
├── categories.json
├── products.json
├── coupons.json
├── ... (todas as tabelas)
└── _backup-summary.json
```

## ✅ Após a Migração

1. Atualize `server/db.ts` para usar as variáveis Railway
2. Teste a aplicação
3. Verifique se todos os dados foram migrados
4. Mantenha o backup da Locaweb por segurança

## 🔄 Rollback

Se precisar voltar para Locaweb:
1. Os backups estão em `scripts/migration/backup/`
2. Basta alterar `server/db.ts` para usar as variáveis LOCAWEB novamente

## 📞 Suporte

Em caso de problemas:
1. Verifique as variáveis de ambiente
2. Confirme a conectividade com ambos os bancos
3. Revise os logs de erro detalhados
