/**
 * Advanced Chart Component
 * 
 * Features:
 * - Candlestick charts
 * - RSI indicator
 * - MACD indicator
 * - Bollinger Bands
 * - Multiple timeframes
 */

import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from 'recharts';
import {
  priceToOHLC,
  calculateRSIFromOHLC,
  calculateMACDFromOHLC,
  calculateBollingerBands,
  type OHLC,
} from './indicators';

// Types
interface AdvancedChartProps {
  priceHistory: { time: number; value: number }[];
  height?: number;
  showVolume?: boolean;
}

type Indicator = 'none' | 'rsi' | 'macd' | 'bollinger';
type Timeframe = '1H' | '4H' | '1D' | '1W';

const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1H': 60 * 60 * 1000,
  '4H': 4 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
};

// Custom Candlestick shape
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  
  const isGreen = close >= open;
  const color = isGreen ? '#238636' : '#DA3633';
  
  const candleHeight = Math.abs(close - open);
  const candleY = Math.min(open, close);
  
  // Scale values to chart coordinates
  const scale = (val: number) => y + (payload.close - val) * (height / candleHeight || 1);
  
  return (
    <g>
      {/* Wick */}
      <line
        x1={x + width / 2}
        x2={x + width / 2}
        y1={scale(high)}
        y2={scale(low)}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={x + width * 0.1}
        y={scale(Math.max(open, close))}
        width={width * 0.8}
        height={Math.max(Math.abs(scale(open) - scale(close)), 1)}
        fill={isGreen ? color : color}
        stroke={color}
      />
    </g>
  );
};

// Custom tooltip
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  return (
    <div className="bg-brand-surface-2 p-3 border border-brand-border rounded-lg shadow-lg text-sm">
      <p className="text-brand-secondary mb-2">
        {new Date(label).toLocaleString()}
      </p>
      {data.open !== undefined && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-brand-secondary">Open:</span>
          <span className="text-brand-text font-mono">{(data.open * 100).toFixed(1)}¢</span>
          <span className="text-brand-secondary">High:</span>
          <span className="text-brand-text font-mono">{(data.high * 100).toFixed(1)}¢</span>
          <span className="text-brand-secondary">Low:</span>
          <span className="text-brand-text font-mono">{(data.low * 100).toFixed(1)}¢</span>
          <span className="text-brand-secondary">Close:</span>
          <span className="text-brand-text font-mono">{(data.close * 100).toFixed(1)}¢</span>
        </div>
      )}
    </div>
  );
};

