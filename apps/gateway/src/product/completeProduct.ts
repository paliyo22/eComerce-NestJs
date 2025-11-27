import { AccountDto, PartialAccountDto } from "libs/dtos/acount";
import { ProductDto } from "libs/dtos/product";
import { ReviewDto } from "libs/dtos/review";
import { getRoleGroup, ERole, RoleGroup } from "libs/shared/role-enum";


export class ProductOutputDto extends ProductDto {
  accountName: string;
  contactPhone?: string;
  contactEmail: string;
  accountBio?: string;
  store?: {
    address: string;
    city: string;
    country: string;
    phone: string;
  }[];

  static fromEntities(product: ProductDto, account: AccountDto, reviewsUsers: PartialAccountDto[]): ProductOutputDto {
    const result = Object.assign(new ProductOutputDto(), product);

    if (getRoleGroup(account.role) === RoleGroup[ERole.Business]) {
      result.accountName = account.businessProfile!.title;
      result.contactPhone = account.businessProfile!.phone;
      result.contactEmail = account.businessProfile!.contactEmail;
      if (account.businessProfile!.bio) {
        result.accountBio = account.businessProfile!.bio;
      }else{
        result.accountBio = undefined;
      }
    } else {
      result.accountName = `${account.userProfile!.firstname} ${account.userProfile!.lastname}`;
      result.contactPhone = account.userProfile!.phone!;
      result.contactEmail = account.email;
    }
    result.store = account.store?.map((s) => ({
      address: s.address.address,
      city: s.address.city,
      country: s.address.country,
      phone: s.phone
    }));

    if (product.reviews?.length) {
      result.reviews = ReviewDto.loadArray(product.reviews, reviewsUsers)
    }
    
    return result;
  } 
}