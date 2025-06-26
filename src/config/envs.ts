import 'dotenv/config';
import * as joi from 'joi';

type Environment = 'development' | 'production' | 'test';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URIS: string;
  REDIS_PORT: number;
  REDIS_HOST: string;
  REDIS_PASSWORD: string;
  ENVIRONMENT: Environment;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.string().required(),
    GOOGLE_CLIENT_ID: joi.string().required(),
    GOOGLE_CLIENT_SECRET: joi.string().required(),
    GOOGLE_REDIRECT_URIS: joi.string().required(),
    REDIS_PORT: joi.number().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PASSWORD: joi.string().required(),
    ENVIRONMENT: joi
      .string()
      .valid('development', 'production', 'test')
      .default('development')
      .required(),
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

export const envs = {
  port: envVars.PORT,
  nats_servers: envVars.NATS_SERVERS,
  google_client_id: envVars.GOOGLE_CLIENT_ID,
  google_client_secret: envVars.GOOGLE_CLIENT_SECRET,
  google_redirect_uris: envVars.GOOGLE_REDIRECT_URIS,
  redis_port: envVars.REDIS_PORT,
  redis_host: envVars.REDIS_HOST,
  redis_password: envVars.REDIS_PASSWORD,
  environment: envVars.ENVIRONMENT,
};
