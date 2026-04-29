import { Product } from "../../../entities/SQL/product/productEntity";
import { PartialProductDto } from "./partialProductDto";
import { AccountDto } from "../../events/account/accountDto";
import { ProductReviewDto } from "./productReviewDto";

export class ProductDto extends PartialProductDto {
  meta: {
    created: Date,
    updated: Date
  };
  weight: number;  
  physical: boolean;
  accountName: string;
  contactPhone: string;
  contactEmail: string;
  accountBio?: string;
  store: {
    address: string;
    city: string;
    country: string;
    phone: string;
  }[];
  reviews?: ProductReviewDto[];
  warrantyInfo?: string;
  shippingInfo?: string; 
  
  constructor(product: Product, accountList: AccountDto[]){
    super(product);
    const account = accountList.find((a) => a.id === product.meta.accountId);
    this.meta.created = new Date(product.meta.created);
    this.meta.updated = new Date(product.meta.updated);
    this.weight = product.weight;
    this.physical = product.physical;
    this.accountName = account.businessProfile.title ?? `${account.userProfile.firstname} ${account.userProfile.lastname}`;
    this.contactPhone = account.businessProfile.phone ?? account.userProfile.phone;
    this.contactEmail = account.email;
    this.accountBio = account.businessProfile.bio ?? undefined;
    this.store = account.store? account.store.map((s) => {
      return {
        address: s.address.address,
        city: s.address.city,
        country: s.address.country,
        phone: s.phone
      };
    }) : [];
    this.warrantyInfo = product.warrantyInfo ?? undefined;
    this.shippingInfo = product.shippingInfo ?? undefined;

    let result: ProductReviewDto[] = [];
    if(product.reviews && product.reviews.length){
      product.reviews.forEach((r) => {
        const aux = accountList.find((a) => a.id === r.accountId);
        if(aux){
          result.push(new ProductReviewDto(aux.username, r.productId, r.rating, r.comment, r.created));
        };  
      });
    };
    this.reviews = result.length? result : undefined;
  };
}