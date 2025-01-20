import Decimal from 'decimal.js';

interface PriceData {
  timestamp: number;
  price: number;
  volume?: number;
}

export class TechnicalAnalysis {
  static calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  static calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA
    const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(firstSMA);
    
    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(currentEMA);
    }
    
    return ema;
  }

  static calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    // Calculate initial averages
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // Calculate RSI
    for (let i = period; i < prices.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;
      
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  static calculateMACD(prices: number[]): {
    macd: number[];
    signal: number[];
    histogram: number[];
  } {
    const fastEMA = this.calculateEMA(prices, 12);
    const slowEMA = this.calculateEMA(prices, 26);
    const macd: number[] = [];
    
    // Calculate MACD line
    for (let i = 0; i < fastEMA.length; i++) {
      macd.push(fastEMA[i] - slowEMA[i]);
    }
    
    // Calculate signal line (9-day EMA of MACD)
    const signal = this.calculateEMA(macd, 9);
    
    // Calculate histogram
    const histogram = macd.map((value, i) => value - signal[i]);
    
    return { macd, signal, histogram };
  }

  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const middle = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const avg = middle[i - (period - 1)];
      const std = Math.sqrt(
        slice.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / period
      );
      
      upper.push(avg + (stdDev * std));
      lower.push(avg - (stdDev * std));
    }
    
    return { upper, middle, lower };
  }

  static calculateVolumeSMA(volumes: number[], period: number = 20): number[] {
    return this.calculateSMA(volumes, period);
  }

  static calculateOBV(prices: number[], volumes: number[]): number[] {
    const obv: number[] = [0];
    
    for (let i = 1; i < prices.length; i++) {
      const currentOBV = obv[i - 1] + (
        prices[i] > prices[i - 1] ? volumes[i] :
        prices[i] < prices[i - 1] ? -volumes[i] : 0
      );
      obv.push(currentOBV);
    }
    
    return obv;
  }

  static calculateFibonacciLevels(high: number, low: number): {
    levels: { [key: string]: number };
    extensions: { [key: string]: number };
  } {
    const diff = high - low;
    
    return {
      levels: {
        '0': low,
        '0.236': low + diff * 0.236,
        '0.382': low + diff * 0.382,
        '0.5': low + diff * 0.5,
        '0.618': low + diff * 0.618,
        '0.786': low + diff * 0.786,
        '1': high,
      },
      extensions: {
        '1.272': low + diff * 1.272,
        '1.618': low + diff * 1.618,
        '2.618': low + diff * 2.618,
      },
    };
  }

  static calculatePivotPoints(high: number, low: number, close: number): {
    pivot: number;
    supports: number[];
    resistances: number[];
  } {
    const pivot = (high + low + close) / 3;
    
    return {
      pivot,
      supports: [
        2 * pivot - high,                    // S1
        pivot - (high - low),                // S2
        pivot - 2 * (high - low),            // S3
      ],
      resistances: [
        2 * pivot - low,                     // R1
        pivot + (high - low),                // R2
        pivot + 2 * (high - low),            // R3
      ],
    };
  }
}
