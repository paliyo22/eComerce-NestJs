import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartialProductDto, ProductDto, CreateProductDto, UpdateProductDto, 
  CreateReviewDto, Product, Category, Review, Tag, Image, MetaP, SuccessDto, 
  EProductCategory, ProductOrderDto, EAccountStatus, UnavailableProductsDto, 
  withRetry, errorMessage, badRequest, unauthorized, banned, deleted, notFound, 
  notAvailable, AccountDto, AccountReviewDto, ProductReviewDto, PartialAccountDto, 
  TransactionDto, EStateStatus, uuidTransformer,
  CreateAccountDto} from '@app/lib';
import { In, Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, from, retry, timeout } from 'rxjs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';

@Injectable()
export class ProductService {
  constructor(
    private readonly config: ConfigService, 
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(MetaP)
    private readonly metaRepository: Repository<MetaP>,
    @Inject('ACCOUNT_SERVICE') 
    private readonly accountClient: ClientProxy,
    @Inject('CART_SERVICE') 
    private readonly cartClient: ClientProxy,
    @Inject('REDIS_CLIENT')
    private redis: Redis
  ) {
    this.subscriber = this.redis.duplicate();
    this.setupGlobalSubscriber();
  }

  private subscriber: Redis;

  private responseEmitter = new EventEmitter();

  private setupGlobalSubscriber() {
    const pattern = 'transaction:done:*';
    this.subscriber.psubscribe(pattern);
    this.subscriber.on('pmessage', (_, channel, message) => {
      this.responseEmitter.emit(channel, message);
    });
    this.subscriber.on('error', (err) => {
      this.logger.error('Global subscriber error', err);
    });
  }

  private readonly logger = new Logger(ProductService.name);


