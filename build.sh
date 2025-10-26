
#!/bin/bash
set -e

echo "🧹 Limpando cache..."
rm -rf node_modules/.cache
rm -rf .vite
rm -rf dist

echo "📦 Instalando dependências..."
npm ci --legacy-peer-deps --prefer-offline

echo "🏗️ Compilando aplicação..."
npm run build

echo "✅ Build concluído com sucesso!"
