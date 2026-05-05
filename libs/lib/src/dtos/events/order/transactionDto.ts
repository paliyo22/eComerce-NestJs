import { EStateStatus } from "@app/lib/enums";

export class TransactionDto {
    uuid: string;
    isInternal: boolean;
    status: EStateStatus;
    
    constructor(uuid: string, isInternal: boolean, status: EStateStatus) {
        this.uuid = uuid;
        this.isInternal = isInternal;
        this.status = status;
    };
}