  private async deleteFromCarts(productIds: string[]): Promise<void> {
    await firstValueFrom(
      this.cartClient.emit('delete.products.from.carts', { productIds })
      .pipe(retry(1), timeout(100))
    ).catch(() => {
      this.logger.error('Failed to emit the message from the method "deleteFromCarts"');
    });
  }

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(luaScript, 1, lockKey, token).catch(() => {});
  }

  private async waitForTransaction(token: TransactionDto, timeoutMs: number): Promise<'completed' | 'failed'> {    
    return new Promise((resolve) => {
      const channel = `transaction:done:${token.uuid}`;
      const handleMessage = (status: string) => {
        cleanup();
        resolve(status === EStateStatus.Completed ? 'completed' : 'failed');
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.responseEmitter.removeListener(channel, handleMessage);
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve('failed');
      }, timeoutMs);

      this.responseEmitter.on(channel, handleMessage);
    });
  }

  private async deleteCache(cache: 'product' | 'featured' | 'myProducts', id?: string){
    switch(cache){
      case 'featured':
        await this.redis.del(`featured:10`).catch(() => {});
        break;
      case 'myProducts':
        await this.redis.del(`myProducts:${id}`).catch(() => {});
        break;
      case 'product':
        await this.redis.del(`product:${id}`).catch(() => {});
        break;
    }
  }

  async check(token: TransactionDto): Promise<'completed' | 'failed' | 'try'> {
    const timeout = token.isInternal ? (this.config.get<number>('MESSAGE_TIMEOUT') + 1000) : 3100;
    const cacheKey = `transaction:${token.uuid}`;
    const cached = await firstValueFrom(from(this.redis.get(cacheKey)).pipe(withRetry(3))).catch(() => undefined);
    const lock = `lock:${token.uuid}`;
    const locked = await this.redis.set(lock, token.uuid, 'EX', 100, 'NX').catch(() => undefined);
    if(!locked){
      return await this.waitForTransaction(token, timeout);
    }else{
      if(cached){
        const result = JSON.parse(cached) as TransactionDto;
        if(result.status !== EStateStatus.Pending){
          const lock = `lock:${token.uuid}`;
          await this.releaseLock(lock, token.uuid).catch(() => {});    
          return result.status === EStateStatus.Completed ? 'completed' : 'failed';
        }
      }else{
        await firstValueFrom(
          from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 3600))
          .pipe(withRetry(3)))
          .catch(() => {});
      };
      return 'try';
    } 
  }

  async getTotal(category?: EProductCategory): Promise<SuccessDto<number>> {
    let lockKey: string;
    const token = uuidv4();
    try {
      let total = 0;
      let cacheKey: string; 
       
      if(!category){
        cacheKey = `total`;
        const cached = await this.redis.get(cacheKey).catch(() => {});
        if (cached) {
          return { 
            success: true, 
            data: Number(cached)
          };
        }

        lockKey = 'lock:total';
        const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
        if (!lock) return;

        total = await this.productRepository
          .createQueryBuilder('p')
          .innerJoin('p.meta', 'm')
          .where('m.deletedBy IS NULL')
          .andWhere('p.stock > 0')
          .getCount();
      }else{
        cacheKey = `total:${category}`;
        const cached = await this.redis.get(cacheKey).catch(() => {});
        if (cached) {
          return { 
            success: true, 
            data: Number(cached)
          };
        }

        lockKey = `lock:total:${category}`;
        const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
        if (!lock) return;

        total = await this.productRepository
          .createQueryBuilder('p')
          .innerJoin('p.meta', 'm')
          .where('m.deletedBy IS NULL')
          .innerJoin('p.category', 'c')
          .andWhere('c.slug = :category', { category })
          .getCount();
      }
      
      await this.redis.set(cacheKey, total, 'EX', 30).catch(() => {});
      await this.releaseLock(lockKey, token).catch(() => {});
      
      return {
        success: true,
        data: total
      };
    } catch (err: any) {
      await this.releaseLock(lockKey, token).catch(() => {});
      return errorMessage(ProductService.name, err);
    }
  }

  async getMyProductList(accountId: string, limit = 50): Promise<SuccessDto<PartialProductDto[]>> {
    const lockKey = `lock:my_products:${accountId}`;
    const token = uuidv4();
    try {
      const cacheKey = `myProducts:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as PartialProductDto[] 
        };
      }

      const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
      if (!lock) return;
      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
        .orderBy('m.created', 'DESC')
        .take(limit)
        .getMany();

      const data = products.map((p) => new PartialProductDto(p));
      if(data.length){
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
      }
      
      return { 
        success: true, 
        data 
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }finally{
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }

  async getProductList(limit = 20, offset = 0): Promise<SuccessDto<PartialProductDto[]>> {
    const lockKey = `lock:products:${limit}:${offset}`;
    const token = uuidv4();
    try {
      const cacheKey = `products:${limit}:${offset}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as PartialProductDto[] 
        };
      }

      const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
      if (!lock) return;
      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deletedBy IS NULL')
        .andWhere('p.stock > 0')
        .orderBy('p.ratingAvg', 'DESC')
        .take(limit)
        .skip(offset)
        .getMany();

      const data = products.map((p) => new PartialProductDto(p));
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});

      return { 
        success: true, 
        data 
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }finally{
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }

  async getProductByCategory(category: EProductCategory, limit = 20, offset = 0): Promise<SuccessDto<PartialProductDto[]>> {
    const lockKey = `lock:category:${category}:${limit}:${offset}`;
    const token = uuidv4();
    try {
      const cacheKey = `category:${category}:${limit}:${offset}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as PartialProductDto[] 
        };
      }
      
      const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
      if (!lock) return;
      
      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deletedBy IS NULL')
        .andWhere('c.slug = :category', { category })
        .andWhere('p.stock > 0')
        .orderBy('p.ratingAvg', 'DESC')
        .take(limit) 
        .skip(offset)
        .getMany();

      const data = products.map((p) => new PartialProductDto(p));
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});

      return {
        success: true,
        data 
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }finally{
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }

  async getFeatured(limit = 10): Promise<SuccessDto<PartialProductDto[]>> {
    const lockKey = `lock:featured:${limit}`;
    const token = uuidv4();
    try {
      const cacheKey = `featured:${limit}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as PartialProductDto[] 
        };
      };
  
      const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
      if (!lock) return;
  
      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deletedBy IS NULL')
        .andWhere('p.stock > 0')
        .orderBy('p.ratingAvg', 'DESC')
        .take(limit)
        .getMany();

      const data = products.map((p) => new PartialProductDto(p));
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }finally{
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }

  async searchProduct(contains: string, limit = 50): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const normalized = contains.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

      if(!normalized){
        return {
          success: true,
          data: []
        };
      }

      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .addSelect(
          'MATCH(p.title, p.description) AGAINST (:text IN BOOLEAN MODE)',
          'relevance'
        )
        .where('m.deletedBy IS NULL')
        .andWhere(
          'MATCH(p.title, p.description) AGAINST (:text IN BOOLEAN MODE)',
          { text: `*${normalized}*` }
        )
        .orderBy('relevance', 'DESC')
        .setParameter('text', `*${normalized}*`)
        .take(limit)
        .getMany();

      if (!products.length) {
        const fallback = await this.productRepository
          .createQueryBuilder('p')
          .innerJoin('p.meta', 'm')
          .innerJoinAndSelect('p.category', 'c')
          .leftJoinAndSelect('p.tags', 't')
          .leftJoinAndSelect('p.images', 'i')
          .where('m.deletedBy IS NULL')
          .andWhere(
            '(p.title LIKE :text OR p.description LIKE :text OR p.brand LIKE :text)',
            { text: `%${normalized}%` }
          )
          .orderBy('p.title', 'ASC')
          .take(limit)
          .getMany();
          
        return {
          success: true,
          data: fallback.map((p) => new PartialProductDto(p))
        };
      }
      
      return {
        success: true,
        data: products.map((p) => new PartialProductDto(p))
      };

    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async createProduct(accountId: string, product: CreateProductDto): Promise<SuccessDto<ProductDto | string>> {
    try {
      const category = await this.categoryRepository
        .createQueryBuilder('c')
        .where('c.slug = :slug', { slug: product.category })
        .getOne();

      if (!category) {
        return notFound;
      }

      let saveId: string | undefined;
      await this.productRepository.manager.transaction(async manager => {
        const saved = manager.create(Product, {
          title: product.title,
          description: product.description,
          price: product.price,
          discountPercentage: product.discountPercentage ?? 0,
          stock: product.stock,
          brand: product.brand,
          weight: product.weight,
          physical: product.physical,
          warrantyInfo: product.warrantyInfo ?? null,
          shippingInfo: product.shippingInfo ?? null,
          thumbnail: product.thumbnail ?? null,
          categoryId: category.id
        }); 
        await manager.save(saved, { reload: false });
        saveId = saved.id;
        await manager.save(MetaP, { productId: saveId, accountId: accountId })

        if (product.tags) {
          const normalizedTitles = product.tags.map(t => t.toLowerCase().trim())
          .filter(t => t.length > 0);

          if (normalizedTitles.length) {
            let tags: Tag[] = [];
            const existingTags = await manager.find(Tag, {
              where: { title: In(normalizedTitles) },
            });

            if(existingTags.length === normalizedTitles.length){
              tags = existingTags;
            }else{
              const existingTitles = existingTags.map(t => t.title);
              const newTitles = normalizedTitles.filter(title => !existingTitles.includes(title));
              
              const createdTags = await manager.save(Tag, newTitles.map(title => ({ title })));
              tags = [...existingTags, ...createdTags];
            }

            await manager.createQueryBuilder()
              .insert()
              .into('prod_x_tag')
              .values(tags.map(t => ({
                product_id: uuidTransformer.to(saveId),
                tag_id: t.id
              })))
              .execute();
          }
        }

        if (product.images) {
          const normalizedImages = product.images.map(t => t.toLowerCase().trim())
            .filter(t => t.length > 0);
          
          await manager.save(Image, normalizedImages.map(image => ({ productId: saveId, link: image})));
        }
      }); 
      
      const result = await this.getProductById(saveId);
      if(!result.success){
        return {
          success: true,
          data: saveId
        };
      };

      return result;
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async updateDiscount(accountId: string, productId: string, discount: number): Promise<SuccessDto<void>> {
    try {
      if(discount > 100 || discount < 0){
        return badRequest;
      }
      const product = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .where('p.id = :productId', { productId: uuidTransformer.to(productId) })
        .getOne();

      if (!product) {
        return notFound;
      }

      if (product.meta.accountId !== accountId) {
        return unauthorized;
      }

      if (product.meta.deletedBy){
        if(product.meta.deletedBy !== accountId){
          return banned
        }else{
          return deleted;
        }
      }  
      
      await this.productRepository.update({id: productId}, { discountPercentage: Math.round(discount) });

      this.deleteCache('product', productId);
      this.deleteCache('featured');
      this.deleteCache('myProducts', accountId);

      return {
        success: true
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err)
    }
  }

  async updatePrice(accountId: string, productId: string, price: number): Promise<SuccessDto<void>> {
    try {
      if(price < 0) {
        return badRequest;
      }
      const product = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .where('p.id = :productId', { productId: uuidTransformer.to(productId) })
        .getOne();

      if (!product) {
        return notFound;
      }

      if (product.meta.accountId !== accountId) {
        return unauthorized;
      }

      if (product.meta.deletedBy){
        if(product.meta.deletedBy !== accountId){
          return banned
        }else{
          return deleted;
        }
      }  

      await this.productRepository.update({id: productId}, { price });

      this.deleteCache('product', productId);
      this.deleteCache('featured');
      this.deleteCache('myProducts', accountId);

      return { 
        success: true
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async updateStock(accountId: string, productId: string, stock: number): Promise<SuccessDto<void>> {
    try {
      if(stock < 0){
        return badRequest;
      }

      const product = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .where('p.id = :productId', { productId: uuidTransformer.to(productId) })
        .getOne();

      if (!product) {
        return notFound;
      }

      if (product.meta.accountId !== accountId) {
        return unauthorized;
      }

      if (product.meta.deletedBy){
        if(product.meta.deletedBy !== accountId){
          return banned
        }else{
          return deleted;
        }
      }

      await this.productRepository.update({id: productId}, { stock });

      this.deleteCache('product', productId);
      this.deleteCache('featured');
      this.deleteCache('myProducts', accountId);

      return {
        success: true
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async getProductById(productId: string): Promise<SuccessDto<ProductDto>> {
    const lockKey = `lock:product:${productId}`;
    const token = uuidv4();
    try {
      const cacheKey = `product:${productId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as ProductDto
        };
      }
      
      const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
      if (!lock) return;
      
      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .leftJoinAndSelect('p.reviews', 'r')
        .where('p.id = :id', { id: uuidTransformer.to(productId) })
        .getOne();

      if (!product) {
        return notFound;
      }

      if(product.meta.deletedBy && product.meta.deletedBy !== product.meta.accountId) {
        return banned;
      }

      const accountIds = product.reviews.map((r) => r.accountId);
      accountIds.push(product.meta.accountId);

      const accountList = await firstValueFrom(
        this.accountClient.send<SuccessDto<AccountDto[]>>(
          { cmd: 'get_account_list_info'},
          { accountIds }
        )
      );

      if(!accountList.success){ 
        this.logger.warn('Error al encontrar la cuenta')
        return {
          success: accountList.success,
          code: accountList.code,
          message: accountList.message
        };
      };
      
      const data = new ProductDto(product, accountList.data!);
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});

      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }finally{
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }

  async deleteProduct(accountId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .where('p.id = :productId', { productId: uuidTransformer.to(productId) })
        .getOne(); 

      if (!product) {
        return notFound;
      }

      if (product.meta.accountId !== accountId) {
        return unauthorized;
      }

      if(product.meta.deletedBy){
        if(product.meta.deletedBy !== accountId){
          return banned
        }else {
          return badRequest;
        }
      }

      await this.productRepository.manager.transaction(async manager => {
        await manager.createQueryBuilder()
          .update(Product)
          .set({ stock: 0 })
          .where('id = :productId', { productId: uuidTransformer.to(productId) })
          .execute();
          
        await manager.createQueryBuilder()
          .update(MetaP)
          .set({ deletedBy: accountId, deleted: new Date() })
          .where('productId = :productId', { productId: uuidTransformer.to(productId) })
          .execute();
      });
      
      this.deleteFromCarts([productId]);

      this.deleteCache('product', productId);
      this.deleteCache('featured');
      this.deleteCache('myProducts', accountId);

      return {
        success: true
      }
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async restoreProduct(accountId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .where('p.id = :productId', { productId: uuidTransformer.to(productId) })
        .getOne(); 

      if (!product) {
        return notFound;
      }

      if (product.meta.accountId !== accountId) {
        return unauthorized;
      }

      if(!product.meta.deletedBy){
        return badRequest;
      }
      
      if(product.meta.deletedBy !== accountId){
        return banned
      }

      await this.metaRepository
        .createQueryBuilder()
        .update(MetaP)
        .set({ deletedBy: null, deleted: null })
        .where('productId = :productId', { productId: uuidTransformer.to(productId) })
        .execute();

      this.deleteCache('product', productId);
      this.deleteCache('myProducts', accountId);

      return {
        success: true
      }
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async updateProduct(accountId: string, productId: string, newProduct: UpdateProductDto): Promise<SuccessDto<ProductDto>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .leftJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('p.id = :id', { id: uuidTransformer.to(productId) })
        .getOne();

      if (!product) {
        return notFound;
      }

      if (product.meta.accountId !== accountId) {
        return unauthorized;
      }

      if (product.meta.deletedBy) {
        return product.meta.deletedBy !== accountId ? banned : deleted;
      }

      await this.productRepository.manager.transaction(async manager => {

        const directFields = ['title', 'description', 'price', 'discountPercentage', 'stock', 'brand', 'weight', 'warrantyInfo', 'shippingInfo', 'physical', 'thumbnail'];
        directFields.forEach(field => {
          if (newProduct[field] !== undefined) {
            product[field] = newProduct[field];
          }
        });

        if (newProduct.category) {
          const category = await manager.findOne(Category, {
            where: { slug: newProduct.category },
          });

          if (!category) {
            throw Object.assign(new Error('BAD_REQUEST'));
          }

          product.category = category;
          product.categoryId = category.id;
        }

        if (newProduct.tags) {
          const normalizedTitles = newProduct.tags
            .map(t => t.toLowerCase().trim())
            .filter(t => t.length > 0);

          await manager.createQueryBuilder()
            .delete()
            .from('prod_x_tag')
            .where('product_id = :productId', { productId: uuidTransformer.to(productId) })
            .execute();

          if (normalizedTitles.length) {
            const existingTags = await manager.find(Tag, {
              where: { title: In(normalizedTitles) },
            });

            let tags: Tag[];
            if (existingTags.length === normalizedTitles.length) {
              tags = existingTags;
            } else {
              const existingTitles = existingTags.map(t => t.title);
              const newTitles = normalizedTitles.filter(t => !existingTitles.includes(t));
              const createdTags = await manager.save(Tag, newTitles.map(title => ({ title })));
              tags = [...existingTags, ...createdTags];
            }

            await manager.createQueryBuilder()
              .insert()
              .into('prod_x_tag')
              .values(tags.map(tag => ({
                product_id: uuidTransformer.to(productId),
                tag_id: tag.id,
              })))
              .execute();
          }

          product.tags = undefined;
        }

        if (newProduct.images) {
          const normalizedImages = newProduct.images
            .map(t => t.toLowerCase().trim())
            .filter(t => t.length > 0);

          await manager.delete(Image, { product: { id: productId } });
          if (normalizedImages.length) {            
            await manager.save(Image, normalizedImages.map(link => ({ productId, link })));
          }
          product.images = undefined;
        }

        await manager.save(Product, product);
      });

      this.deleteCache('product', productId);
      this.deleteCache('featured');
      this.deleteCache('myProducts', accountId);

      return this.getProductById(productId);
    } catch (err: any) {
      if (err?.message === 'BAD_REQUEST') {
        return badRequest;
      };
      return errorMessage(ProductService.name, err);
    }
  }

  async getAccountReviews(accountId: string): Promise<SuccessDto<AccountReviewDto[]>> {
    const lockKey = `lock:myReviews:${accountId}`;
    const token = uuidv4();
    try {
      const cacheKey = `myReviews:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as AccountReviewDto[]
        };
      } 
      
      const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
      if (!lock) return;
      
      const reviews = await this.reviewRepository
        .createQueryBuilder('r')
        .innerJoinAndSelect('r.product', 'p')
        .where('r.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
        .orderBy('r.created', 'DESC')
        .getMany();

      const data = reviews.map((r) => new AccountReviewDto(r));
      if(data.length){
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
      }
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }finally{
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }

  async addReview(accountId: string, dto: CreateReviewDto): Promise<SuccessDto<ProductReviewDto>> {
    try {
      const exists = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .where('p.id = :productId', { productId: uuidTransformer.to(dto.productId) })
        .getOne();

      if (!exists) {
        return badRequest;
      }

      if(exists.meta.deletedBy){
        return notAvailable;
      }

      await this.reviewRepository
        .createQueryBuilder()
        .insert()
        .into(Review)
        .values({
          productId: dto.productId,
          accountId,
          rating: dto.rating,
          comment: dto.comment ?? null
        })
        .execute();

      const cacheKey = `myReviews:${accountId}`;
      await this.redis.del(cacheKey).catch(() => {});
      
      const accountList = await firstValueFrom(
        this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
          { cmd: 'get_partial_account_list_info' },
          { accountIds: [accountId]}
        )
      );
      const account = accountList.data ? accountList.data.pop() : undefined; 
      
      if(!account){
        return {
          success: true
        };
      };

      return {
        success: true,
        data: new ProductReviewDto(account.username, dto.productId, dto.rating, dto.comment)
      };
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        return badRequest;
      }
      return errorMessage(ProductService.name, err);
    }
  }

  async deleteReview(accountId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.reviewRepository
      .createQueryBuilder()
      .delete()
      .from(Review)
      .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
      .andWhere('productId = :productId', { productId: uuidTransformer.to(productId) })
      .execute();

      if (result.affected === 0) {
        return badRequest;
      }

      const cacheKey = `myReviews:${accountId}`;
      await this.redis.del(cacheKey).catch(() => {});

      return {
        success: true
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }
  
  @Cron(CronExpression.EVERY_2_HOURS)
  async calculateRating(): Promise<void> {
    const lockKey = 'lock:calculate_rating';
    const token = uuidv4();

    const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);

    if (!lock) return;
    try {
      await this.productRepository.query(
        `UPDATE product p
        INNER JOIN meta m ON p.id = m.product_id
        LEFT JOIN (
          SELECT product_id, ROUND(AVG(rating), 2) AS avg_rating
          FROM review
          GROUP BY product_id
        ) r ON p.id = r.product_id
        SET p.rating_avg = COALESCE(r.avg_rating, 0)
        WHERE m.deleted_by IS NULL`
      );
    } catch (err: any) {
      errorMessage(ProductService.name, err);
    } finally {
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }
  
  async banProduct(adminId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const result = await firstValueFrom(
        this.accountClient.send<SuccessDto<void>>(
          {cmd: 'is_admin'},
          { adminId }
        )
      );
      
      if(!result.success){
        return {
          success: false,
          code: result.code,
          message: result.message
        }
      };

      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .where('p.id = :id', { id: uuidTransformer.to(productId) })
        .getOne();

      if (!product) {
        return notFound;
      }

      await this.metaRepository
        .createQueryBuilder()
        .update(MetaP)
        .set({ deletedBy: adminId, deleted: new Date() })
        .where('productId = :productId', { productId: uuidTransformer.to(productId) })
        .execute();
      
      this.deleteCache('product', productId);
      this.deleteCache('featured');

      this.deleteFromCarts([productId]);

      return {
        success: true
      }; 
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }
 
  async unbanProduct(adminId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const result = await firstValueFrom(
        this.accountClient.send<SuccessDto<void>>(
          {cmd: 'is_admin'},
          { adminId }
        )
      );
      
      if(!result.success){
        return {
          success: false,
          code: result.code,
          message: result.message
        }
      };

      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .where('p.id = :id', { id: uuidTransformer.to(productId) })
        .getOne();

      if (!product) {
        return notFound;
      }

      await this.metaRepository
        .createQueryBuilder()
        .update(MetaP)
        .set({ deletedBy: null, deleted: null })
        .where('productId = :productId', { productId: uuidTransformer.to(productId) })
        .execute();

      this.deleteCache('product', productId);
      
      return {
        success: true
      }; 
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async getProductsFromList(productIds: string[]): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const ids = productIds.map((p) => uuidTransformer.to(p));
      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('p.id IN (:...ids)', { ids })
        .andWhere('m.deleted IS NULL')
        .getMany();

      if (!products.length) {
        return {
          success: true,
          data: []
        };
      };

      const data = products.map((p) => new PartialProductDto(p));

      return {
        success: true,
        data
      };

    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async deleteAccountData(accountId: string): Promise<void> {
    try {
      const productIds = await this.productRepository.manager.transaction(async manager => {        
        const products = await manager.createQueryBuilder(Product, 'p')
          .innerJoinAndSelect('p.meta', 'm')
          .where('m.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
          .getMany();
        
        const productIds = products.map((p) => p.id);
        const ids = products.map((p) => uuidTransformer.to(p.id));
        
        if(productIds.length){
          await manager.createQueryBuilder()
            .update(Product)
            .set({ stock: 0 })
            .where('id IN (:...ids)', { ids })
            .execute();
          
          await manager.createQueryBuilder()
            .update(MetaP)
            .set({ deletedBy: accountId, deleted: new Date() })
            .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
            .execute();

          await manager.createQueryBuilder()
            .delete()
            .from(Review)
            .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
            .execute();
        }

        return productIds;
      });

      if(productIds.length){
        this.deleteFromCarts(productIds);
      }
    } catch (err: any) {
      this.logger.warn(`Error removing the products from the deleted account ${accountId}`);
    }
  }

  async getBannedList(adminId: string, limit = 50, offset = 0): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const result = await firstValueFrom(
        this.accountClient.send<SuccessDto<void>>(
          {cmd: 'is_admin'},
          { adminId }
        )
      );

      if(!result.success){
        return {
          success: false,
          code: result.code,
          message: result.message
        };
      };

      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deletedBy IS NOT NULL')
        .andWhere('m.deletedBy != m.accountId')
        .orderBy('p.ratingAvg', 'DESC')
        .take(limit)
        .skip(offset)
        .getMany();

      return {
        success: true,
        data: products.map((p) => new PartialProductDto(p))
      }
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async reserve(products: { productId: string; amount: number; }[]): Promise<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>> {
    const answer: {product: Product, accountId: string, accounTitle: string, amount: number}[] = [];
    const unavailable: UnavailableProductsDto[] = [];
    const data: ProductOrderDto[] = [];
    try {
      const ids = products.map((p) => uuidTransformer.to(p.productId));

      const productList = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .where('p.id IN (:...ids)', { ids })
        .getMany();
    
      if(ids.length !== productList.length) return errorMessage(ProductService.name);

      const accountIds = Array.from(new Set(productList.map((p) => p.meta.accountId)));
      const accountList = await firstValueFrom(
        this.accountClient.send<SuccessDto<AccountDto[]>>(
          { cmd: 'get_account_list_info'},
          { accountIds }
        )
      );
      if(!accountList.success){
        return errorMessage(ProductService.name);
      }

      if(accountIds.length !== accountList.data.length) return errorMessage(ProductService.name);

      await this.productRepository.manager.transaction(async manager => {
        const prods = await manager.createQueryBuilder(Product, 'p')
          .innerJoinAndSelect('p.meta', 'm')
          .setLock('pessimistic_write')
          .where('p.id IN (:...ids)', { ids })
          .getMany();

        prods.forEach((p) => {
          const aux = products.find((e) => e.productId === p.id);
          if(p.meta.deleted){
            unavailable.push(new UnavailableProductsDto(p.id, p.title, 'NOT_AVAILABLE'));
          }else{
            if(p.stock < aux.amount){
              unavailable.push(new UnavailableProductsDto(p.id, p.title, 'OUT_OF_STOCK'));
            }else{
              const acc = accountList.data.find((a) => p.meta.accountId === a.id);
              if(acc.status !== EAccountStatus.Active){
                unavailable.push(new UnavailableProductsDto(p.id, p.title, 'NOT_AVAILABLE'));
              }else{
                p.stock -= aux.amount;
                if(acc.businessProfile){
                  answer.push({product: p, accountId: acc.id, accounTitle: acc.businessProfile.title, amount: aux.amount});
                }else {
                  answer.push({product: p, accountId: acc.id, accounTitle: acc.username, amount: aux.amount});
                };
              }
            }
          }
        });

        if(unavailable.length){
          throw new Error('UNAVAILABLE');
        };

        await manager.save(Product, prods);
      });

      answer.forEach((i) => {
        data.push(new ProductOrderDto(i.product, i.accountId, i.accounTitle, i.amount));
      });

      return {
        success: true,
        data
      }
    } catch (err: any) {
      if(err.message === 'UNAVAILABLE'){
        return {
          success: false,
          data: unavailable
        }
      }
      return errorMessage(ProductService.name, err);
    }
  }

  async isActive(productId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .where('p.id = :id', { id: uuidTransformer.to(productId) })
        .getOne();
      
      if(!result) return { success: false };

      if(!result.meta.deleted){
        return { success: true };
      }else{
        return { success: false };
      }
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }

  async restoreStock(productIds: {productId: string, amount: number}[], token: TransactionDto): Promise<void> {
    const failures: { id: string; amount: number; error: any }[] = [];
    const cacheKey = `transaction:${token.uuid}`;

    for (const p of productIds) {
      try {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
          try {
            await this.productRepository.manager.transaction(async manager => {
              const product = await manager.createQueryBuilder(Product, 'p')
                .innerJoinAndSelect('p.meta', 'm')
                .where('p.id = :id', { id: uuidTransformer.to(p.productId) })
                .getOne();

              if(!product.meta.deletedBy){
                await manager.increment(Product, { id: p.productId }, 'stock', p.amount);
              };
            });
            break;
          } catch (err: any) {
            attempts++;
            if (attempts >= maxAttempts) {
              throw err;
            }
            await new Promise((res) => setTimeout(res, 100 * attempts));
          }
        }
      } catch (err: any) {
        failures.push({id: p.productId, amount: p.amount, error: err?.message ?? err})
      }
    };
    
    if(failures.length){
      this.logger.fatal(`restoreStock failed ${failures.length} times: \n${failures}`);
    };
    token.status = EStateStatus.Completed;
    await firstValueFrom(
      from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
      .pipe(withRetry(3)))
      .catch(() => {});
    const lock = `lock:${token.uuid}`;
    await this.releaseLock(lock, token.uuid);
    await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});
  }

  async getAccountProducts (id: string): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const cacheKey = `accountProducts:${id}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as PartialProductDto[] 
        };
      }
      const products = await this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.accountId = :accountId', { accountId: uuidTransformer.to(id) })
        .andWhere('m.deletedBy IS NULL OR m.deletedBy = m.accountId')
        .getMany();

      if (!products.length) {
        return { 
          success: true, 
          data: []
        };
      }

      const data = products.map((p) => new PartialProductDto(p));
      if(data.length){
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
      }
      return { 
        success: true, 
        data
      };
    } catch (err: any) {
      return errorMessage(ProductService.name, err);
    }
  }













  //---------------------- Initial load for TESTING ---------------------------------
  async getCategories(): Promise<SuccessDto<string[] | any>> {
    try {
      const categories = await this.categoryRepository.createQueryBuilder('c')
        .getMany();

      return {
        success: true,
        data: categories.map((a) => a.slug)
      }
    } catch (err: any) {
      return {
        success: false,
        code: 500,
        data: err
      }
    }
  }

  private async createDefaultAccounts(): Promise<SuccessDto<string[]>>{
    try {
      const accounts: CreateAccountDto[] = [];
      accounts.push({
        email: "seller@test.com",
        username: "testseller",
        password: "Test1234!", 
        userAccount: {
          firstname: "María", 
          lastname: "García",
          phone: "+54911234567"
        }
      });
      accounts.push({
        email: "business@test.com",
        username: "testbusiness",
        password: "123456",
        businessAccount: {
          title: "Mi Negocio SRL",
          bio: "Venta de productos varios",
          phone: "+5491187654321"
        }
      });
      
      return firstValueFrom(
        this.accountClient.send<SuccessDto<string[]>>(
          { cmd: 'testing_load' },
          { accounts }
        )
      );
    } catch (err: any) {
      return {
        success: false
      };
    };
  }

  private async insertProduct(product: any, accountId: string): Promise<void> {
    const productUuid = uuidv4();

    // 1. Categoría
    await this.productRepository.query(
      "INSERT IGNORE INTO category (slug) VALUES (?)",
      [product.category]
    );
    const [categoryRow] = await this.productRepository.query(
      "SELECT id FROM category WHERE slug = ?",
      [product.category]
    );

    // 2. Producto
    await this.productRepository.query(
      `INSERT INTO product (
          id, title, description, price, discount_percentage,
          stock, brand, weight, warranty_info, shipping_info,
          rating_avg, category_id, thumbnail
      ) VALUES (
          UUID_TO_BIN(?), ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?
      )`,
      [
        productUuid,
        product.title,
        product.description,
        product.price,
        Math.round(product.discountPercentage),
        product.stock,
        product.brand ?? null,
        product.weight,
        product.warrantyInformation ?? null,
        product.shippingInformation ?? null,
        product.rating,
        categoryRow.id,
        product.thumbnail ?? null,
      ]
    );

    // 3. Meta
    await this.productRepository.query(
      `INSERT INTO meta (account_id, product_id)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?))`,
      [accountId, productUuid]
    );

    // 4. Tags
    for (const tagTitle of product.tags) {
      await this.productRepository.query(
        "INSERT IGNORE INTO tag (title) VALUES (?)",
        [tagTitle]
      );
      const [tagRow] = await this.productRepository.query(
        "SELECT id FROM tag WHERE title = ?",
        [tagTitle]
      );
      await this.productRepository.query(
        `INSERT IGNORE INTO prod_x_tag (product_id, tag_id)
        VALUES (UUID_TO_BIN(?), ?)`,
        [productUuid, tagRow.id]
      );
    }

    // 5. Imágenes
    for (const link of product.images) {
      await this.productRepository.query(
        `INSERT INTO image (product_id, link)
        VALUES (UUID_TO_BIN(?), ?)`,
        [productUuid, link]
      );
    }
  }

  async seedProducts(products: any[]): Promise<SuccessDto<void>> {
    const errores: any[] = [];
    const result = await this.createDefaultAccounts();
    if(!result.success){
      return {
        success: false,
        code: 500,
        message: 'salio mal la creacion de usuarios.'
      };
    };
    const admin = await this.createDefaultAdmin();
    if(!admin.success){
      return {
        success: false,
        code: 500,
        message: 'salio mal la creacion del admin.'
      };
    }
    const accounts = result.data!;
    for (const product of products) {
      const id = accounts[Math.floor(Math.random() * accounts.length)];
      try {
        await this.insertProduct(product, id);
      } catch (err) {
        errores.push(product);
      };
    };
    if(errores.length){
      this.logger.fatal(errores);
    }

    return{ success: true };
  }

  private async createDefaultAdmin(): Promise<SuccessDto<void>> {
    try {
      const accounts: CreateAccountDto[] = [{
        email: "palo@test.com",
        username: "palo",
        password: "palo", 
        adminAccount: {
          publicName: 'palito'
        }
      }];

      await firstValueFrom(
        this.accountClient.send<SuccessDto<string[]>>(
          { cmd: 'testing_load' },
          { accounts }
        )
      );
      return {
        success: true
      }
    } catch (err: any) {
      return {
        success: false
      };
    };
  }
}