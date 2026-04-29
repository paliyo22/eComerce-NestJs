import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { RefreshJwtPayload } from "../interfaces/refreshJwtPayload";

export const RefreshUser = createParamDecorator(
    (data: keyof RefreshJwtPayload | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return data ? request.user[data] : request.user;
    }
);