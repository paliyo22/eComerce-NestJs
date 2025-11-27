import axios from "axios";
import mysql from "mysql2/promise";
import { v4 as uuid } from 'uuid';

export interface ProductItem {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  sku: string;
  weight: number;
  dimensions: Dimensions;
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  reviews: Review[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  meta: Meta;
  images: string[];
  thumbnail: string;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface Meta {
  createdAt: Date;
  updatedAt: Date;
  barcode: string;
  qrCode: string;
}

export interface Review {
  rating: number;
  comment: string;
  date: Date;
  reviewerName: string;
  reviewerEmail: string;
}

const connection = await mysql.createConnection({
  host: "localhost",
  user: "root",
  port: 3306,
  password: "",
  database: "product_db",
});


const fetchProductsFromAPI = async (): Promise<Product[]> => {
  try {
    const response = await axios.get("https://dummyjson.com/products/?limit=1000");
    return response.data.products || [];
  } catch (error: any) {
    console.error("Error al hacer pull de la API externa:", error.message);
    throw new Error("Error al obtener productos");
  }
};



const saveProducts = async (products: Product[]) => {
  try {
    for (const product of products) {
      await connection.beginTransaction();

      try {
        await connection.query(
          "INSERT IGNORE INTO category (slug) VALUES (?)",
          [product.category]
        );

        const [catSelect]: any = await connection.query(
          "SELECT id FROM category WHERE slug = ?",
          [product.category]
        );

        const categoryId = catSelect[0]?.id;
        if (!categoryId) throw new Error("Category not found after insert.");

        const productUUID = uuid();

        await connection.query(
          `
          INSERT INTO product (
            id, user_id, title, description, price, discount_percentage,
            stock, brand, weight, warranty_info, shipping_info, rating_avg,
            category_id, thumbnail, physical
          )
          VALUES (
            UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, 1
          )
        `,
          [
            productUUID,
            'b7a94068-9d9b-4325-af3f-cce6092fd5c0',
            product.title,
            product.description,
            product.price,
            product.discountPercentage,
            product.stock,
            product.brand || "Generic",
            product.weight,
            product.warrantyInformation,
            product.shippingInformation,
            product.rating,
            categoryId,
            product.thumbnail,
          ]
        );

        await connection.query(
          `
          INSERT INTO meta (product_id)
          VALUES (UUID_TO_BIN(?))
        `,
          [productUUID]
        );

        for (const tag of product.tags ?? []) {
          const tagClean = tag.toLowerCase();

          await connection.query(
            "INSERT IGNORE INTO tag (title) VALUES (?)",
            [tagClean]
          );

          const [tagRow]: any = await connection.query(
            "SELECT id FROM tag WHERE title = ?",
            [tagClean]
          );

          await connection.query(
            `
            INSERT IGNORE INTO prod_x_tag (product_id, tag_id)
            VALUES (UUID_TO_BIN(?), ?)
          `,
            [productUUID, tagRow[0].id]
          );
        }

        for (const img of product.images ?? []) {
          await connection.query(
            `
            INSERT INTO image (product_id, link)
            VALUES (UUID_TO_BIN(?), ?)
          `,
            [productUUID, img]
          );
        }

        await connection.commit();
      } catch (e) {
        await connection.rollback();
        if ((e as any).code !== "ER_DUP_ENTRY") throw e;
      }
    }

    console.log(
      `${products.length} productos procesados (insertados o ignorados si ya existían).`
    );
  } catch (e) {
    console.error("Error al guardar productos:", e);
  }
};


const run = async () => {
  try {
    const products = await fetchProductsFromAPI();
    await saveProducts(products);
  } catch (e) {
    console.error("Error en el proceso de pull y guardado:", e);
  } finally {
    connection.end();
  }
};

run();
