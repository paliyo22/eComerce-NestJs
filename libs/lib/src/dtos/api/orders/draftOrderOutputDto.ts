import { DraftOrder } from '../../../entities/SQL/order/draftOrderEntity';

export class DraftOrderOutputDto{
    id: string;
    total: number;
    shippingAddress: string;

    constructor(item: DraftOrder) {
        this.id = item.id,
        this.total = item.total,
        this.shippingAddress = item.shippingAddress
    };
}
