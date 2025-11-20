import { ProductDto } from "./product";
import { AccountDto } from "../acount";
import { getRoleGroup, ERole, RoleGroup } from "libs/shared/role-enum";
import { ReviewDto } from "../review";

export class CompleteProductDto extends ProductDto {
  accountName: string;
  contactPhone: string;
  contactEmail: string;
  accountBio?: string | null;
  store?: {
    address: string;
    city: string;
    country: string;
    phone: string;
  }[];

  static fromEntities(product: ProductDto, account: AccountDto, reviewsUsers: AccountDto[]): CompleteProductDto {
    const result = Object.assign(new CompleteProductDto(), product);

    if (getRoleGroup(account.role) === RoleGroup[ERole.Business]) {
      result.accountName = account.businessProfile!.title;
      result.contactPhone = account.businessProfile!.phone;
      result.contactEmail = account.businessProfile!.contactEmail;
      result.accountBio = account.businessProfile!.bio;
    } else {
      result.accountName = account.username;
      result.contactPhone = account.userProfile!.phone!;
      result.contactEmail = account.email;
    }
    result.store = account.store?.map((s) => ({
    address: s.address.address,
    city: s.address.city,
    country: s.address.country,
    phone: s.phone,
    }));

    if (product.reviews?.length) {
      result.reviews = ReviewDto.loadArray(product.reviews, reviewsUsers)
    }
    
    return result;
  } 
}