const required = [
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'JWT_SECRET',
  'FRONTEND_URL',
  'MAILER_HOST',
  'MAILER_PORT',
  'MAILER_USER',
  'MAILER_PASSWORD',
];

export function validateEnv(env: Record<string, unknown>) {
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
  // NODE_ENV decides schema sync and Swagger, so a typo must not fall through to dev
  if (!['development', 'test', 'production'].includes(String(env.NODE_ENV))) {
    throw new Error('NODE_ENV must be development, test or production');
  }
  if (String(env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return env;
}
