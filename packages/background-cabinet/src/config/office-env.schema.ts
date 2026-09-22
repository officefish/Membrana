import type { AppConfig } from './env.schema';

export interface OfficeEnv {
  url: string;
  token: string;
}

export type CabinetConfigWithOffice = AppConfig & {
  office: OfficeEnv | null;
};

export function parseOfficeEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined>): OfficeEnv | null {
  const url = env.OFFICE_URL?.trim() ?? '';
  const token = env.OFFICE_API_TOKEN?.trim() ?? '';
  if (!url || !token) return null;
  try {
    new URL(url);
  } catch {
    console.error('Invalid office environment variables:', { OFFICE_URL: ['Invalid url'] });
    process.exit(1);
  }
  return { url, token };
}
