#!/bin/bash

# Este script carrega as variáveis de ambiente do arquivo .env
# Certifique-se de que o arquivo .env existe com todas as credenciais necessárias

# Matar processos anteriores se existirem
pkill -f tsx 2>/dev/null || true
pkill -f node 2>/dev/null || true

# Aguardar um momento
sleep 3

# Executar o projeto sem HMR do Vite
npm run build && npm run start