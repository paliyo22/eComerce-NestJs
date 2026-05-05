import { HttpException, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { TimeoutError } from "rxjs";

const globalLogger = new Logger('GlobalErrorHelper');

export function errorManager(err: any, serviceName: string, data?: any): HttpException {
    if (err instanceof HttpException) {
        return err;
    }
    if (err instanceof TimeoutError) {
        return new HttpException({
            message: `Service "${serviceName}" Failed, Try Again.`, 
            data 
        }, 504);
    }
    if (err instanceof RpcException) {
        globalLogger.error(`[${serviceName}] ${err.message ?? err}`, err.stack);
        return new HttpException({ 
            message: `Internal Error. Service "${serviceName}" Unabailable`, 
            data 
        }, 502);
    }
    globalLogger.error(`[${serviceName}] ${err.message ?? err}`, err.stack);
    return new HttpException({
        message: 'Internal Error. Please try again later.', 
        data
    }, 500);
}