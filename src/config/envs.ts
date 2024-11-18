import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string;
  JWT_SECRET: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.string().required(),
    JWT_SECRET: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  const missingVars = error.details
    .map((detail) => detail.context?.key)
    .join(', ');
  throw new Error(
    `Config validation error: no se ecnuentra la variable ${missingVars}`,
  );
}

const envVars: EnvVars = value as EnvVars;

export const envs = {
  port: envVars.PORT,
  nats_servers: envVars.NATS_SERVERS,
  jwt_secret: envVars.JWT_SECRET,
};
