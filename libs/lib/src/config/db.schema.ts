import Joi from "joi";
import { baseSchema } from "./base.schema";

export const dbSchema = (prefix: string) => baseSchema.concat( 
    Joi.object({
        [`${prefix}_DB_URL`]: Joi.when('URL', {
            is: 'true',
            then: Joi.string().required(),
            otherwise: Joi.string().optional()
        }),
        [`MYSQL_${prefix}_HOST`]: Joi.when('URL', {
            is: 'false',
            then: Joi.string().required(),
            otherwise: Joi.string().optional()
        }),
        [`MYSQL_PORT`]: Joi.when('URL', {
            is: 'false',
            then: Joi.number().required(),
            otherwise: Joi.number().optional()
        }),
        [`MYSQL_USER`]: Joi.when('URL', {
            is: 'false',
            then: Joi.string().required(),
            otherwise: Joi.string().optional()
        }),
        [`MYSQL_PASSWORD`]: Joi.when('URL', {
            is: 'false',
            then: Joi.string().required(),
            otherwise: Joi.string().optional()
        }),
        [`${prefix}_DB_NAME`]: Joi.when('URL', {
            is: 'false',
            then: Joi.string().required(),
            otherwise: Joi.string().optional()
        })
    })
);