'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
);

interface PortfolioMetrics {
  totalValue: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface TokenAllocation {
  token: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

interface Position {
  token_symbol: string;
  amount: number;
  value: number;
  pnl_percentage: number;
}

interface PortfolioHistory {
  timestamp: string;
  total_value: number;
}

export function PortfolioAnalytics() {
  const { publicKey } = useWallet();
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalValue: 0,
    dailyPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
    winRate: 0,
    averageReturn: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
  });
  const [allocation, setAllocation] = useState<TokenAllocation[]>([]);
  const [historicalValue, setHistoricalValue] = useState<{ date: Date; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publicKey) {
      loadPortfolioData();
      const interval = setInterval(loadPortfolioData, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [publicKey]);

  async function loadPortfolioData() {
    if (!publicKey) return;

    try {
      setLoading(true);
      
      // Load positions and calculate current values
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('wallet_address', publicKey.toString());

      if (!positions) return;

      // Calculate total portfolio value and allocation
      let totalValue = 0;
      const tokenValues: { [key: string]: number } = {};

      await Promise.all(positions.map(async position => {
        const currentPrice = await fetchTokenPrice(position.token_address);
        const value = position.amount * currentPrice;
        totalValue += value;
        tokenValues[position.token_symbol] = value;
      }));

      // Calculate token allocation
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#7BC8A4', '#E8C3B9'
      ];

      const allocationData = Object.entries(tokenValues).map(([symbol, value], index) => ({
        token: positions.find(p => p.token_symbol === symbol)?.token_address || '',
        symbol,
        value,
        percentage: (value / totalValue) * 100,
        color: colors[index % colors.length],
      }));

      // Calculate historical values and metrics
      const historicalData = await loadHistoricalValues(publicKey.toString());
      const metrics = calculateMetrics(historicalData);

      setMetrics(metrics);
      setAllocation(allocationData);
      setHistoricalValue(historicalData);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTokenPrice(tokenAddress: string): Promise<number> {
    try {
      const response = await fetch(`https://api.jupiter.so/price/${tokenAddress}`);
      const data = await response.json();
      return data.price;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return 0;
    }
  }

  async function loadHistoricalValues(walletAddress: string) {
    const { data } = await supabase
      .from('portfolio_history')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('timestamp', { ascending: true });

    return (data || []).map(item => ({
      date: new Date(item.timestamp),
      value: item.total_value,
    }));
  }

  function calculateMetrics(historicalData: { date: Date; value: number }[]): PortfolioMetrics {
    if (historicalData.length === 0) {
      return {
        totalValue: 0,
        dailyPnL: 0,
        weeklyPnL: 0,
        monthlyPnL: 0,
        winRate: 0,
        averageReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      };
    }

    const currentValue = historicalData[historicalData.length - 1].value;
    const dailyValue = historicalData.find(d => 
      d.date >= new Date(Date.now() - 86400000))?.value || currentValue;
    const weeklyValue = historicalData.find(d =>
      d.date >= new Date(Date.now() - 604800000))?.value || currentValue;
    const monthlyValue = historicalData.find(d =>
      d.date >= new Date(Date.now() - 2592000000))?.value || currentValue;

    // Calculate returns
    const returns = historicalData.map((d, i) => 
      i === 0 ? 0 : (d.value - historicalData[i - 1].value) / historicalData[i - 1].value
    );

    // Calculate win rate
    const winningTrades = returns.filter(r => r > 0).length;
    const winRate = (winningTrades / returns.length) * 100;

    // Calculate average return
    const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 100;

    // Calculate Sharpe Ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - averageReturn / 100, 2), 0) / returns.length
    );
    const sharpeRatio = (averageReturn / 100 - riskFreeRate) / stdDev;

    // Calculate Maximum Drawdown
    let maxDrawdown = 0;
    let peak = historicalData[0].value;
    
    for (const { value } of historicalData) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return {
      totalValue: currentValue,
      dailyPnL: ((currentValue - dailyValue) / dailyValue) * 100,
      weeklyPnL: ((currentValue - weeklyValue) / weeklyValue) * 100,
      monthlyPnL: ((currentValue - monthlyValue) / monthlyValue) * 100,
      winRate,
      averageReturn,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100,
    };
  }

  const calculatePositionMetrics = (position: Position) => {
    // Calculate position metrics
    return {
      value: position.value,
      pnl: position.value * (position.pnl_percentage / 100),
    };
  };

  const calculatePortfolioMetrics = (positions: Position[]) => {
    // Calculate portfolio metrics
    return positions.reduce((acc, p) => {
      const metrics = calculatePositionMetrics(p);
      return {
        totalValue: acc.totalValue + metrics.value,
        totalPnl: acc.totalPnl + metrics.pnl,
      };
    }, { totalValue: 0, totalPnl: 0 });
  };

  const renderTokenAllocation = (positions: Position[]) => {
    const data = positions.map(item => ({
      symbol: item.token_symbol,
      value: item.value,
    }));

    return data;
  };

  let valueChart;
  let allocationChart;

  const valueChartData = {
    labels: historicalValue.map(d => d.date),
    datasets: [{
      label: 'Portfolio Value',
      data: historicalValue.map(d => d.value),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
      fill: true,
      backgroundColor: 'rgba(75, 192, 192, 0.1)',
    }],
  };

  const allocationChartData = {
    labels: allocation.map(a => a.symbol),
    datasets: [{
      data: allocation.map(a => a.percentage),
      backgroundColor: allocation.map(a => a.color),
    }],
  };

  useEffect(() => {
    if (valueChart) {
      valueChart.destroy();
    }
    if (allocationChart) {
      allocationChart.destroy();
    }
  }, [historicalValue, allocation]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Portfolio Analytics</h2>

      {loading ? (
        <div className="text-center py-4">Loading portfolio data...</div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Total Value</div>
              <div className="text-xl font-semibold">${metrics.totalValue.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">24h Change</div>
              <div className={`text-xl font-semibold ${
                metrics.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {metrics.dailyPnL.toFixed(2)}%
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Win Rate</div>
              <div className="text-xl font-semibold">{metrics.winRate.toFixed(1)}%</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Max Drawdown</div>
              <div className="text-xl font-semibold text-red-500">
                {metrics.maxDrawdown.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Portfolio Value Chart */}
          <div className="h-80">
            <Line
              data={valueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    type: 'time',
                    time: {
                      unit: 'day',
                    },
                  },
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
              ref={(chart) => {
                valueChart = chart;
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Token Allocation */}
            <div>
              <h3 className="text-lg font-medium mb-4">Token Allocation</h3>
              <div className="h-64">
                <Doughnut
                  data={allocationChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  ref={(chart) => {
                    allocationChart = chart;
                  }}
                />
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Weekly P&L</div>
                  <div className={`font-medium ${
                    metrics.weeklyPnL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {metrics.weeklyPnL.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Monthly P&L</div>
                  <div className={`font-medium ${
                    metrics.monthlyPnL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {metrics.monthlyPnL.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Average Return</div>
                  <div className="font-medium">{metrics.averageReturn.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Sharpe Ratio</div>
                  <div className="font-medium">{metrics.sharpeRatio.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
