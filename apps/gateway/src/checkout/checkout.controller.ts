import { BadRequestException, Body, Controller, ForbiddenException, 
    Get, HttpCode, Param, ParseBoolPipe, ParseUUIDPipe, Post, Query, Req, 
    UseGuards } from "@nestjs/common";
import { CheckoutService } from "./checkout.service";
import { CreateDraftOrderDto, DraftOrderOutputDto, ERole, getRoleGroup, 
    UnavailableProductsDto, WebhookDto } from "@app/lib";
import type { Request } from "express";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto"
import { JwtAuthGuard } from "../guards/jwtAuth.guard";
import type { JwtPayload } from "../interfaces/JwtPayload";
import { User } from "../decorators/authGuard.decorator";

@Controller('checkout')
export class CheckoutController {
    constructor(
        private readonly checkoutService: CheckoutService,
        private readonly config: ConfigService  
    ) {};

    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(201)
    async setDraftOrder(
        @User() data: JwtPayload,
        @Body() dto: CreateDraftOrderDto
    ): Promise<DraftOrderOutputDto | UnavailableProductsDto[]> {
        if(getRoleGroup(data.role) === ERole.Admin)
            throw new ForbiddenException(`Admin accounts can't make purchases`);

        if(dto.fromCart && dto.fromProduct)
            throw new BadRequestException('Provide either a product, a cartId or a cartProductId');
        

        if(dto.fromCart && (dto.fromCart.cartId && dto.fromCart.cartProductId)) 
            throw new BadRequestException('Provide either cartId or cartProductId'); 

        return this.checkoutService.setDraftOrder(data.accountId, dto);
    }

    @Get('/status/:draftOrderId')
    @UseGuards(JwtAuthGuard)
    async draftOrderStatus (
        @Param('draftOrderId', ParseUUIDPipe) draftOrderId: string
    ): Promise<string> {
        return this.checkoutService.getDraftOrderStatus(draftOrderId);
    }

    @Post('/order/:draftOrderId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(201)
    async freeOrderResult (
        @User('accountId') accountId: string,
        @Param('draftOrderId', ParseUUIDPipe) draftOrderId: string,
        @Query('success', ParseBoolPipe) success: boolean
    ): Promise<void>{
        return this.checkoutService.freeOrderResult(draftOrderId, accountId, success);
    }
    
    @Post('/webhook/mp')
    async webhookManager (
        @Body() dto: WebhookDto,
        @Req() req: Request
    ): Promise<void>{
        const signature = req.headers['x-signature'] as string;
        const request_id = req.headers['x-request-id'] as string;
        
        if(!signature || !request_id) return;
        if(dto.type !== 'payment') return;
        
        const result = signature.split(',');
        const ts = result[0].slice(3),
            v1 = result[1].slice(3);

        const manifest = `id:${dto.data.id};request-id:${request_id};ts:${ts};`;

        const hmac = crypto.createHmac('sha256', this.config.get<string>('MP_SECRET_KEY')!);
        hmac.update(manifest);

        const sha = hmac.digest('hex');

        if(sha !== v1){
            return;
        }else {
            this.checkoutService.webhookManager(dto.data.id);
        }
    }

    @Post('/:draftOrderId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(201)
    async createPaymentLink(
        @User('accountId') accountId: string,
        @Param('draftOrderId', ParseUUIDPipe) draftOrderId: string
    ): Promise<string> {
        return this.checkoutService.createPaymentLink(accountId, draftOrderId);
    }    
}
