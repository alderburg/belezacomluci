#!/bin/bash

# Definir variáveis de ambiente
export LOCAWEB_DB_HOST="portalblzluci.postgresql.dbaas.com.br"
export LOCAWEB_DB_PORT="5432"
export LOCAWEB_DB_NAME="portalblzluci"
export LOCAWEB_DB_USER="portalblzluci"
export LOCAWEB_DB_PASSWORD="Dr19122010@"
export SESSION_SECRET="beleza_luci_secret_key_2024_a8f2e9c7b1d4f6a3e8b5c2d7f9a1e4b6c3d8f2a5e7b9c1d4f6a8e2b5c7d9f1a3e6"
export NODE_ENV="development"
export YOUTUBE_API_KEY="AIzaSyDTcvQZujqiD9byqFqwojEdJ1ALxC-S-Po"
export GOOGLE_CLIENT_ID="728779368569-nt2qjlc4siecb70detohorb5s5tn04vr.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="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"
export BASE_URL="https://3c64593d-ce48-4525-8838-cc6ffb0f3840-00-3r9haef2yo2lp.picard.replit.dev"
export WEBSOCKET="https://3c64593d-ce48-4525-8838-cc6ffb0f3840-00-3r9haef2yo2lp.picard.replit.dev"

# Matar processos anteriores se existirem
pkill -f tsx 2>/dev/null || true
pkill -f node 2>/dev/null || true

# Aguardar um momento
sleep 3

# Executar o projeto sem HMR do Vite
npm run build && npm run start