'use client';

import { useState, useEffect } from 'react';

interface AnalysisResult {
  verdict: 'In Scope' | 'Out of Scope' | 'Gray Area';
  explanation: string;
  clientResponse: string;
}

const ANALYSES_PER_TIER = {
  free: 3,
};

export default function Home() {
  const [originalContract, setOriginalContract] = useState('');
  const [newRequest, setNewRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [analysesUsed, setAnalysesUsed] = useState(0);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

  useEffect(() => {
    const savedAnalyses = localStorage.getItem('scopeshield_analyses');
    if (savedAnalyses) {
      setAnalysesUsed(parseInt(savedAnalyses, 10));
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setShowCheckoutSuccess(true);
      localStorage.setItem('scopeshield_analyses', '0');
      setAnalysesUsed(0);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setShowCheckoutSuccess(false), 5000);
    }
  }, []);

  const canAnalyze = analysesUsed < ANALYSES_PER_TIER.free;

  const handleAnalyze = async () => {
    if (!originalContract.trim() || !newRequest.trim()) {
      setError('Please fill in both fields');
      return;
    }

    if (!canAnalyze) {
      setError('Free analyses limit reached. Upgrade to continue.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalContract,
          newRequest,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze request');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      const newTotal = analysesUsed + 1;
      setAnalysesUsed(newTotal);
      localStorage.setItem('scopeshield_analyses', newTotal.toString());
    } catch (err) {
      setError('Error analyzing request. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.clientResponse) {
      navigator.clipboard.writeText(result.clientResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'In Scope':
        return '#10b981';
      case 'Out of Scope':
        return '#ef4444';
      case 'Gray Area':
        return '#D4A843';
      default:
        return '#6b7280';
    }
  };

  const handleCheckout = async (priceId: string) => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to initiate checkout');
    }
  };

  return (
    <main className="min-h-screen bg-dark text-white">
      {showCheckoutSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          â Payment successful! Your analyses have been reset.
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-dark/95 backdrop-blur border-b border-gold/20 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <span>âï¸</span>
            <span className="text-gold">ScopeShield</span>
          </div>
          <div className="hidden md:flex gap-6">
            <a href="#tool" className="hover:text-gold transition">
              Analyzer
            </a>
            <a href="#pricing" className="hover:text-gold transition">
              Pricing
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Stop Scope Creep <span className="text-gold">Before It Starts</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Paste your contract. Paste the request. Get a verdict in seconds.
          </p>
          <a
            href="#tool"
            className="inline-block px-8 py-3 bg-gold text-dark font-semibold rounded-lg hover:bg-gold-light transition"
          >
            Try it Free
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-gradient-to-b from-dark to-dark/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-6">
              <div className="text-4xl font-bold text-gold mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Upload Contract</h3>
              <p className="text-gray-400">
                Paste your original contract or scope of work. Include all the details
                that define what you agreed to deliver.
              </p>
            </div>
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-6">
              <div className="text-4xl font-bold text-gold mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Paste Request</h3>
              <p className="text-gray-400">
                Add the new client request or change they're asking for. Be specific
                about what exactly they're adding or modifying.
              </p>
            </div>
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-6">
              <div className="text-4xl font-bold text-gold mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Get Verdict</h3>
              <p className="text-gray-400">
                Receive an instant verdict with an explanation and a ready-to-send
                response for your client.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Tool */}
      <section id="tool" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Scope Analyzer</h2>

          {canAnalyze && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm">
                <span className="font-semibold">{ANALYSES_PER_TIER.free - analysesUsed}</span>{' '}
                free analyses remaining
              </p>
            </div>
          )}

          {!canAnalyze && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm">
                You've used all your free analyses.{' '}
                <button
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-gold font-semibold hover:underline"
                >
                  Upgrade now
                </button>
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Original Contract/SOW</label>
              <textarea
                value={originalContract}
                onChange={(e) => setOriginalContract(e.target.value)}
                placeholder="Paste your original contract or scope of work here..."
                className="w-full h-48 bg-dark/50 border border-gold/20 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">New Client Request</label>
              <textarea
                value={newRequest}
                onChange={(e) => setNewRequest(e.target.value)}
                placeholder="Paste the new request or change here..."
                className="w-full h-48 bg-dark/50 border border-gold/20 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !canAnalyze}
            className="w-full py-3 bg-gold text-dark font-semibold rounded-lg hover:bg-gold-light transition disabled:opacity-50 disabled:cursor-not-allowed mb-8"
          >
            {loading ? 'Analyzing...' : 'Analyze Scope'}
          </button>

          {result && (
            <div className="space-y-6 bg-dark/50 border border-gold/20 rounded-lg p-8">
              <div className="flex items-center gap-4">
                <div
                  className="w-32 h-32 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${getVerdictColor(result.verdict)}20`, borderColor: getVerdictColor(result.verdict), borderWidth: '2px' }}
                >
                  <div className="text-center">
                    <div
                      className="text-lg font-bold"
                      style={{ color: getVerdictColor(result.verdict) }}
                    >
                      {result.verdict}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Analysis Result</h3>
                  <p className="text-gray-400">{result.explanation}</p>
                </div>
              </div>

              <div className="border-t border-gold/20 pt-6">
                <h4 className="text-lg font-semibold mb-3">Ready-to-Send Response</h4>
                <div className="bg-dark rounded-lg p-4 border border-gold/20 mb-4">
                  <p className="text-gray-300 whitespace-pre-wrap">{result.clientResponse}</p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-2 bg-gold text-dark font-semibold rounded-lg hover:bg-gold-light transition"
                >
                  {copied ? 'â Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-6 bg-gradient-to-b from-dark/50 to-dark">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-gray-400">Perfect for trying it out</p>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gold mb-1">$0</div>
                <p className="text-sm text-gray-400">Forever free</p>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>3 analyses per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Full analysis and verdict</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Ready-to-send responses</span>
                </li>
              </ul>
              <button
                disabled
                className="w-full py-3 bg-gray-700 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>

            {/* $5 Tier */}
            <div className="bg-dark/50 border border-gold/40 rounded-lg p-8 flex flex-col ring-2 ring-gold/20">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gold text-dark px-4 py-1 rounded-full text-sm font-semibold">
                Popular
              </div>
              <div className="mb-6 pt-2">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <p className="text-gray-400">For active freelancers</p>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gold mb-1">$5</div>
                <p className="text-sm text-gray-400">One-time payment</p>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>10 analyses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Full analysis and verdict</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Ready-to-send responses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Email support</span>
                </li>
              </ul>
              <button
                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_10 || '')}
                className="w-full py-3 bg-gold text-dark font-semibold rounded-lg hover:bg-gold-light transition"
              >
                Get Started
              </button>
            </div>

            {/* Unlimited Tier */}
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Unlimited</h3>
                <p className="text-gray-400">For power users</p>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gold mb-1">$19</div>
                <p className="text-sm text-gray-400">Per month</p>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Unlimited analyses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Full analysis and verdict</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Ready-to-send responses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>Priority email support</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">â</span>
                  <span>API access (coming soon)</span>
                </li>
              </ul>
              <button
                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_UNLIMITED || '')}
                className="w-full py-3 bg-gold text-dark font-semibold rounded-lg hover:bg-gold-light transition"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/20 py-12 px-6 bg-dark/50">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p className="mb-4">
            Built with care by freelancers, for freelancers.
          </p>
          <p>
            Â© 2024 ScopeShield. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
