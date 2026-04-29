export class MoneyVariations {
    since: Date; 
    until: Date; 
    total: number;

    constructor(since: Date, until: Date, total: number){
        this.since = new Date(since);
        this.until = new Date(until);
        this.total = total;
    }
}