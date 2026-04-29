import { CreateDraftOrderDto, DraftOrder, DraftOrderOutputDto, 
    EStateStatus, SuccessDto, UnavailableProductsDto, withRetry } from "@app/lib";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { errorManager } from '../helpers/errorManager';
import { firstValueFrom } from "rxjs";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CheckoutService {
    constructor (
        private readonly config: ConfigService, 
        @Inject('ORDER_SERVICE') 
        private readonly orderClient: ClientProxy
    ) {};
    
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

            const client = new MercadoPagoConfig({ accessToken: this.config.get<string>('MP_ACCESS_TOKEN')! });
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

            const response = await preference.create({ body });
            return response.init_point;

        } catch (err) {
            throw errorManager(err, 'checkout');
        }
    }
    
    async webhookManager(id: string): Promise<void> {
        try {
            const client = new MercadoPagoConfig({ accessToken: this.config.get<string>('MP_ACCESS_TOKEN')! });
            const payment = new Payment(client);
            const paymentData = await payment.get({ id });
            
            if(paymentData.status === 'approved'){
                const result = await firstValueFrom(
                    this.orderClient.send<SuccessDto<void>>(
                        { cmd: 'create_order' },
                        { draftOrderId: paymentData.external_reference }
                    ).pipe(withRetry())
                );

                if(!result.success){
                    console.error(result.message!);
                }
            }else {
                const result = await firstValueFrom(
                    this.orderClient.send<SuccessDto<void>>(
                        { cmd: 'cancel_draft_order' },
                        { draftOrderId: paymentData.external_reference }
                    ).pipe(withRetry())
                );

                if(!result.success){
                    console.error(result.message!);
                }
            }
        } catch (err) {
            errorManager(err, 'checkout');
        }
    }

    async freeOrderResult(draftOrderId: string, accountId: string, success: boolean): Promise<void> {
        try {
            let result: SuccessDto<void>;
            if(success){
                result = await firstValueFrom(
                    this.orderClient.send<SuccessDto<void>>(
                        { cmd: 'create_order' },
                        { draftOrderId, accountId }
                    ).pipe(withRetry())
                );
            }else {
                result = await firstValueFrom(
                    this.orderClient.send<SuccessDto<void>>(
                        { cmd: 'cancel_draft_order' },
                        { draftOrderId }
                    ).pipe(withRetry())
                );
            }

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            throw errorManager(err, 'checkout');
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
            throw errorManager(err, 'checkout');
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
            throw errorManager(err, 'checkout');
        }
    }   
}