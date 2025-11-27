import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartialProductDto, ProductDto, CreateProductDto, UpdateProductDto } from 'libs/dtos/product';
import { SuccessDto } from 'libs/shared/respuesta';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';
import { Product, Category, Review, Tag, Image, Meta } from 'apps/product/src/entities';
import { In, Repository } from 'typeorm';


@Injectable()
export class ProductService {
  
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,

    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,

    @InjectRepository(Meta)
    private readonly metaRepository: Repository<Meta>    
  ) {};

  async getTotal(category?: string): Promise<SuccessDto<number>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('m.deleted_by IS NULL');

      if (category) {
        qb.innerJoin('p.category', 'c')
          .andWhere('c.slug = :category', { category });
      }

      const total = await qb.getCount();

      return {
        success: true,
        data: total
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener total'
      };
    }
  }

  async getProductList(userId?: string, limit?: number, offset?: number): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i');

      if (!userId) {
        qb.where('m.deleted_by IS NULL')
          .orderBy('p.rating_avg', 'DESC')
          .limit(limit ?? 20)
          .offset(offset ?? 0);
      } else {
        qb.where('p.user_id = :userId', { userId })
          .orderBy('m.created', 'DESC');
      }

      const products = await qb.getMany();

      return {
        success: true,
        data: products.map(PartialProductDto.fromEntity)
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener lista de productos'
      };
    }
  }

  async getProductByCategory(category: string, limit?: number, offset?: number): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deleted_by IS NULL')
        .andWhere('c.slug = :category', { category })
        .orderBy('p.title', 'DESC')
        .limit(limit ?? 20)
        .offset(offset ?? 0);

      const products = await qb.getMany();

      return {
        success: true,
        data: products.map(PartialProductDto.fromEntity)
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener productos por categoría'
      };
    }
  }

  async getFeatured(limit?: number, offset?: number): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deleted_by IS NULL')
        .andWhere('p.stock > 0')
        .orderBy('p.rating_avg', 'DESC')
        .limit(limit ?? 7)
        .offset(offset ?? 0);

      const products = await qb.getMany();

      return {
        success: true,
        data: products.map(PartialProductDto.fromEntity)
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener productos destacados'
      };
    }
  }

  async getProductById(productId: string): Promise<SuccessDto<ProductDto>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoinAndSelect('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .leftJoinAndSelect('p.reviews', 'r')
        .where('p.id = UUID_TO_BIN(:id)', { id: productId });

      const product = await qb.getOne();

      if (!product) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      return {
        success: true,
        data: ProductDto.fromEntity(product)
      };

    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener producto'
      };
    }
  }

  async addReview(userId: string, data: CreateReviewDto): Promise<SuccessDto<ReviewDto[]>> {
    try {
      const exists = await this.productRepository.findOne({
        where: { id: data.productId }
      });

      if (!exists) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      await this.reviewRepository
        .createQueryBuilder()
        .insert()
        .into(Review)
        .values({
          productId: data.productId,
          userId,
          rating: data.rating
        })
        .execute();

      const reviews = await this.reviewRepository
        .createQueryBuilder('r')
        .where('r.product_id = UUID_TO_BIN(:productId)', { productId: data.productId })
        .orderBy('r.created', 'DESC')
        .getMany();

      return {
        success: true,
        data: reviews.map(ReviewDto.fromEntity)
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        return { success: false, message: 'El usuario ya calificó este producto', code: 400 };
      }

      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al crear review'
      };
    }
  }

  async deleteReview(userId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.reviewRepository
      .createQueryBuilder()
      .delete()
      .from(Review)
      .where('user_id = UUID_TO_BIN(:userId)', { userId })
      .andWhere('product_id = UUID_TO_BIN(:productId)', { productId })
      .execute();

      if (result.affected === 0) {
        return {
          success: false,
          message: 'La reseña no existe o ya fue eliminada',
          code: 400
        };
      }

      return {
        success: true,
        message: 'Reseña eliminada'
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  async searchProduct(contains: string): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      contains = contains.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deleted_by IS NULL')
        .andWhere('p.title LIKE :text', { text: `%${contains}%` })
        .andWhere('p.description LIKE :text', { text: `%${contains}%` })
        .andWhere('p.brand LIKE :text', { text: `%${contains}%` })
        .orderBy('p.title', 'ASC')
        .limit(20);

      const products = await qb.getMany();

      return {
        success: true,
        data: products.map(p => PartialProductDto.fromEntity(p))
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  async updatePrice(userId: string, productId: string, price: number): Promise<SuccessDto<void>> {
  try {
    const product = await this.productRepository
      .createQueryBuilder('p')
      .leftJoin('p.meta', 'm')
      .select('p.user_id', 'ownerId')
      .addSelect('m.deleted_by', 'deletedBy')
      .where('p.id = UUID_TO_BIN(:productId)', { productId })
      .getRawOne();

    if (!product || product.deletedBy) {
      return { success: false, message: 'Producto no encontrado', code: 400 };
    }

    if (product.ownerId !== userId) {
      return { success: false, message: 'No tienes permiso para modificar este producto', code: 403 };
    }

    await this.productRepository.update(productId, { price });

    return { success: true, message: 'Precio actualizado' };

  } catch (err: any) {
    return {
      success: false,
      code: 500,
      message: err?.message ?? 'Error al actualizar el precio'
    };
  }
}

  async updateDiscount(userId: string, productId: string, discount: number): Promise<SuccessDto<void>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('p.id = UUID_TO_BIN(:productId)', { productId })
        .andWhere('m.deleted_by IS NULL')
        .select('p.user_id') 
        .getRawOne();

      if (!product) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      if (product.p_user_id !== userId) {
        return { success: false, message: 'No tienes permiso para modificar este producto', code: 403 };
      }

      await this.productRepository.update(productId, { discountPercentage: discount });

      return {
        success: true,
        message: 'Descuento actualizado'
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  async modifyStock(userId: string, productId: string, delta: number): Promise<SuccessDto<number>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('p.id = UUID_TO_BIN(:productId)', { productId })
        .andWhere('m.deleted_by IS NULL')
        .select(['p.user_id', 'p.stock'])
        .getRawOne();

      if (!product) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      if (product.p_user_id !== userId) {
        return {
          success: false,
          message: 'No tienes permiso para modificar este producto',
          code: 403,
        };
      }
      const nuevoStock = product.p_stock + delta;

      if(nuevoStock < 0){
        return { success: false, message: 'El stock no puede ser menor a 0', code: 400 };
      }

      await this.productRepository.update(productId, { stock: nuevoStock });

      return {
        success: true,
        data: nuevoStock
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }
  
  async updateProduct(userId: string, productId: string, product: UpdateProductDto): Promise<SuccessDto<ProductDto>> {
    try {
      const existing = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('p.id = UUID_TO_BIN(:id)', { id: productId })
        .select(['p.userId AS userId', 'm.deletedBy AS deletedBy'])
        .getRawOne();

      if (!existing) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      if (existing.deletedBy && existing.deletedBy !== userId) {
        return {
          success: false,
          message: 'Este Producto fue bloqueado por un administrador',
          code: 403,
        };
      }

      if (existing.userId !== userId) {
        return {
          success: false,
          message: 'No tienes permiso para modificar este producto',
          code: 403,
        };
      }

      const entity = await this.productRepository.findOne({
        where: { id: productId },
        relations: ['tags', 'images', 'category'],
      });

      if (!entity) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      const directMap = {
        title: 'title',
        description: 'description',
        price: 'price',
        discountPercentage: 'discountPercentage',
        stock: 'stock',
        brand: 'brand',
        weight: 'weight',
        physical: 'physical',
        thumbnail: 'thumbnail',
        warrantyInformation: 'warrantyInfo',
        shippingInformation: 'shippingInfo',
      };

      for (const key in directMap) {
        const prop = directMap[key];
        if (product[key] !== undefined) {
          (entity as any)[prop] = product[key];
        }
      }

      if (product.category !== undefined) {
        const category = await this.categoryRepository.findOne({
          where: { slug: product.category },
        });

        if (!category) {
          return {
            success: false,
            message: 'Categoría no encontrada',
            code: 400,
          };
        }

        entity.category = category;
      }

      if (product.tags !== undefined) {
        const normalizedTags = product.tags.map(t => t.toLowerCase().trim());

        const tags = await this.tagRepository.find({
          where: { title: In(normalizedTags) },
        });

        entity.tags = tags;
      }

      if (product.images !== undefined) {
        await this.imageRepository.delete({ product: { id: productId } });

        entity.images = product.images.map((link) =>
          this.imageRepository.create({ link })
        );
      }
      await this.productRepository.save(entity);

      const updated = await this.getProductById(productId);
      return updated;
    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error interno',
      };
    }
  }

  async createProduct(userId: string, product: CreateProductDto): Promise<SuccessDto<ProductDto>> {
    try {
      const category = await this.categoryRepository
        .createQueryBuilder('c')
        .where('c.slug = :slug', { slug: product.category })
        .getOne();

      if (!category) {
        return {
          success: false,
          code: 400,
          message: 'Categoría no encontrada',
        };
      }

      const insertResult = await this.productRepository
        .createQueryBuilder()
        .insert()
        .into(Product)
        .values({
          userId,
          title: product.title,
          description: product.description,
          price: product.price,
          discountPercentage: product.discountPercentage ?? 0,
          stock: product.stock,
          brand: product.brand,
          weight: product.weight,
          physical: product.physical,
          warrantyInfo: product.warrantyInformation ?? null,
          shippingInfo: product.shippingInformation ?? null,
          thumbnail: product.thumbnail ?? null,
          category: { id: category.id }
        })
        .execute();

      const productId = insertResult.identifiers[0]?.id;
      if (product.tags?.length) {
        const normalizedTitles = product.tags.map(t => t.toLowerCase().trim())
        .filter(t => t.length > 0);

        if (normalizedTitles.length) {
          const tags = await this.tagRepository
            .createQueryBuilder('t')
            .where('t.title IN (:...titles)', { titles: normalizedTitles })
            .getMany();

          if (tags.length) {
            await this.productRepository
              .createQueryBuilder()
              .relation(Product, 'tags')
              .of(productId)
              .add(tags.map(t => t.id));
          }
        }
      }


      if (product.images?.length) {
        const imgInserts = product.images.map(link => ({
          product: { id: productId },
          link,
        }));

        await this.imageRepository
          .createQueryBuilder()
          .insert()
          .into(Image)
          .values(imgInserts)
          .execute();
      }

      await this.metaRepository
        .createQueryBuilder()
        .insert()
        .into(Meta)
        .values({
          product: { id: productId }
        })
        .execute();

      const result = await this.getProductById(productId);
      return result;

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al crear el producto',
      };
    }
  }

  async deleteProduct(userId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .where('p.id = UUID_TO_BIN(:id)', { id: productId })
        .getOne();

      if (!product) {
        return {
          success: false,
          code: 404,
          message: 'Producto no encontrado',
        };
      }

      if (product.userId !== userId) {
        return {
          success: false,
          code: 403,
          message: 'No tenés permisos para eliminar este producto',
        };
      }

      await this.productRepository
        .createQueryBuilder()
        .delete()
        .from(Product)
        .where('id = UUID_TO_BIN(:id)', { id: productId })
        .execute();

      return {
        success: true,
        message: 'Producto eliminado correctamente',
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error conectando a la base de datos de productos',
      };
    }
  }

  async calculateRating(): Promise<SuccessDto<void>> {
    try {
      await this.productRepository.query(`
        UPDATE product p
        JOIN (
          SELECT product_id, ROUND(AVG(rating), 2) AS avg_rating
          FROM review
          GROUP BY product_id
        ) r ON p.id = r.product_id
        SET p.rating_avg = r.avg_rating;
      `);

      return { success: true };
    } catch (err) {
      return{
        success: false, 
        message: err?.message ?? 'Error conectando a la base mde datos de productos',
        code: 500
      };
    }
  }

  async getAccountReviews(userId: string): Promise<SuccessDto<ReviewDto[]>> {
    try {
      const reviews = await this.reviewRepository
        .createQueryBuilder('review')
        .where('review.userId = UUID_TO_BIN(:userId)', { userId })
        .orderBy('review.created', 'DESC')
        .getMany();

      return {
        success: true,
        data: reviews.map(ReviewDto.fromEntity) 
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }
}

