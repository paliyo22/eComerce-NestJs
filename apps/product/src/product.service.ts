import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PartialProductDto, ProductDto, CreateProductDto, UpdateProductDto } from 'libs/dtos/product';
import { SuccessDto } from 'libs/dtos/respuesta';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';
import { Product, Category, Tag, Meta, Image, Review } from 'libs/entities/products';
import { Repository } from 'typeorm';


@Injectable()
export class ProductService {
  
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,

    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,

    @InjectRepository(Meta)
    private readonly metaRepository: Repository<Meta>,

    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>
  ) {};

  // GET: /
  async getProductList(limit?: number, offset?:number): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const products = await this.productRepository.find({
        take: limit ?? 10,
        skip: offset ?? 0,
        relations: ['category', 'tags', 'images'],
        order: { title: 'ASC' }
      });

      const productList = products.map(p => PartialProductDto.fromEntity(p));

      return {
        success: true,
        data: productList
      };
    } catch (err) {
      throw new RpcException(
        err.message || 'Error conectando con la Base de Datos de Productos'
      );
    }
  }

  // GET: /:category
  async getProductsByCategory(category: string, limit?: number, offset?:number): Promise<SuccessDto<PartialProductDto[]>> {
    try {
      const products = await this.productRepository.find({
        where: {
          category: { slug: category }
        },
        take: limit ?? 10,
        skip: offset ?? 0,
        relations: ['category', 'tags', 'images'],
        order: { title: 'ASC' }
      });

      if (!products.length)
        return { success: false, message: 'No se encontraron productos en esta categoría' };

      return {
        success: true,
        data: products.map((p) => PartialProductDto.fromEntity(p)),
      };
    } catch (err: any) {
      throw new RpcException(err.message || 'Error obteniendo productos por categoría');
    }
  }

  // GET: /:productId
  async getProductById(productId: string): Promise<SuccessDto<ProductDto>> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
        relations: ['category', 'tags',
          'images', 'reviews', 'meta'
        ]
      });

      if (!product) {
          return { success: false, message: 'Producto no encontrado' };
      }

      const productDto = ProductDto.fromEntity(product);

      return { success: true, data: productDto };
    } catch (err) {
        throw new RpcException(err.message || 'Error conectando con la Base de Datos de Productos');
    }
  }

  // POST: /
  async createProduct(data: CreateProductDto): Promise<SuccessDto<ProductDto>> {
    try {
      // Buscar la categoría por slug o título
      const category = await this.categoryRepository.findOne({
        where: [{ slug: data.category }, { title: data.category }],
      });

      if (!category) {
        return { success: false, message: 'Categoría no encontrada' };
      }

      // Crear la entidad base del producto
      const product = this.productRepository.create({
        title: data.title,
        description: data.description,
        category,
        price: data.price,
        discountPercentage: data.discountPercentage ?? 0,
        stock: data.stock,
        brand: data.brand,
        weight: data.weight,
        warrantyInfo: data.warrantyInformation,
        shippingInfo: data.shippingInformation,
        physical: data.physical,
        thumbnail: data.thumbnail,
      });

      // Guardar producto en DB
      const savedProduct = await this.productRepository.save(product);

      // Guardar meta (timestamps)
      const meta = this.metaRepository.create({
        product: savedProduct,
      });
      await this.metaRepository.save(meta);

      // Guardar tags (crear si no existen)
      if (data.tags?.length) {
        const tags = await Promise.all(
          data.tags.map(async (title) => {
            const normalizedTitle = title.trim().toLowerCase();
            let tag = await this.tagRepository.findOne({ where: { title: normalizedTitle } });
            if (!tag) {
              tag = this.tagRepository.create({ title: normalizedTitle });
              await this.tagRepository.save(tag);
            }
            return tag;
          })
        );
        savedProduct.tags = tags;
        await this.productRepository.save(savedProduct);
      }

      // Guardar imágenes
      if (data.images && data.images.length > 0) {
        const images = data.images.map((link) =>
          this.imageRepository.create({
            product: savedProduct,
            link,
          })
        );
        await this.imageRepository.save(images);
      }

      // Recargar producto con todas las relaciones
      const fullProduct = await this.productRepository.findOne({
        where: { id: savedProduct.id },
        relations: ['category', 'tags', 'images', 'meta'],
      });

      const productDto = ProductDto.fromEntity(fullProduct!);

      return { success: true, data: productDto };
    } catch (err) {
      throw new RpcException(
        err.message || 'Error conectando con la Base de Datos de Productos'
      );
    }
  }

  // PUT: /
  async updateProduct(data: UpdateProductDto): Promise<SuccessDto<ProductDto>> {
    try {
      // Buscar producto existente
      const product = await this.productRepository.findOne({
        where: { id: data.id },
        relations: ['category', 'tags', 'images', 'reviews'],
      });

      if (!product) {
        return { success: false, message: 'Producto no encontrado' };
      }

      // Actualizar campos básicos (solo si vienen en el DTO)
      if (data.title !== undefined) product.title = data.title;
      if (data.description !== undefined) product.description = data.description;
      if (data.price !== undefined) product.price = data.price;
      if (data.discountPercentage !== undefined) product.discountPercentage = data.discountPercentage;
      if (data.stock !== undefined) product.stock = data.stock;
      if (data.brand !== undefined) product.brand = data.brand;
      if (data.weight !== undefined) product.weight = data.weight;
      if (data.warrantyInformation !== undefined) product.warrantyInfo = data.warrantyInformation;
      if (data.shippingInformation !== undefined) product.shippingInfo = data.shippingInformation;
      if (data.physical !== undefined) product.physical = data.physical;
      if (data.thumbnail !== undefined) product.thumbnail = data.thumbnail;

      // Actualizar categoría (si llega un slug o nombre)
      if (data.category) {
        const category = await this.categoryRepository.findOne({
          where: [{ slug: data.category }, { title: data.category }],
        });
        if (!category) throw new RpcException('Categoría no encontrada');
        product.category = category;
      }

      // Actualizar tags (si llegan)
      if (data.tags && Array.isArray(data.tags)) {
        const normalizedTags = await Promise.all(
          data.tags.map(async (title) => {
            const normalizedTitle = title.trim().toLowerCase();
            let tag = await this.tagRepository.findOne({ where: { title: normalizedTitle } });
            if (!tag) {
              tag = this.tagRepository.create({ title: normalizedTitle });
              await this.tagRepository.save(tag);
            }
            return tag;
          }),
        );
        product.tags = normalizedTags;
      }

      // Reemplazar completamente las imágenes (si llegan)
      if (data.images && Array.isArray(data.images)) {
        // Eliminar todas las imágenes anteriores
        await this.imageRepository.delete({ productId: product.id });

        // Crear nuevas imágenes
        const newImages = data.images.map((link) =>
          this.imageRepository.create({ link, product })
        );
        await this.imageRepository.save(newImages);
        product.images = newImages;
      }

      // Guardar cambios
      const updated = await this.productRepository.save(product);

      // Retornar DTO de respuesta
      return {
        success: true,
        data: ProductDto.fromEntity(updated),
      };
    } catch (err) {
      throw new RpcException(err.message || 'Error actualizando el producto');
    }
  }

  // PATCH: /price
  async updatePrice(productId: string, price: number): Promise<SuccessDto<null>> {
    try {
      if (price <= 0) return { success: false, message: 'El precio debe ser mayor que cero' };
      
      const result = await this.productRepository.update({ id: productId }, { price });
      if (result.affected === 0) return { success: false, message: 'Producto no encontrado' };

      return { success: true };
    } catch (err) {
      throw new RpcException(err.message || 'Error actualizando el precio del producto');
    }
  }

  // PATCH: /stock
  async modifyStock(productId: string, delta: number): Promise<SuccessDto<number>> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId }
      });

      if (!product) return { success: false, message: 'Producto no encontrado' };

      product.stock += delta;

      if (product.stock < 0) return { success: false, message: 'El stock no puede ser negativo' };

      await this.productRepository.save(product);

      return { success: true, data: product.stock };
    } catch (err) {
      throw new RpcException(err.message || 'Error actualizando el stock del producto');
    }
  }

  // PATCH: /discount
  async updateDiscount(productId: string, discount: number): Promise<SuccessDto<null>> {
    try {
      if (discount < 0 || discount > 100)
        return { success: false, message: 'El descuento debe estar entre 0 y 100' };

      const result = await this.productRepository.update({ id: productId }, { discountPercentage: discount });
      if (result.affected === 0) return { success: false, message: 'Producto no encontrado' };

      return { success: true };
    } catch (err) {
      throw new RpcException(err.message || 'Error actualizando el descuento del producto');
    }
  }

  // DELETE: /:id
  async deleteProduct(userId: string, productId: string): Promise<SuccessDto<null>> {
    try {
      const product = await this.productRepository.findOne({ where: { id: productId } });
      if (!product){
        return { success: false, message: 'Producto no encontrado' };
      }

      if (product.userId !== userId) { 
        throw new RpcException({
          message: 'No autorizado para eliminar este producto',
          code: 'FORBIDDEN',
        });
      }

      await this.productRepository.delete({ id: productId });

      return { success: true };
    } catch (err: any) {
      throw new RpcException(err.message || 'Error eliminando el producto');
    }
  }

  // POST: /review
  async addReview(userId: string, data: CreateReviewDto): Promise<SuccessDto<ReviewDto[]>> {
    try {
      // Verificar que el producto exista
      const product = await this.productRepository.findOne({
        where: { id: data.productId },
        relations: ['reviews'], // para devolver las reseñas al final
      });

      if (!product) {
        return { success: false, message: 'Producto no encontrado' };
      }

      // Verificar si ya existe una reseña del usuario para este producto
      const existing = await this.reviewRepository.findOne({
        where: { productId: data.productId, userId },
      });

      if (existing) {
        return { success: false, message: 'Ya existe una reseña de este usuario para este producto' };
      }

      // Crear nueva reseña
      const review = this.reviewRepository.create({
        productId: data.productId,
        userId,
        rating: data.rating,
        comment: data.comment ?? undefined,
      });

      // Guardar en la base de datos
      await this.reviewRepository.save(review);

      // Obtener reseñas actualizadas del producto
      const reviews = await this.reviewRepository.find({
        where: { productId: data.productId },
        order: { created: 'DESC' },
      });

      // Retornar todas las reseñas mapeadas a DTO
      return {
        success: true,
        data: reviews.map((r) => ReviewDto.fromEntity(r)),
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        return { success: false, message: 'El usuario ya calificó este producto' };
      }

      throw new RpcException(err.message || 'Error agregando la reseña del producto');
    }
  }

  // DELETE: /review/:productId
  async deleteReview(userId: string, productId: string): Promise<SuccessDto<null>> {
    try {
      const result = await this.reviewRepository.delete({ userId, productId });

      if (result.affected === 0) 
        return { success: false, message: 'Reseña no encontrada' };

      return { success: true };
    } catch (err) {
      throw new RpcException(err.message || 'Error eliminando el producto');
    }
  }

  // POST: /calculateRating
  async calculateRating(): Promise<SuccessDto<null>> {
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
      throw new RpcException(err.message || 'Error recalculando promedios de productos');
    }
  }

  // GET: /reviews/:userId
  async getReviews(userId: string): Promise<SuccessDto<ReviewDto[]>> {
    try {
    const reviews = await this.reviewRepository.find({
      where: { userId },
      relations: ['product'],
      order: { created: 'DESC' },
    });

    if (!reviews.length)
      return { success: false, message: 'El usuario no tiene reseñas registradas' };

    return {
      success: true,
      data: reviews.map((r) => ReviewDto.fromEntity(r)),
    };
  } catch (err) {
    throw new RpcException(err.message || 'Error obteniendo reseñas del usuario');
  }
  }
}

