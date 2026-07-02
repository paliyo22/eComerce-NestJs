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
        this.comment = comment;
        this.created = new Date(created);
    };
}