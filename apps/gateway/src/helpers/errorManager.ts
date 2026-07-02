import { HttpException, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { TimeoutError } from "rxjs";

const globalLogger = new Logger('GlobalErrorHelper');

export function errorManager(err: any, serviceName: string): HttpException {
    if (err instanceof HttpException) {
        return err;
    }
    if (err instanceof TimeoutError) {
        return new HttpException('TIMEOUT', 504);
    }
    if (err instanceof RpcException) {
        globalLogger.error(`[${serviceName}] ${err.message ?? err}`, err.stack);
        return new HttpException('UNAVAILABLE', 502);
    }
    globalLogger.error(`[${serviceName}] ${err.message ?? err}`, err.stack);
    return new HttpException('INTERNAL_ERROR', 500);
}