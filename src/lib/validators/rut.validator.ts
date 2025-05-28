import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function cleanRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
}

function isValidRut(rut: string): boolean {
  rut = cleanRut(rut);

  if (!/^[0-9]+[0-9K]$/.test(rut)) return false;

  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i)) * multiplier;
    multiplier = multiplier < 7 ? multiplier + 1 : 2;
  }

  const expectedDv = 11 - (sum % 11);
  let expectedChar: string;
  if (expectedDv === 11) {
    expectedChar = '0';
  } else if (expectedDv === 10) {
    expectedChar = 'K';
  } else {
    expectedChar = expectedDv.toString();
  }

  return dv === expectedChar;
}

function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  const reversed = body.split('').reverse().join('');
  let formatted = '';
  for (let i = 0; i < reversed.length; i++) {
    if (i !== 0 && i % 3 === 0) formatted = '.' + formatted;
    formatted = reversed[i] + formatted;
  }

  return `${formatted}-${dv}`;
}

export function IsValidRut(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidRut',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments): boolean {
          if (typeof value !== 'string') return false;

          const valid = isValidRut(value);
          if (valid) {
            const formatted = formatRut(value);
            (args.object as any)[propertyName] = formatted;
          }
          return valid;
        },
        defaultMessage(): string {
          return 'El RUT no es válido';
        },
      },
    });
  };
}
