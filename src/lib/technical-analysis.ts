import Decimal from 'decimal.js';

export interface PriceData {
  timestamp: number;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
}

export class TechnicalAnalysis {
  private data: PriceData[];

  constructor(data: PriceData[]) {
    this.data = data;
  }

  static calculateSMA(prices: (number | Decimal)[], period: number): Decimal[] {
    const decimalPrices = prices.map(price => price instanceof Decimal ? price : new Decimal(price));
    const sma: Decimal[] = [];
    for (let i = period - 1; i < decimalPrices.length; i++) {
      let sum = new Decimal(0);
      for (let j = 0; j < period; j++) {
        sum = sum.plus(decimalPrices[i - j]);
      }
      sma.push(sum.div(new Decimal(period)));
    }
    return sma;
  }

  static calculateEMA(prices: (number | Decimal)[], period: number): Decimal[] {
    const decimalPrices = prices.map(price => price instanceof Decimal ? price : new Decimal(price));
    const ema: Decimal[] = [];
    const multiplier = new Decimal(2).div(new Decimal(period + 1));
    
    // Start with SMA
    const firstSMA = decimalPrices.slice(0, period).reduce((a, b) => new Decimal(a).plus(b), new Decimal(0)).div(new Decimal(period));
    ema.push(firstSMA);
    
    // Calculate EMA
    for (let i = period; i < decimalPrices.length; i++) {
      const currentPrice = decimalPrices[i];
      const prevEMA = ema[ema.length - 1];
      const currentEMA = currentPrice.minus(prevEMA).mul(multiplier).plus(prevEMA);
      ema.push(currentEMA);
    }
    
    return ema;
  }

  static calculateRSI(prices: (number | Decimal)[], period: number = 14): Decimal[] {
    const decimalPrices = prices.map(price => price instanceof Decimal ? price : new Decimal(price));
    const rsi: Decimal[] = [];
    let gains: Decimal[] = [];
    let losses: Decimal[] = [];
    
    // Calculate price changes
    for (let i = 1; i < decimalPrices.length; i++) {
      const current = decimalPrices[i];
      const previous = decimalPrices[i - 1];
      const change = current.minus(previous);
      gains.push(change.gt(new Decimal(0)) ? change : new Decimal(0));
      losses.push(change.lt(new Decimal(0)) ? change.abs() : new Decimal(0));
    }
    
    // Calculate initial averages
    let avgGain = gains.slice(0, period).reduce((a, b) => new Decimal(a).plus(b), new Decimal(0)).div(new Decimal(period));
    let avgLoss = losses.slice(0, period).reduce((a, b) => new Decimal(a).plus(b), new Decimal(0)).div(new Decimal(period));
    
    // Calculate RSI values
    for (let i = period; i < decimalPrices.length; i++) {
      const rs = avgGain.div(avgLoss);
      rsi.push(new Decimal(100).minus(new Decimal(100).div(new Decimal(1).plus(rs))));

      // Update averages
      avgGain = (avgGain.mul(new Decimal(period - 1)).plus(gains[i])).div(new Decimal(period));
      avgLoss = (avgLoss.mul(new Decimal(period - 1)).plus(losses[i])).div(new Decimal(period));
    }
    
    return rsi;
  }

  static calculateMACD(prices: Decimal[], period: number = 26): {
    macd: Decimal[];
    signal: Decimal[];
    histogram: Decimal[];
  } {
    const fastEMA = this.calculateEMA(prices, 12);
    const slowEMA = this.calculateEMA(prices, period);
    const macd: Decimal[] = [];
    
    // Calculate MACD line
    for (let i = 0; i < fastEMA.length; i++) {
      macd.push(fastEMA[i].minus(slowEMA[i]));
    }
    
    // Calculate signal line (9-day EMA of MACD)
    const signal = this.calculateEMA(macd, 9);
    
    // Calculate histogram
    const histogram = macd.map((value, i) => value.minus(signal[i]));
    
    return { macd, signal, histogram };
  }

  static calculateBollingerBands(prices: Decimal[], period: number = 20, stdDev: number = 2): {
    upper: Decimal[];
    middle: Decimal[];
    lower: Decimal[];
  } {
    const middle = this.calculateSMA(prices, period);
    const upper: Decimal[] = [];
    const lower: Decimal[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1).map(p => new Decimal(p));
      const avg = middle[i - (period - 1)];
      const std = Math.sqrt(
        slice.reduce((sum, price) => sum + Math.pow(price.minus(avg).toNumber(), 2), 0) / period
      );
      
      upper.push(avg.plus(new Decimal(stdDev * std)));
      lower.push(avg.minus(new Decimal(stdDev * std)));
    }
    
    return { upper, middle, lower };
  }

  static calculateVolumeSMA(volumes: Decimal[], period: number = 20): Decimal[] {
    return this.calculateSMA(volumes, period);
  }

  static calculateOBV(prices: Decimal[], volumes: Decimal[]): Decimal[] {
    const obv: Decimal[] = [new Decimal(0)];
    
    for (let i = 1; i < prices.length; i++) {
      const currentOBV = obv[i - 1].plus(
        prices[i].gt(prices[i - 1]) ? volumes[i] :
        prices[i].lt(prices[i - 1]) ? volumes[i].mul(new Decimal(-1)) :
        new Decimal(0)
      );
      obv.push(currentOBV);
    }
    
    return obv;
  }

  static calculateFibonacciLevels(high: Decimal, low: Decimal): {
    levels: { [key: string]: Decimal };
    extensions: { [key: string]: Decimal };
  } {
    const diff = high.minus(low);
    
    const levels = {
      '0': low,
      '0.236': low.plus(diff.mul(new Decimal('0.236'))),
      '0.382': low.plus(diff.mul(new Decimal('0.382'))),
      '0.5': low.plus(diff.mul(new Decimal('0.5'))),
      '0.618': low.plus(diff.mul(new Decimal('0.618'))),
      '0.786': low.plus(diff.mul(new Decimal('0.786'))),
      '1': high
    };
    
    const extensions = {
      '1.272': low.plus(diff.mul(new Decimal('1.272'))),
      '1.414': low.plus(diff.mul(new Decimal('1.414'))),
      '1.618': low.plus(diff.mul(new Decimal('1.618'))),
      '2.000': low.plus(diff.mul(new Decimal('2.000'))),
      '2.414': low.plus(diff.mul(new Decimal('2.414'))),
      '2.618': low.plus(diff.mul(new Decimal('2.618')))
    };
    
    return {
      levels,
      extensions
    };
  }

  static calculatePivotPoints(high: Decimal, low: Decimal, close: Decimal): {
    pivot: Decimal;
    supports: Decimal[];
    resistances: Decimal[];
  } {
    const pivot = high.plus(low).plus(close).div(new Decimal(3));
    
    const supports = [
      pivot.mul(new Decimal(2)).minus(high),
      pivot.minus(high.minus(low)),
      pivot.mul(new Decimal(2)).minus(high).minus(high.minus(low))
    ];
    
    const resistances = [
      pivot.mul(new Decimal(2)).minus(low),
      pivot.plus(high.minus(low)),
      pivot.mul(new Decimal(2)).minus(low).plus(high.minus(low))
    ];
    
    return {
      pivot,
      supports,
      resistances
    };
  }
}
