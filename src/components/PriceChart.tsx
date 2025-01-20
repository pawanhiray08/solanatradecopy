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
  ChartOptions,
} from 'chart.js';
import { adapters } from 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';
import { useRef, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust the import based on your project structure

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  adapters
);

interface PriceData {
  timestamp: number;
  price: number;
}

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

export function PriceChart({ tokenAddress }: { tokenAddress: string }) {
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('24H');
  const chartRef = useRef<ChartJS | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    fetchInsiderWallets(); // Fetch insider wallets on component mount
  }, []);

  const fetchInsiderWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('insider_wallets')
        .select('address, label, win_rate, total_profit_loss, rank')
        .order('rank', { ascending: true });

      if (error) {
        console.error('Error fetching insider wallets:', error.message);
        return;
      }

      console.log('Insider Wallets:', data);
      // Process the data as needed
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const fetchPriceHistory = async (address: string, period: string) => {
    try {
      // Fetch implementation
    } catch (error) {
      console.error('Error fetching price history:', error);
    }
  };

  const fetchTokenInfo = async (address: string) => {
    try {
      // Fetch implementation
    } catch (error) {
      console.error('Error fetching token info:', error);
    }
  };

  const chartData = {
    labels: priceHistory.map(d => new Date(d.timestamp * 1000)),
    datasets: [
      {
        label: tokenInfo?.symbol || 'Price',
        data: priceHistory.map(d => d.price),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${tokenInfo?.name || 'Token'} Price Chart`,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
        },
      },
      y: {
        beginAtZero: false,
      },
    },
  };

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const newChart = new ChartJS(ctx, {
        type: 'line',
        data: chartData,
        options: options,
      });
      chartRef.current = newChart;
    }
  }, [chartData, options]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Price Chart</h2>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded ${
              timeframe === '1H' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setTimeframe('1H')}
          >
            1H
          </button>
          <button
            className={`px-3 py-1 rounded ${
              timeframe === '24H' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setTimeframe('24H')}
          >
            24H
          </button>
          <button
            className={`px-3 py-1 rounded ${
              timeframe === '7D' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setTimeframe('7D')}
          >
            7D
          </button>
          <button
            className={`px-3 py-1 rounded ${
              timeframe === '30D' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setTimeframe('30D')}
          >
            30D
          </button>
        </div>
      </div>
      <div className="h-80">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
