import Joi from "joi";

export const baseSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production').default('development'),
    SALT: Joi.number().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    REFRESH_TIME: Joi.number().default(86400000),
    ACCESS_TIME: Joi.number().default(600000),
    PAYMENT_TIME: Joi.number().default(1800000),
    INTERNAL_ADMIN_PASSWORD: Joi.string().required(),
    REDIS_HOST: Joi.string().default("redis"),
    REDIS_PORT: Joi.number().default(6379)
});