export class ProductReviewDto{
    username: string;
    productId: string;
    rating: number;
    comment?: string;
    created: Date;

    constructor(username: string, productId: string, rating: number, comment?: string, created?: Date){
        this.username = username;
        this.productId = productId;
        this.rating = Number(rating);
        this.comment = comment;
        this.created = created ? new Date(created) : new Date();
    };
}