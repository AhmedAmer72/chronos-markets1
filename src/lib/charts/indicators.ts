/**
 * Technical Indicators Library
 * 
 * Provides RSI, MACD, SMA, EMA, and other technical indicators
 * for advanced charting.
 */

export interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorValue {
  time: number;
  value: number | null;
}

export interface MACDValue {
  time: number;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface BollingerValue {
  time: number;
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  let ema: number | null = null;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is SMA
      ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(ema);
    } else {
      ema = (data[i] - ema!) * multiplier + ema!;
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): IndicatorValue[] {
  const result: IndicatorValue[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate RSI
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push({ time: i, value: null });
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push({ time: i, value: 100 });
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push({ time: i, value: rsi });
      }
    }
  }
  
  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDValue[] {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  
  // Calculate MACD line
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(fastEMA[i]! - slowEMA[i]!);
    }
  }
  
  // Calculate signal line (EMA of MACD)
  const validMacd = macdLine.filter(v => v !== null) as number[];
  const signalEMA = calculateEMA(validMacd, signalPeriod);
  
  // Build result
  const result: MACDValue[] = [];
  let validIndex = 0;
  
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null) {
      result.push({ time: i, macd: null, signal: null, histogram: null });
    } else {
      const signal = signalEMA[validIndex] ?? null;
      const histogram = signal !== null ? macdLine[i]! - signal : null;
      result.push({
        time: i,
        macd: macdLine[i],
        signal,
        histogram,
      });
      validIndex++;
    }
  }
  
  return result;
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerValue[] {
  const sma = calculateSMA(closes, period);
  const result: BollingerValue[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) {
      result.push({ time: i, upper: null, middle: null, lower: null });
    } else {
      // Calculate standard deviation
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = sma[i]!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      
      result.push({
        time: i,
        upper: mean + stdDev * sd,
        middle: mean,
        lower: mean - stdDev * sd,
      });
    }
  }
  
  return result;
}

/**
 * Convert simple price data to OHLC candlestick data
 */
export function priceToOHLC(
  prices: { time: number; value: number }[],
  intervalMs: number = 3600000 // 1 hour default
): OHLC[] {
  if (prices.length === 0) return [];
  
  const ohlcMap = new Map<number, OHLC>();
  
  for (const price of prices) {
    const bucket = Math.floor(price.time / intervalMs) * intervalMs;
    
    if (ohlcMap.has(bucket)) {
      const candle = ohlcMap.get(bucket)!;
      candle.high = Math.max(candle.high, price.value);
      candle.low = Math.min(candle.low, price.value);
      candle.close = price.value;
    } else {
      ohlcMap.set(bucket, {
        time: bucket,
        open: price.value,
        high: price.value,
        low: price.value,
        close: price.value,
      });
    }
  }
  
  return Array.from(ohlcMap.values()).sort((a, b) => a.time - b.time);
}

/**
 * Calculate RSI for OHLC data
 */
export function calculateRSIFromOHLC(data: OHLC[], period: number = 14): IndicatorValue[] {
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, period);
  
  return rsi.map((r, i) => ({
    time: data[i]?.time ?? i,
    value: r.value,
  }));
}

/**
 * Calculate MACD for OHLC data
 */
export function calculateMACDFromOHLC(
  data: OHLC[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): (MACDValue & { time: number })[] {
  const closes = data.map(d => d.close);
  const macd = calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod);
  
  return macd.map((m, i) => ({
    ...m,
    time: data[i]?.time ?? i,
  }));
}
