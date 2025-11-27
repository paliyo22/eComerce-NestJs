import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item';
import { DraftOrder } from './entities/draft-order';
import { SuccessDto } from 'libs/shared/respuesta';
import { DraftOrderDto } from 'libs/dtos/order/draft-order';
import { OrderDto } from 'libs/dtos/order/order';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepo: Repository<PurchaseOrder>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(DraftOrder)
    private readonly draftRepo: Repository<DraftOrder>
  ){}

  async createDraftOrder(userId: string, total: number, cartId?: string, productId?: string): Promise<SuccessDto<DraftOrderDto>> {
    try {
      const createDraftOrder = await this.draftRepo
        .create({
          userId: userId,
          total: total,
          productId: productId ?? null,
          cartId: cartId ?? null
        });
      const draftOrder = await this.draftRepo.save(createDraftOrder);

      return {
        success: true,
        data: DraftOrderDto.fromEntity(draftOrder)
      }
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al conectar con la base de datos de la orden'
      }; 
    }
  }

  async getOrder(userId: string, orderId: string): Promise<SuccessDto<OrderDto>> {
    try {
      const order = await this.orderRepo
        .createQueryBuilder('po')
        .leftJoinAndSelect('po.items', 'items')
        .where('po.id = uuid_to_bin(:orderId)', { orderId })
        .andWhere('po.user_id = uuid_to_bin(:userId)', { userId })
        .getOne();

      if (!order) return { success: false, code: 404, message: 'Orden no encontrada' };

      return { success: true, data: OrderDto.fromEntity(order) };
    } catch (err) {
      return { success: false, code: 500, message: err?.message ?? 'Error al obtener orden' };
    }
  }

  async getOrderList(userId: string, isShopping: boolean): Promise<SuccessDto<OrderDto[]>> {
    try {
      const qb = this.orderRepo
        .createQueryBuilder('po')
        .leftJoinAndSelect('po.items', 'items');

      if (isShopping) {
        qb.where('po.user_id = uuid_to_bin(:userId)', { userId });
      } else {
        qb.where('po.seller_id = uuid_to_bin(:userId)', { userId });
      }

      qb.orderBy('po.created', 'DESC');

      const orders = await qb.getMany();

      return { success: true, data: orders.map(o => OrderDto.fromEntity(o)) };
    } catch (err) {
      return { success: false, code: 500, message: err?.message ?? 'Error al listar órdenes' };
    }
  }

  async getDraftOrder(userId: string, draftId: number): Promise<SuccessDto<DraftOrderDto>> {
    try {
      const draft = await this.draftRepo
        .createQueryBuilder('d')
        .where('d.id = :draftId', { draftId })
        .andWhere('d.user_id = uuid_to_bin(:userId)', { userId })
        .getOne();

      if (!draft) {
        return {
          success: false,
          code: 404,
          message: 'Draft no encontrado'
        };
      }

      return {
        success: true,
        data: DraftOrderDto.fromEntity(draft)
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener el draft'
      };
    }
  }

}
