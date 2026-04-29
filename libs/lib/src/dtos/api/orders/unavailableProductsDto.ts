export class UnavailableProductsDto {
    id: string;
    title: string;
    reason: string;

    constructor(id: string, title: string, reason: string){
        this.id = id;
        this.title = title;
        this.reason = reason;
    };
}