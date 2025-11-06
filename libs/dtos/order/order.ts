import { PartialProductDto } from "../product/partialProduct";

export class OrderDto{
    id: string;
    seller: string; //username
    amount: number;
    date: string;
    items: {
        id: string, 
        title: string, 
        price: number, 
        discountPercentage: number,
        amount: number, 
        total: number
    }[];
    
}