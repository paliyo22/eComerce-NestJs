import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class PasswordStrengthPipe implements PipeTransform {
  transform(value: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException('La contraseña debe ser una cadena de texto.');
    }

    if (value.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    }

    if (value.length > 32) {
      throw new BadRequestException('La contraseña no puede tener más de 32 caracteres.');
    }

    if (!/[A-Z]/.test(value)) {
      throw new BadRequestException('La contraseña debe contener al menos una letra mayúscula.');
    }

    if (!/[a-z]/.test(value)) {
      throw new BadRequestException('La contraseña debe contener al menos una letra minúscula.');
    }

    if (!/[0-9]/.test(value)) {
      throw new BadRequestException('La contraseña debe contener al menos un número.');
    }

    if (!/[\W_]/.test(value)) {
      throw new BadRequestException('La contraseña debe contener al menos un símbolo especial.');
    }

    return value;
  }
}
