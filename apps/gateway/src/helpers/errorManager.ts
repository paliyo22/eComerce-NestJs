import { HttpException } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { TimeoutError } from "rxjs";

export function errorManager(err, serviceName: string): HttpException {
    if (err instanceof HttpException) {
        return err;
    }
    if (err instanceof TimeoutError) {
        return new HttpException(`Service "${serviceName}" Failed, Try Again.`, 504);
    }
    if (err instanceof RpcException) {
        console.error(err);
        return new HttpException(
            `Internal Error. Service "${serviceName}" Unabailable`,
            502
        );
    }
    console.error(err);
    return new HttpException('Internal Error. Please try again later.', 500);
}