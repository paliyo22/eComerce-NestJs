import { Meta } from "libs/entities/users";

export class MetaDto {
    created: Date;
    updated: Date;
    deletedBy: string | null;

    static fromEntity(meta: Meta): MetaDto {
        return {
            created: meta.created,
            updated: meta.updated,
            deletedBy: meta.deletedBy
        };
    }
}