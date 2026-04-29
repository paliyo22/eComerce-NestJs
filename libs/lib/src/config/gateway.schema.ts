import Joi from "joi";
import { baseSchema } from "./base.schema";

export const gatewaySchema = baseSchema.concat(
    Joi.object({
        ACCEPTED_ORIGINS: Joi.string().required(),
        MP_SECRET_KEY: Joi.string().required(),
        MP_ACCESS_TOKEN: Joi.string().required(),
        FRONT_URL: Joi.string().required(),
        BACK_URL: Joi.string().required(),
        PORT: Joi.number().default(3000)
    })
);