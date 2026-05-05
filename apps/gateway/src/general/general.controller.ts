import { Controller, Get, HttpException, Param, 
    ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { GeneralService } from "./general.service";
import { EStateStatus } from "@app/lib";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";

@Controller()
export class GeneralController {
    constructor(
        private readonly generalService: GeneralService
    ){};

    @Get('/result/:uuid')
    @UseGuards(JwtAuthGuard)
    async transactionResult(
        @Param('uuid', ParseUUIDPipe) uuid: string
    ): Promise<void>{
        const result = await this.generalService.transactionResult(uuid);
        if(result === EStateStatus.Pending){
            throw new HttpException('', 102);
        };
        if(result === EStateStatus.Failed){
            throw new HttpException('Transaction failed', 500);
        };
    }

    @Get('/health')
    async healt(): Promise<string>{
        return 'Anda bien!!!';        
    }
}