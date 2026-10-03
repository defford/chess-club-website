import { NextRequest } from 'next/server';

export type ConnectorAuthResult =
  | { authorized: true; actor: string }
  | { authorized: false; status: number; error: string };

export function requireMetaMuseConnector(request: NextRequest): ConnectorAuthResult {
  const configuredKey =
    process.env.MUSE_CONNECTOR_API_KEY ||
    process.env.MUSE_API_KEY;

  if (!configuredKey) {
    return {
      authorized: false,
      status: 503,
      error: 'Meta Muse connector is not configured on this server.',
    };
  }

  const authorization = request.headers.get('authorization');
  const bearer =
    authorization?.toLowerCase().startsWith('bearer ')
      ? authorization.slice(7).trim()
      : null;

  const suppliedKey =
    request.headers.get('x-api-key') ||
    request.headers.get('x-muse-api-key') ||
    bearer;

  if (!suppliedKey || suppliedKey !== configuredKey) {
    return {
      authorized: false,
      status: 401,
      error: 'Invalid connector API key.',
    };
  }

  return {
    authorized: true,
    actor: 'meta-muse',
  };
}