// RSI Chart Component
const RSIChart: React.FC<{ data: { time: number; rsi: number | null }[] }> = ({ data }) => (
  <div className="h-[100px]">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
        <XAxis 
          dataKey="time" 
          tickFormatter={(time) => new Date(time).toLocaleTimeString()} 
          stroke="#8B949E" 
          fontSize={10}
          hide
        />
        <YAxis domain={[0, 100]} stroke="#8B949E" fontSize={10} ticks={[30, 50, 70]} />
        <ReferenceLine y={70} stroke="#DA3633" strokeDasharray="3 3" />
        <ReferenceLine y={30} stroke="#238636" strokeDasharray="3 3" />
        <ReferenceLine y={50} stroke="#8B949E" strokeDasharray="3 3" />
        <Line 
          type="monotone" 
          dataKey="rsi" 
          stroke="#A371F7" 
          strokeWidth={1.5} 
          dot={false} 
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

// MACD Chart Component
const MACDChart: React.FC<{ data: { time: number; macd: number | null; signal: number | null; histogram: number | null }[] }> = ({ data }) => (
  <div className="h-[100px]">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
        <XAxis 
          dataKey="time" 
          tickFormatter={(time) => new Date(time).toLocaleTimeString()} 
          stroke="#8B949E" 
          fontSize={10}
          hide
        />
        <YAxis stroke="#8B949E" fontSize={10} />
        <ReferenceLine y={0} stroke="#8B949E" />
        <Bar 
          dataKey="histogram" 
          fill="#8B949E"
          opacity={0.5}
        />
        <Line 
          type="monotone" 
          dataKey="macd" 
          stroke="#58A6FF" 
          strokeWidth={1.5} 
          dot={false} 
        />
        <Line 
          type="monotone" 
          dataKey="signal" 
          stroke="#F78166" 
          strokeWidth={1.5} 
          dot={false} 
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

// Main Advanced Chart Component
export const AdvancedChart: React.FC<AdvancedChartProps> = ({
  priceHistory,
  height = 400,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('4H');
  const [indicator, setIndicator] = useState<Indicator>('none');
  const [showBollinger, setShowBollinger] = useState(false);
  
  // Convert to OHLC data
  const ohlcData = useMemo(() => {
    return priceToOHLC(priceHistory, TIMEFRAME_MS[timeframe]);
  }, [priceHistory, timeframe]);
  
  // Calculate indicators
  const rsiData = useMemo(() => {
    if (indicator !== 'rsi') return [];
    return calculateRSIFromOHLC(ohlcData).map((r, i) => ({
      time: ohlcData[i]?.time ?? i,
      rsi: r.value,
    }));
  }, [ohlcData, indicator]);
  
  const macdData = useMemo(() => {
    if (indicator !== 'macd') return [];
    return calculateMACDFromOHLC(ohlcData);
  }, [ohlcData, indicator]);
  
  const bollingerData = useMemo(() => {
    if (!showBollinger) return [];
    const closes = ohlcData.map(d => d.close);
    return calculateBollingerBands(closes);
  }, [ohlcData, showBollinger]);
  
  // Merge data for chart
  const chartData = useMemo(() => {
    return ohlcData.map((candle, i) => ({
      ...candle,
      bollingerUpper: bollingerData[i]?.upper ?? null,
      bollingerMiddle: bollingerData[i]?.middle ?? null,
      bollingerLower: bollingerData[i]?.lower ?? null,
    }));
  }, [ohlcData, bollingerData]);
  
  const priceRange = useMemo(() => {
    if (ohlcData.length === 0) return { min: 0, max: 1 };
    const lows = ohlcData.map(d => d.low);
    const highs = ohlcData.map(d => d.high);
    return {
      min: Math.min(...lows) * 0.95,
      max: Math.max(...highs) * 1.05,
    };
  }, [ohlcData]);
  
  const latestCandle = ohlcData[ohlcData.length - 1];
  const firstCandle = ohlcData[0];
  const priceChange = latestCandle && firstCandle
    ? ((latestCandle.close - firstCandle.open) / firstCandle.open) * 100
    : 0;
  const isPositive = priceChange >= 0;
  
  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold text-brand-text">
              {latestCandle ? `${(latestCandle.close * 100).toFixed(1)}¢` : '--'}
            </span>
            <span className={`ml-2 text-sm font-medium ${isPositive ? 'text-brand-yes' : 'text-brand-no'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-brand-surface-2 p-1 rounded-lg">
            {(['1H', '4H', '1D', '1W'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-brand-primary text-white'
                    : 'text-brand-secondary hover:text-brand-text'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          {/* Indicator selector */}
          <select
            value={indicator}
            onChange={(e) => setIndicator(e.target.value as Indicator)}
            className="bg-brand-surface-2 text-brand-text text-xs px-3 py-1 rounded-lg border border-brand-border focus:outline-none focus:border-brand-primary"
          >
            <option value="none">No Indicator</option>
            <option value="rsi">RSI</option>
            <option value="macd">MACD</option>
          </select>
          
          {/* Bollinger toggle */}
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              showBollinger
                ? 'bg-brand-primary text-white'
                : 'bg-brand-surface-2 text-brand-secondary hover:text-brand-text'
            }`}
          >
            BB
          </button>
        </div>
      </div>
      
      {/* Main Chart */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis
              dataKey="time"
              tickFormatter={(time) => {
                const d = new Date(time);
                return timeframe === '1W' || timeframe === '1D'
                  ? d.toLocaleDateString()
                  : d.toLocaleTimeString();
              }}
              stroke="#8B949E"
              fontSize={10}
            />
            <YAxis
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(val) => `${(val * 100).toFixed(0)}¢`}
              stroke="#8B949E"
              fontSize={10}
              orientation="right"
            />
            <Tooltip content={<ChartTooltip />} />
            
            {/* Bollinger Bands */}
            {showBollinger && (
              <>
                <Area
                  type="monotone"
                  dataKey="bollingerUpper"
                  stroke="#8B949E"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="none"
                />
                <Line
                  type="monotone"
                  dataKey="bollingerMiddle"
                  stroke="#8B949E"
                  strokeWidth={1}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="bollingerLower"
                  stroke="#8B949E"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="none"
                />
              </>
            )}
            
            {/* Candlesticks as bars with custom coloring */}
            <Bar
              dataKey="close"
              shape={(props: any) => {
                const { x, width, payload } = props;
                const isGreen = payload.close >= payload.open;
                const color = isGreen ? '#238636' : '#DA3633';
                const bodyTop = Math.max(payload.open, payload.close);
                const bodyBottom = Math.min(payload.open, payload.close);
                
                // Calculate Y positions using price range
                const range = priceRange.max - priceRange.min;
                const chartHeight = height - 50; // Account for margins
                const getY = (price: number) => ((priceRange.max - price) / range) * chartHeight + 10;
                
                return (
                  <g>
                    {/* Wick */}
                    <line
                      x1={x + width / 2}
                      x2={x + width / 2}
                      y1={getY(payload.high)}
                      y2={getY(payload.low)}
                      stroke={color}
                      strokeWidth={1}
                    />
                    {/* Body */}
                    <rect
                      x={x + width * 0.15}
                      y={getY(bodyTop)}
                      width={width * 0.7}
                      height={Math.max(getY(bodyBottom) - getY(bodyTop), 2)}
                      fill={color}
                      stroke={color}
                    />
                  </g>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Indicator Charts */}
      {indicator === 'rsi' && rsiData.length > 0 && (
        <div className="mt-4 border-t border-brand-border pt-4">
          <div className="text-xs text-brand-secondary mb-2">RSI (14)</div>
          <RSIChart data={rsiData} />
        </div>
      )}
      
      {indicator === 'macd' && macdData.length > 0 && (
        <div className="mt-4 border-t border-brand-border pt-4">
          <div className="text-xs text-brand-secondary mb-2">MACD (12, 26, 9)</div>
          <MACDChart data={macdData} />
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-brand-secondary">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-brand-yes rounded"></div>
          <span>Bullish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-brand-no rounded"></div>
          <span>Bearish</span>
        </div>
        {showBollinger && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-brand-secondary"></div>
            <span>Bollinger Bands (20, 2)</span>
          </div>
        )}
        {indicator === 'rsi' && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[#A371F7]"></div>
              <span>RSI</span>
            </div>
            <div className="text-brand-secondary">
              Overbought: &gt;70 | Oversold: &lt;30
            </div>
          </>
        )}
        {indicator === 'macd' && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[#58A6FF]"></div>
              <span>MACD</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[#F78166]"></div>
              <span>Signal</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedChart;
