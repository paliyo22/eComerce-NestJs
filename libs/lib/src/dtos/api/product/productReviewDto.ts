export class ProductReviewDto{
    username: string;
    productId: string;
    rating: number;
    comment?: string;
    created: Date;

    constructor(username: string, productId: string, rating: number, comment?: string, created?: Date){
        this.username = username;
        this.productId = productId;
        this.rating = rating;
        this.comment = comment ? comment : undefined;
        this.created = created ? new Date(created) : new Date();
    };
}