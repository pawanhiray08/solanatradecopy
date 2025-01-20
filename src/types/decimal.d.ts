declare module 'decimal.js' {
  export default class Decimal {
    constructor(value: Decimal.Value);

    static precision: number;
    static rounding: number;
    static toExpNeg: number;
    static toExpPos: number;

    abs(): Decimal;
    ceil(): Decimal;
    cmp(n: Decimal.Value): number;
    div(n: Decimal.Value): Decimal;
    floor(): Decimal;
    equals(n: Decimal.Value): boolean;
    gt(n: Decimal.Value): boolean;
    gte(n: Decimal.Value): boolean;
    lt(n: Decimal.Value): boolean;
    lte(n: Decimal.Value): boolean;
    minus(n: Decimal.Value): Decimal;
    mod(n: Decimal.Value): Decimal;
    mul(n: Decimal.Value): Decimal;
    plus(n: Decimal.Value): Decimal;
    pow(n: Decimal.Value): Decimal;
    round(): Decimal;
    sqrt(): Decimal;
    sub(n: Decimal.Value): Decimal;
    toFixed(dp?: number): string;
    toNumber(): number;
    toString(): string;
    valueOf(): string;
  }

  namespace Decimal {
    type Value = string | number | Decimal;
  }
}
