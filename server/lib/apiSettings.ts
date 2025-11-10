import { db } from '../db';
import { apiSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

interface ApiCredentials {
  googleClientId: string;
  googleClientSecret: string;
  youtubeApiKey: string;
  youtubeChannelId: string;
}

export class ApiCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiCredentialsError';
  }
}

let cachedCredentials: ApiCredentials | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getApiCredentials(): Promise<ApiCredentials> {
  const now = Date.now();
  
  if (cachedCredentials && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedCredentials;
  }

  const settings = await db.select().from(apiSettings).limit(1);
  
  if (!settings || settings.length === 0) {
    throw new ApiCredentialsError(
      'Credenciais de API não configuradas. Configure em /perfil/configuracoes/apis'
    );
  }

  const setting = settings[0];
  
  if (!setting.googleClientId || !setting.googleClientSecret || 
      !setting.youtubeApiKey || !setting.youtubeChannelId) {
    throw new ApiCredentialsError(
      'Credenciais de API incompletas. Verifique as configurações em /perfil/configuracoes/apis'
    );
  }

  cachedCredentials = {
    googleClientId: setting.googleClientId,
    googleClientSecret: setting.googleClientSecret,
    youtubeApiKey: setting.youtubeApiKey,
    youtubeChannelId: setting.youtubeChannelId,
  };
  
  cacheTimestamp = now;
  
  return cachedCredentials;
}

export function bustApiCredentialsCache(): void {
  cachedCredentials = null;
  cacheTimestamp = 0;
}

export async function getYoutubeApiKey(): Promise<string> {
  const credentials = await getApiCredentials();
  return credentials.youtubeApiKey;
}

export async function getYoutubeChannelId(): Promise<string> {
  const credentials = await getApiCredentials();
  return credentials.youtubeChannelId;
}

export async function getGoogleOAuthCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const credentials = await getApiCredentials();
  return {
    clientId: credentials.googleClientId,
    clientSecret: credentials.googleClientSecret,
  };
}
