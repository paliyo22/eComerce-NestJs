import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartialProductDto, ProductDto, CreateProductDto, UpdateProductDto } from 'libs/dtos/product';
import { SuccessDto } from 'libs/shared/respuesta';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';
import { Product, Category, Tag, Meta, Image, Review } from 'libs/entities/products';
import { Repository } from 'typeorm';


@Injectable()
export class ProductService {
  
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {};

  // GET: /total
  async getTotal(category?: string): Promise<SuccessDto<number>> {
    try {
      let sql: string;
      let params: any[] = [];

      if (!category) {
        sql = `
          SELECT COUNT(*) AS total
          FROM product p
          INNER JOIN meta m ON p.id = m.product_id
          WHERE m.deleted_by IS NULL
        `;
      } else {
        sql = `
          SELECT COUNT(*) AS total
          FROM product p
          INNER JOIN meta m ON p.id = m.product_id
          INNER JOIN category c ON p.category_id = c.id
          WHERE m.deleted_by IS NULL
            AND c.slug = ?
        `;
        params = [category];
      }

      const result = await this.productRepository.query(sql, params);

      return {
        success: true,
        data: Number(result[0].total)
      };

    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // GET: /
  async getProductList(limit?: number, offset?: number): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deleted_by IS NULL')
        .orderBy('p.title', 'DESC')
        .limit(limit ?? 20)
        .offset(offset ?? 0);

      const product = await qb.getMany()

      return {
        success: true,
        data: product.map(p => PartialProductDto.fromEntity(p))
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // GET: /:category
  async getProductByCategory(category: string, limit?: number, offset?:number): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deleted_by IS NULL')
        .andWhere('c.slug = :slug', { slug: category })
        .orderBy('p.title', 'DESC')
        .limit(limit ?? 20)
        .offset(offset ?? 0);

      const product = await qb.getMany(); 

      return {
        success: true,
        data: product.map((p) => PartialProductDto.fromEntity(p)),
      };
    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // GET: /featured
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
        .limit(limit ?? 20)
        .offset(offset ?? 0);

      const product = await qb.getMany();

      return {
        success: true,
        data: product.map(p => PartialProductDto.fromEntity(p))
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // GET: /:productId
  async getProductById(productId: string): Promise<SuccessDto<ProductDto>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.meta', 'm')
        .leftJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('p.id = :id', {id: productId});

      const product = await qb.getOne();

      if (!product) {
        return { success: false, message: 'Producto no encontrado', code:400 };
      }

      return { success: true, data: ProductDto.fromEntity(product) };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // POST: /review
  async addReview(userId: string, data: CreateReviewDto): Promise<SuccessDto<ReviewDto[]>> {
    try {
      const productExists = await this.productRepository.findOne({ where: { id: data.productId } });
      if (!productExists) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      await this.reviewRepository
      .createQueryBuilder()
      .insert()
      .into(Review)
      .values({
        product: { id: data.productId },
        userId,
        rating: data.rating,
        comment: data.comment ?? null
      })
      .execute();

      const reviews = await this.reviewRepository
        .createQueryBuilder('r')
        .select([
          'r.rating',
          'r.comment',
          'r.created',
          'r.userId',
          'p.id AS productId' 
        ])
        .leftJoin('r.product', 'p')
        .where('r.product_id = :productId', { productId: data.productId })
        .orderBy('r.created', 'DESC')
        .getRawMany(); // devuelve un objeto plano con los campos seleccionados

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
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // DELETE: /review/:productId
  async deleteReview(userId: string, productId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.reviewRepository.delete({ userId, productId });

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

  // GET: /search
  async searchProduct(contains: string): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deleted_by IS NULL')
        .andWhere('LOWER(p.title) LIKE :text', { text: `%${contains.toLowerCase()}%` })
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

  // GET: /:username
  async accountProductList(userId: string): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const qb = this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .innerJoinAndSelect('p.category', 'c')
        .leftJoinAndSelect('p.tags', 't')
        .leftJoinAndSelect('p.images', 'i')
        .where('m.deleted_by IS NULL')
        .andWhere('m.created_by = :userId', { userId })
        .orderBy('p.created', 'DESC');

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

  // PATCH: /price/:productId
  async updatePrice(userId: string, productId: string, price: number): Promise<SuccessDto<void>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('p.id = :productId', { productId })
        .andWhere('m.deleted_by IS NULL')
        .select('p.user_id')
        .getRawOne();

      if (!product) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      if (product.p_user_id !== userId) {
        return { success: false, message: 'No tienes permiso para modificar este producto', code: 403 };
      }

      await this.productRepository.update(productId, { price });

      return {
        success: true,
        message: 'Precio actualizado'
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // PATCH: /discount/:productId
  async updateDiscount(userId: string, productId: string, discount: number): Promise<SuccessDto<void>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('p.id = :productId', { productId })
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

  // PATCH: /stock/:productId
  async modifyStock(userId: string, productId: string, delta: number): Promise<SuccessDto<number>> {
    try {
      const product = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('p.id = :productId', { productId })
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
  
  // PUT: /
  async updateProduct(userId: string, product: UpdateProductDto): Promise<SuccessDto<ProductDto>> {
    try {
      const existing = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin('p.meta', 'm')
        .where('p.id = :id', { id: product.id })
        .andWhere('m.deleted_by IS NULL')
        .select(['p.user_id'])
        .getRawOne();

      if (!existing) {
        return { success: false, message: 'Producto no encontrado', code: 400 };
      }

      if (existing.p_user_id !== userId) {
        return {
          success: false,
          message: 'No tienes permiso para modificar este producto',
          code: 403,
        };
      }

      const updateData: any = {};

      const keys = [
        'title',
        'description',
        'category',
        'price',
        'discountPercentage',
        'stock',
        'brand',
        'weight',
        'physical',
        'warrantyInformation',
        'shippingInformation',
        'tags',
        'images',
        'thumbnail',
      ];

      for (const key of keys) {
        if (product[key] !== undefined) {
          updateData[key] = product[key];
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

        updateData.category = { id: category.id };
      }

      if (Object.keys(updateData).length === 0) {
        return { success: false, message: 'No hay campos para actualizar', code: 400 };
      }

      await this.productRepository.update(product.id, updateData);

      const updated = await this.getProductById(product.id)

      return updated

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener las reviews'
      };
    }
  }

  // POST: /
  async createProduct(
    userId: string,
    product: CreateProductDto
  ): Promise<SuccessDto<ProductDto>> {
    try {
      const discount = product.discountPercentage ?? 0;
      const warranty = product.warrantyInformation ?? null;
      const shipping = product.shippingInformation ?? null;
      const tags = product.tags ?? null;
      const images = product.images ?? null;
      const thumbnail = product.thumbnail ?? null;

      const result = await this.productRepository.query(
        `
        CALL create_full_product(
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        `,
        [
          userId,
          product.title,
          product.description,
          product.price,
          discount,
          product.stock,
          product.brand,
          product.weight,
          warranty,
          shipping,
          product.category,   
          thumbnail,
          product.physical,
          JSON.stringify(tags),
          JSON.stringify(images),
        ]
      );

      const createdRaw = result?.[0]?.[0];

      if (!createdRaw) {
        return {
          success: false,
          message: 'No se pudo crear el producto',
          code: 500,
        };
      }

      const created = await this.getProductById(createdRaw.id);
      return created;

    } catch (err: any) {
      if (err?.sqlMessage === 'Category not found') {
        return {
          success: false,
          message: 'Categoría no encontrada',
          code: 400,
        };
      }
      return{
        success: false, 
        message: err?.message ?? 'Error conectando a la base mde datos de productos',
        code: 500
      };
    }
  }

  // DELETE: /:id
  async deleteProduct(userId: string, productId: string): Promise<SuccessDto<void>> {
    try{
      const product = await this.productRepository.findOne({
        where: { id: productId }
      });

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
      
      await this.productRepository.delete(productId);
      return {
        success: true,
        message: 'Producto eliminado correctamente',
      };
    }catch(err){
      return{
        success: false, 
        message: err?.message ?? 'Error conectando a la base mde datos de productos',
        code: 500
      };
    }
  }  

  // POST: /calculateRating
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

  // GET: /reviews/user
  async getAccountReviews(userId: string): Promise<SuccessDto<ReviewDto[]>> {
    try {
      const reviews = await this.reviewRepository
        .createQueryBuilder('review')
        .where('review.userId = :userId', { userId })
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

