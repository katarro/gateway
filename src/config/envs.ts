import 'dotenv/config';
import * as joi from 'joi';

type Environment = 'development' | 'production' | 'test';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URIS_DEVELOPMENT: string; // ✅ Cambio
  GOOGLE_REDIRECT_URIS_PRODUCTION: string; // ✅ Agregado
  REDIS_PORT: number;
  REDIS_HOST: string;
  REDIS_PASSWORD: string;
  FRONTEND_URL_PRODUCTION: string;
  FRONTEND_URL_DEVELOPMENT: string;
  ENVIRONMENT: Environment;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.string().required(),
    GOOGLE_CLIENT_ID: joi.string().required(),
    GOOGLE_CLIENT_SECRET: joi.string().required(),
    GOOGLE_REDIRECT_URIS_DEVELOPMENT: joi.string().required(), // ✅ Cambio
    GOOGLE_REDIRECT_URIS_PRODUCTION: joi.string().required(), // ✅ Agregado
    REDIS_PORT: joi.number().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PASSWORD: joi.string().required(),
    ENVIRONMENT: joi
      .string()
      .valid('development', 'production', 'test')
      .default('development')
      .required(),
    FRONTEND_URL_PRODUCTION: joi.string().uri().required(),
    FRONTEND_URL_DEVELOPMENT: joi.string().uri().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  const missingVars = error.details
    .map((detail) => detail.context?.key)
    .join(', ');
  throw new Error(
    `Config validation error: no se encuentra la variable ${missingVars}`,
  );
}

const envVars: EnvVars = value as EnvVars;

// ✅ Función helper para obtener Frontend URL según el environment
const getFrontendUrl = (): string => {
  return envVars.ENVIRONMENT === 'production'
    ? envVars.FRONTEND_URL_PRODUCTION
    : envVars.FRONTEND_URL_DEVELOPMENT;
};

// ✅ Función helper para obtener Google Redirect URI según el environment
const getGoogleRedirectUri = (): string => {
  return envVars.ENVIRONMENT === 'production'
    ? envVars.GOOGLE_REDIRECT_URIS_PRODUCTION
    : envVars.GOOGLE_REDIRECT_URIS_DEVELOPMENT;
};

export const envs = {
  port: envVars.PORT,
  nats_servers: envVars.NATS_SERVERS,
  google_client_id: envVars.GOOGLE_CLIENT_ID,
  google_client_secret: envVars.GOOGLE_CLIENT_SECRET,
  google_redirect_uris: getGoogleRedirectUri(), // ✅ Cambio a dinámico
  redis_port: envVars.REDIS_PORT,
  redis_host: envVars.REDIS_HOST,
  redis_password: envVars.REDIS_PASSWORD,
  environment: envVars.ENVIRONMENT,
  frontend_url_production: envVars.FRONTEND_URL_PRODUCTION,
  frontend_url_development: envVars.FRONTEND_URL_DEVELOPMENT,
  frontend_url: getFrontendUrl(),
};

// ✅ Logs mejorados
console.log(`Environment: ${envs.environment}`);
console.log(`Frontend URL: ${envs.frontend_url}`);
console.log(`Google Redirect URI: ${envs.google_redirect_uris}`); // ✅ Agregado
