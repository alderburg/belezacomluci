#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Criando tabela de notificações automaticamente...');

const drizzle = spawn('npx', ['drizzle-kit', 'push', '--force'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Responder automaticamente às perguntas do Drizzle
drizzle.stdin.write('\n'); // Aceitar primeira opção para notifications
drizzle.stdin.write('\n'); // Aceitar primeira opção para user_notifications
drizzle.stdin.end();

drizzle.on('close', (code) => {
  if (code === 0) {
    console.log('Tabelas criadas com sucesso!');
  } else {
    console.error('Erro ao criar tabelas:', code);
  }
});