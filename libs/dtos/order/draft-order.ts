import { DraftOrder } from "apps/order/src/entities/draft-order";

export class DraftOrderDto{
    cartId?: string;
    productId?: string;
    total: number;

    static fromEntity(item: DraftOrder): DraftOrderDto {
        return {
            cartId: item.cartId ?? undefined,
            productId: item.productId ?? undefined,
            total: item.total,
        };
    }
}