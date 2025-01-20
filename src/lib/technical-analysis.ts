import Decimal from 'decimal.js';

export interface PriceData {
  timestamp: number;
  open: typeof Decimal;
  high: typeof Decimal;
  low: typeof Decimal;
  close: typeof Decimal;
  volume: typeof Decimal;
}

export class TechnicalAnalysis {
  private data: PriceData[];

  constructor(data: PriceData[]) {
    this.data = data;
  }

  static calculateSMA(prices: typeof Decimal[], period: number): typeof Decimal[] {
    const sma: typeof Decimal[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      let sum = new Decimal(0);
      for (let j = 0; j < period; j++) {
        sum = sum.plus(prices[i - j]);
      }
      sma.push(sum.div(period));
    }
    return sma;
  }

  static calculateEMA(prices: typeof Decimal[], period: number): typeof Decimal[] {
    const ema: typeof Decimal[] = [];
    const multiplier = new Decimal(2).div(new Decimal(period + 1));
    
    // Start with SMA
    const firstSMA = prices.slice(0, period).reduce((a, b) => a.plus(b), new Decimal(0)).div(period);
    ema.push(firstSMA);
    
    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i].minus(ema[ema.length - 1])).mul(multiplier).plus(ema[ema.length - 1]);
      ema.push(currentEMA);
    }
    
    return ema;
  }

  static calculateRSI(prices: typeof Decimal[], period: number = 14): typeof Decimal[] {
    const rsi: typeof Decimal[] = [];
    let gains: typeof Decimal[] = [];
    let losses: typeof Decimal[] = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].minus(prices[i - 1]);
      gains.push(change.gt(0) ? change : new Decimal(0));
      losses.push(change.lt(0) ? change.abs() : new Decimal(0));
    }
    
    // Calculate initial averages
    let avgGain = gains.slice(0, period).reduce((a, b) => a.plus(b), new Decimal(0)).div(period);
    let avgLoss = losses.slice(0, period).reduce((a, b) => a.plus(b), new Decimal(0)).div(period);
    
    // Calculate RSI values
    for (let i = period; i < prices.length; i++) {
      const rs = avgGain.div(avgLoss);
      rsi.push(new Decimal(100).minus(new Decimal(100).div(new Decimal(1).plus(rs))));

      // Update averages
      avgGain = (avgGain.mul(period - 1).plus(gains[i])).div(period);
      avgLoss = (avgLoss.mul(period - 1).plus(losses[i])).div(period);
    }
    
    return rsi;
  }

  static calculateMACD(prices: typeof Decimal[]): {
    macd: typeof Decimal[];
    signal: typeof Decimal[];
    histogram: typeof Decimal[];
  } {
    const fastEMA = this.calculateEMA(prices, 12);
    const slowEMA = this.calculateEMA(prices, 26);
    const macd: typeof Decimal[] = [];
    
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

  static calculateBollingerBands(prices: typeof Decimal[], period: number = 20, stdDev: number = 2): {
    upper: typeof Decimal[];
    middle: typeof Decimal[];
    lower: typeof Decimal[];
  } {
    const middle = this.calculateSMA(prices, period);
    const upper: typeof Decimal[] = [];
    const lower: typeof Decimal[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const avg = middle[i - (period - 1)];
      const std = Math.sqrt(
        slice.reduce((sum, price) => sum + Math.pow(price.minus(avg).toNumber(), 2), 0) / period
      );
      
      upper.push(avg.plus(new Decimal(stdDev * std)));
      lower.push(avg.minus(new Decimal(stdDev * std)));
    }
    
    return { upper, middle, lower };
  }

  static calculateVolumeSMA(volumes: typeof Decimal[], period: number = 20): typeof Decimal[] {
    return this.calculateSMA(volumes, period);
  }

  static calculateOBV(prices: typeof Decimal[], volumes: typeof Decimal[]): typeof Decimal[] {
    const obv: typeof Decimal[] = [new Decimal(0)];
    
    for (let i = 1; i < prices.length; i++) {
      const currentOBV = obv[i - 1].plus(
        prices[i].gt(prices[i - 1]) ? volumes[i] :
        prices[i].lt(prices[i - 1]) ? volumes[i].neg() : new Decimal(0)
      );
      obv.push(currentOBV);
    }
    
    return obv;
  }

  static calculateFibonacciLevels(high: typeof Decimal, low: typeof Decimal): {
    levels: { [key: string]: typeof Decimal };
    extensions: { [key: string]: typeof Decimal };
  } {
    const diff = high.minus(low);
    
    return {
      levels: {
        '0': low,
        '0.236': low.plus(diff.mul(new Decimal(0.236))),
        '0.382': low.plus(diff.mul(new Decimal(0.382))),
        '0.5': low.plus(diff.mul(new Decimal(0.5))),
        '0.618': low.plus(diff.mul(new Decimal(0.618))),
        '0.786': low.plus(diff.mul(new Decimal(0.786))),
        '1': high,
      },
      extensions: {
        '1.272': low.plus(diff.mul(new Decimal(1.272))),
        '1.618': low.plus(diff.mul(new Decimal(1.618))),
        '2.618': low.plus(diff.mul(new Decimal(2.618))),
      },
    };
  }

  static calculatePivotPoints(high: typeof Decimal, low: typeof Decimal, close: typeof Decimal): {
    pivot: typeof Decimal;
    supports: typeof Decimal[];
    resistances: typeof Decimal[];
  } {
    const pivot = (high.plus(low).plus(close)).div(new Decimal(3));
    
    return {
      pivot,
      supports: [
        pivot.mul(new Decimal(2)).minus(high),                    // S1
        pivot.minus(high.minus(low)),                // S2
        pivot.minus(high.minus(low).mul(new Decimal(2))),            // S3
      ],
      resistances: [
        pivot.mul(new Decimal(2)).minus(low),                     // R1
        pivot.plus(high.minus(low)),                // R2
        pivot.plus(high.minus(low).mul(new Decimal(2))),            // R3
      ],
    };
  }
}
