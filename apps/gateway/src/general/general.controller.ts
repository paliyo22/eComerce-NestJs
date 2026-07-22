import { Controller, Get, HttpException, Param, 
    ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { GeneralService } from "./general.service";
import { EStateStatus, PartialProductDto } from "@app/lib";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";

@Controller()
export class GeneralController {
    constructor(
        private readonly generalService: GeneralService
    ){};

    @Get('/result/:token')
    @UseGuards(JwtAuthGuard)
    async transactionResult(
        @Param('token', ParseUUIDPipe) token: string
    ): Promise<void>{
        const result = await this.generalService.transactionResult(token);
        if(result === EStateStatus.Pending){
            throw new HttpException('', 102);
        };
        if(result === EStateStatus.Failed){
            throw new HttpException('FAILED', 500);
        };
    }

    @Get('/health')
    async healt(): Promise<string>{
        return 'Anda bien!!!';        
    }

    @Get('/search')
    async search (
        @Query('contain') contains: string
    ): Promise<{ products: PartialProductDto[], accounts: string[] }> {
        return this.generalService.search(contains);
    }












    //---------------------- Initial load for TESTING ---------------------------------
    @Get('/categories')
    async getCategories(): Promise<string[]>{
        return this.generalService.getCategories();        
    }

    @Post('/init')
    async initTestingData (): Promise<string> {
        return this.generalService.testingLoad();
    };
}