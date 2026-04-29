import { SuccessDto } from "./succesDto";

export function errorMessage(err?: any): SuccessDto<any> {
  if(err){
    console.error(err.message ?? err);
  };

  return {
    success: false,
    code: 500,
    message: 'INTERNAL_ERROR'
  };
}

export const unauthorized = {
  success: false, 
  code: 401, 
  message: 'UNAUTHORIZED'
};

export const banned = {
  success: false, 
  code: 403, 
  message: 'BANNED'
};

export const suspended = {
  success: false, 
  code: 403, 
  message: 'SUSPENDED'
};

export const badRequest = { 
  success: false, 
  message: 'BAD_REQUEST', 
  code: 400 
};

export const deleted = {
  success: false, 
  code: 403, 
  message: 'DELETED'
};

export const notAvailable = {
  success: false, 
  code: 403, 
  message: 'NOT_AVAILABLE'
};

export const notFound = {
  success: false, 
  code: 404, 
  message: 'NOT_FOUND'
};

export const expired = {
  success: false, 
  code: 410, 
  message: 'EXPIRED'
};