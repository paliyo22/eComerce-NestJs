import { MetaA } from '../../../entities/SQL/account/metaAEntity';

export class MetaDto {
    created: Date;
    updated: Date;

    constructor(meta: MetaA){
        this.created = new Date(meta.created);
        this.updated = new Date(meta.updated);
    };
}