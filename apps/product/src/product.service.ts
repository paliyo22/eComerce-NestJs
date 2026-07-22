import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartialProductDto, ProductDto, CreateProductDto, UpdateProductDto, Product, Category, 
  Tag, Image, MetaP, SuccessDto, EProductCategory, errorMessage, badRequest, unauthorized, 
  banned, deleted, notFound, AccountDto, uuidTransformer, CreateAccountDto } from '@app/lib';
import { In, Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { GeneralService } from './general.service';


@Injectable()
export class ProductService {
  constructor(
    private readonly generalService: GeneralService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(MetaP)
    private readonly metaRepository: Repository<MetaP>,
    @Inject('ACCOUNT_SERVICE') 
    private readonly accountClient: ClientProxy,
    @Inject('REDIS_CLIENT')
    private redis: Redis
  ) {};

  private readonly logger = new Logger(ProductService.name);

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
      await this.generalService.releaseLock(lockKey, token).catch(() => {});
      
      return {
        success: true,
        data: total
      };
    } catch (err: any) {
      await this.generalService.releaseLock(lockKey, token).catch(() => {});
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
      await this.generalService.releaseLock(lockKey, token).catch(() => {});
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
      await this.generalService.releaseLock(lockKey, token).catch(() => {});
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
      await this.generalService.releaseLock(lockKey, token).catch(() => {});
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
      await this.generalService.releaseLock(lockKey, token).catch(() => {});
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

      this.generalService.deleteCache('product', productId);
      this.generalService.deleteCache('featured');
      this.generalService.deleteCache('myProducts', accountId);

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

      this.generalService.deleteCache('product', productId);
      this.generalService.deleteCache('featured');
      this.generalService.deleteCache('myProducts', accountId);

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

      this.generalService.deleteCache('product', productId);
      this.generalService.deleteCache('featured');
      this.generalService.deleteCache('myProducts', accountId);

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
      await this.generalService.releaseLock(lockKey, token).catch(() => {});
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
      
      this.generalService.deleteFromCarts([productId]);

      this.generalService.deleteCache('product', productId);
      this.generalService.deleteCache('featured');
      this.generalService.deleteCache('myProducts', accountId);

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

      this.generalService.deleteCache('product', productId);
      this.generalService.deleteCache('myProducts', accountId);

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

      this.generalService.deleteCache('product', productId);
      this.generalService.deleteCache('featured');
      this.generalService.deleteCache('myProducts', accountId);

      return this.getProductById(productId);
    } catch (err: any) {
      if (err?.message === 'BAD_REQUEST') {
        return badRequest;
      };
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