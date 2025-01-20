'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface PriceData {
  timestamp: number;
  price: number;
}

interface TokenInfo {
  symbol: string;
  address: string;
}

export function PriceChart({ tokenAddress }: { tokenAddress: string }) {
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('24H');

  useEffect(() => {
    if (tokenAddress) {
      fetchTokenInfo();
      fetchPriceHistory();
    }
  }, [tokenAddress, timeframe]);

  async function fetchTokenInfo() {
    try {
      // Fetch token info from Jupiter or other API
      const response = await fetch(`https://api.jupiter.so/token/${tokenAddress}`);
      const data = await response.json();
      setTokenInfo(data);
    } catch (error) {
      console.error('Error fetching token info:', error);
    }
  }

  async function fetchPriceHistory() {
    try {
      // Calculate time range based on timeframe
      const now = Date.now();
      const timeRanges = {
        '1H': now - 3600000,
        '24H': now - 86400000,
        '7D': now - 604800000,
        '30D': now - 2592000000,
      };
      const startTime = timeRanges[timeframe];

      // Fetch price history from Jupiter or other API
      const response = await fetch(
        `https://api.jupiter.so/price/history/${tokenAddress}?start=${startTime}&end=${now}`
      );
      const data = await response.json();
      setPriceHistory(data);
    } catch (error) {
      console.error('Error fetching price history:', error);
    }
  }

  const chartData = {
    datasets: [
      {
        label: tokenInfo?.symbol || 'Token Price',
        data: priceHistory.map(point => ({
          x: point.timestamp,
          y: point.price,
        })),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeframe === '1H' ? 'minute' : timeframe === '24H' ? 'hour' : 'day',
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Price (USD)',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `$${context.parsed.y.toFixed(6)}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {tokenInfo?.symbol || 'Token'} Price Chart
        </h2>
        <div className="flex space-x-2">
          {(['1H', '24H', '7D', '30D'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded ${
                timeframe === tf
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
