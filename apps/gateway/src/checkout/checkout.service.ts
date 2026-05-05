import { CreateDraftOrderDto, DraftOrder, DraftOrderOutputDto, 
    EStateStatus, SuccessDto, TransactionDto, UnavailableProductsDto, withRetry } from "@app/lib";
import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { errorManager } from '../helpers/errorManager';
import { firstValueFrom, from } from "rxjs";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CheckoutService {
    constructor (
        private readonly config: ConfigService, 
        @Inject('ORDER_SERVICE') 
        private readonly orderClient: ClientProxy,
        @Inject('REDIS_CLIENT')
        private redis: Redis
    ) {};

    private readonly logger = new Logger(CheckoutService.name);
    
    async createPaymentLink(accountId: string, draftOrderId: string): Promise<string> {
        try {
            const draftOrder = await firstValueFrom(
                this.orderClient.send<SuccessDto<DraftOrder>>(
                    { cmd: 'get_draft_order' },
                    { accountId, draftOrderId }
                ).pipe(withRetry())
            );

            if(!draftOrder.success){
                throw new HttpException(draftOrder.message!, draftOrder.code!)
            }

            if(draftOrder.data.total === 0){
                throw new HttpException('BAD_REQUEST', 400);
            }

            const client = new MercadoPagoConfig({ accessToken: this.config.get<string>('MP_ACCESS_TOKEN') });
            const preference = new Preference(client);
            const createdAt = new Date(draftOrder.data.created);
            const body = {
               items: [{
                    id: draftOrder.data.id,
                    title: 'EComerce de Palito',
                    quantity: 1,
                    currency_id: 'ARS',
                    unit_price: draftOrder.data.total,
                }],
                payer: {
                    email: draftOrder.data.contactEmail
                },
                back_urls: {
                    success: `${this.config.get<string>('FRONT_URL')}/checkout/success`,
                    failure: `${this.config.get<string>('FRONT_URL')}/checkout/failure`,
                    pending: `${this.config.get<string>('FRONT_URL')}/checkout/pending`,
                },
                notification_url: `${this.config.get<string>('BACK_URL')}/checkout/webhook/mp`,
                external_reference: draftOrder.data.id,
                expires: true,
                expiration_date_to: new Date(createdAt.getTime() + this.config.get<number>('PAYMENT_TIME')).toISOString(),
                auto_return: 'all',
                binary_mode: true  
            };

            const response = await firstValueFrom(
                from(preference.create({ body }))
                .pipe(withRetry(3)))
                .catch(() => { throw new HttpException('INTERNAL_ERROR', 500) });

            return response.init_point;
        } catch (err) {
            throw errorManager(err, CheckoutService.name);
        }
    }
    
    async webhookManager(id: string): Promise<void> {
        const client = new MercadoPagoConfig({ accessToken: this.config.get<string>('MP_ACCESS_TOKEN')! });
        const payment = new Payment(client);
        const paymentData = await firstValueFrom(
            from(payment.get({ id }))
            .pipe(withRetry(3, 60000, 600000)))
            .catch(() => undefined);
        if(!paymentData){
            this.logger.error(`Fail to recober the result of the payment: ${id}`);
        }else{
            const token = new TransactionDto(uuidv4(), true, EStateStatus.Pending);
            const cacheKey = `transaction:${token.uuid}`;
            if(paymentData.status === 'approved'){
                try {
                    const result = await firstValueFrom(
                        this.orderClient.send<SuccessDto<void>>(
                            { cmd: 'create_order' },
                            { draftOrderId: paymentData.external_reference, token }
                        ).pipe(withRetry(5, 60000, this.config.get<number>('MESSAGE_TIMEOUT')))
                    );
                    if(!result.success){
                        this.logger.fatal(`The paid order could not be processed: ${paymentData}`);
                    }
                } catch (err) {
                    const cache = await this.redis.get(cacheKey).catch(() => undefined);
                    if(cache){
                        const transaction = JSON.parse(cache) as TransactionDto;
                        if(transaction.status !== EStateStatus.Completed){
                            this.logger.fatal(`The paid order could not be processed: ${paymentData}`);
                        }
                    }else{
                        this.logger.warn(`Error caching transaction trace ${paymentData}`);
                    };
                }
            }else {
                try {
                    const result = await firstValueFrom(
                        this.orderClient.send<SuccessDto<void>>(
                            { cmd: 'cancel_draft_order' },
                            { draftOrderId: paymentData.external_reference, token }
                        ).pipe(withRetry(5, 60000, this.config.get<number>('MESSAGE_TIMEOUT')))
                    );

                    if(!result.success){
                        this.logger.log(`The unpaid order could not be processed: ${paymentData}`);
                    }
                } catch (err) {
                    const cache = await this.redis.get(cacheKey).catch(() => undefined);
                    if(cache){
                        const transaction = JSON.parse(cache) as TransactionDto;
                        if(transaction.status !== EStateStatus.Completed){
                            this.logger.log(`The unpaid order could not be processed: ${paymentData}`);
                        }
                    }else{
                        this.logger.warn(`Error caching transaction trace ${paymentData}`);
                    };
                }
                
            } 
        }
        
    }

    async freeOrderResult(draftOrderId: string, accountId: string, success: boolean): Promise<void> {
        const token = new TransactionDto(uuidv4(), false, EStateStatus.Pending);
        const cacheKey = `transaction:${token.uuid}`;
        try {
            await firstValueFrom( from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 120))
                .pipe(withRetry()))
                .catch(() => { throw new HttpException('INTERNAL_ERROR', 500) });
            let result: SuccessDto<void>;
            if(success){
                result = await firstValueFrom(
                    this.orderClient.send<SuccessDto<void>>(
                        { cmd: 'create_order' },
                        { draftOrderId, accountId, token }
                    ).pipe(withRetry())
                );
            }else {
                result = await firstValueFrom(
                    this.orderClient.send<SuccessDto<void>>(
                        { cmd: 'cancel_draft_order' },
                        { draftOrderId, accountId, token }
                    ).pipe(withRetry())
                );
            }

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            const cache = await this.redis.get(cacheKey).catch(() => undefined);
            if(cache){
                const transaction = JSON.parse(cache) as TransactionDto;
                if(transaction.status === EStateStatus.Completed){
                    return;
                };
                if(transaction.status === EStateStatus.Failed){
                    throw errorManager(err, CheckoutService.name);
                };
                throw errorManager(err, CheckoutService.name, token.uuid);
            };
            throw errorManager(err, CheckoutService.name, token.uuid);
        }
    }
    
    async getDraftOrderStatus(draftOrderId: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<EStateStatus>>(
                    { cmd: 'get_draft_order_status' },
                    { draftOrderId }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!)
            }

            return result.data!;
        } catch (err) {
            throw errorManager(err, CheckoutService.name);
        }
    }
    
    async setDraftOrder(accountId: string, dto: CreateDraftOrderDto): Promise<DraftOrderOutputDto | UnavailableProductsDto[]>{
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<DraftOrderOutputDto | UnavailableProductsDto[]>>(
                    { cmd: 'create_draft_order' },
                    { accountId, dto }
                ).pipe(withRetry())
            );

            if(!result.success){
                if(result.data){
                    return result.data;
                }
                throw new HttpException(result.message!, result.code!)
            }

            return result.data!;
        } catch (err) {
            throw errorManager(err, CheckoutService.name);
        }
    }   
}