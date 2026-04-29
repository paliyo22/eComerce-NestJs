import { registerDecorator, ValidationArguments } from "class-validator";

export function AtMostOne(...fields: string[]) {
  return function (constructor: Function) {
    registerDecorator({
      name: 'exactlyOne',
      target: constructor,
      propertyName: fields.join('|'),
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as any;
          const present = fields.filter(f => obj[f] !== undefined);
          return present.length <= 1;
        },
        defaultMessage() {
          return `At least one of [${fields.join(', ')}] must be provided`;
        }
      }
    });
  };
}