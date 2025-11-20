import React, { useEffect, useState } from 'react';
import chronosContract from '../services/chronosContract';

/**
 * Integration Test Component
 * 
 * Add this to any page to test contract integration.
 * It will show connection status and provide test buttons.
 */
export const IntegrationTest: React.FC = () => {
  const [status, setStatus] = useState({
    devnetConnected: false,
    loading: true,
    error: null as string | null,
  });

  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setStatus({ devnetConnected: false, loading: true, error: null });
    
    const connected = await chronosContract.checkDevnetConnection();
    
    if (connected) {
      setStatus({ devnetConnected: true, loading: false, error: null });
    } else {
      setStatus({ 
        devnetConnected: false, 
        loading: false, 
        error: 'Cannot reach GraphQL endpoint at localhost:8080'
      });
    }
  };

  const testCreateMarket = async () => {
    setTestResult('Creating market...');
    
    const endTime = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
    
    const result = await chronosContract.createMarket({
      question: "Test: Will this integration work?",
      description: "Testing Chronos Markets smart contract integration",
      endTime: endTime,
      initialLiquidity: "1000"
    });

    if (result.success) {
      setTestResult(`✅ SUCCESS! Market created with ID: ${result.marketId}`);
    } else {
      setTestResult(`❌ FAILED: ${result.error}`);
    }
  };

  const testBuyShares = async () => {
    setTestResult('Buying shares in market 0...');
    
    const result = await chronosContract.buyShares({
      marketId: 0,
      outcome: 'Yes',
      amount: '100'
    });

    if (result.success) {
      setTestResult(`✅ SUCCESS! Purchased ${result.shares} shares`);
    } else {
      setTestResult(`❌ FAILED: ${result.error}`);
    }
  };

  const testVolume = async () => {
    setTestResult('Querying total volume...');
    
    const result = await chronosContract.getTotalVolume();

    if (result.error) {
      setTestResult(`❌ FAILED: ${result.error}`);
    } else {
      setTestResult(`✅ SUCCESS! Total volume: ${result.volume}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md shadow-xl z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">Integration Test</h3>
        <button 
          onClick={checkConnection}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Refresh
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-3 p-2 bg-gray-800 rounded">
        {status.loading ? (
          <div className="text-yellow-400 text-xs">Checking connection...</div>
        ) : status.devnetConnected ? (
          <div className="text-green-400 text-xs flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            ✅ Connected to Linera devnet
          </div>
        ) : (
          <div className="text-red-400 text-xs">
            ❌ Not connected
            <div className="text-xs text-gray-400 mt-1">{status.error}</div>
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-1">
          App ID: {chronosContract.APPLICATION_ID.slice(0, 12)}...
        </div>
      </div>

      {/* Test Buttons */}
      {status.devnetConnected && (
        <div className="space-y-2">
          <button
            onClick={testCreateMarket}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
          >
            Test: Create Market
          </button>
          
          <button
            onClick={testBuyShares}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
          >
            Test: Buy Shares
          </button>
          
          <button
            onClick={testVolume}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition"
          >
            Test: Query Volume
          </button>
        </div>
      )}

      {/* Results */}
      {testResult && (
        <div className="mt-3 p-2 bg-gray-800 rounded text-xs text-white whitespace-pre-wrap break-all">
          {testResult}
        </div>
      )}

      {/* Instructions */}
      {!status.devnetConnected && !status.loading && (
        <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-200">
          <div className="font-bold mb-1">Start linera service:</div>
          <code className="text-[10px] text-yellow-300">
            linera service --port 8080
          </code>
        </div>
      )}
    </div>
  );
};

export default IntegrationTest;
