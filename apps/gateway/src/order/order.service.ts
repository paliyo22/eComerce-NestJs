import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { MoneyVariations, OrderDto, PartialOrderDto, SaleDto, SuccessDto, withRetry } from '@app/lib';
import { errorManager } from '../helpers/errorManager';

@Injectable()
export class OrderService {
    constructor (
        @Inject('ORDER_SERVICE') 
        private readonly orderClient: ClientProxy
    ) {};
    
    async getOrder(accountId: string, orderId?: string, draftOrderId?: string): Promise<OrderDto> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<OrderDto>>(
                    {cmd: 'get_order'},
                    { accountId, orderId, draftOrderId }
                ).pipe(withRetry())
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'order');
        }
    }
    
    async getShoppingList(accountId: string): Promise<PartialOrderDto[]> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<PartialOrderDto[]>>(
                    {cmd: 'get_shopping_list'},
                    { accountId }
                ).pipe(withRetry())
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'order');
        }
    }

    async getSalesList(accountId: string): Promise<SaleDto[]> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<SaleDto[]>>(
                    {cmd: 'get_sales_list'},
                    { accountId }
                ).pipe(withRetry())
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'order');
        }
    }

    async getIncomeBetween(accountId: string, since?: Date, until?: Date): Promise<MoneyVariations> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<MoneyVariations>>(
                    {cmd: 'get_incomes'},
                    { accountId, since, until }
                ).pipe(withRetry())
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'order');
        }
    }

    async getOutgoBetween(accountId: string, since?: Date, until?: Date): Promise<MoneyVariations> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<MoneyVariations>>(
                    {cmd: 'get_outgo'},
                    { accountId, since, until }
                ).pipe(withRetry())
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'order');
        }
    }
}
