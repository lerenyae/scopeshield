'use client';

import { useState, useEffect } from 'react';

interface ScopeFlag {
  item: string;
  status: 'out_of_scope' | 'gray_area' | 'in_scope';
  explanation: string;
  estimated_cost: string | null;
  cost_basis: string | null;
}

interface ScopeVerdict {
  verdict: 'out_of_scope' | 'gray_area' | 'in_scope';
  severity: number;
  summary: string;
  flags: ScopeFlag[];
  strategic_note: string | null;
  response_firm: string;
  response_flexible: string | null;
}

const ANALYSES_PER_TIER = {
  free: 3,
};

const VERDICT_CONFIG = {
  out_of_scope: {
    label: 'Out of Scope',
    color: '#E24B4A',
    bgColor: '#E24B4A20',
    badgeBg: '#E24B4A30',
  },
  gray_area: {
    label: 'Gray Area',
    color: '#BA7517',
    bgColor: '#BA751720',
    badgeBg: '#BA751730',
  },
  in_scope: {
    label: 'In Scope',
    color: '#639922',
    bgColor: '#63992220',
    badgeBg: '#63992230',
  },
};

export default function Home() {
  const [originalContract, setOriginalContract] = useState('');
  const [newRequest, setNewRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScopeVerdict | null>(null);
  const [error, setError] = useState('');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [analysesUsed, setAnalysesUsed] = useState(0);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [activeResponseTab, setActiveResponseTab] = useState<'firm' | 'flexible'>('firm');

  useEffect(() => {
    const savedAnalyses = localStorage.getItem('scopeshield_analyses');
    const savedTimestamp = localStorage.getItem('scopeshield_reset_at');
    const now = Date.now();

    if (savedTimestamp && now > parseInt(savedTimestamp, 10)) {
      // 24 hours passed â reset
      localStorage.setItem('scopeshield_analyses', '0');
      localStorage.setItem('scopeshield_reset_at', (now + 86400000).toString());
      setAnalysesUsed(0);
    } else if (savedAnalyses) {
      setAnalysesUsed(parseInt(savedAnalyses, 10));
      if (!savedTimestamp) {
        localStorage.setItem('scopeshield_reset_at', (now + 86400000).toString());
      }
    } else {
      localStorage.setItem('scopeshield_reset_at', (now + 86400000).toString());
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
    setActiveResponseTab('firm');

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

      const data: ScopeVerdict = await response.json();
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

  const copyToClipboard = (text: string, tab: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const getFlagColor = (status: string) => {
    switch (status) {
      case 'out_of_scope':
        return '#E24B4A';
      case 'gray_area':
        return '#BA7517';
      case 'in_scope':
        return '#639922';
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
          {'\u2713'} Payment successful! Your analyses have been reset.
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-dark/95 backdrop-blur border-b border-gold/20 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <span>{String.fromCodePoint(0x2694, 0xFE0F)}</span>
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
            Know exactly when to say no {' '}
            <span className="text-gold">and how to say it.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Paste your contract and the client request. Get a verdict and a ready-to-send response in seconds.
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
              <h3 className="text-xl font-semibold mb-2">Paste Your Contract</h3>
              <p className="text-gray-400">
                Paste your original contract or scope of work. Include all the details
                that define what you agreed to deliver.
              </p>
            </div>
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-6">
              <div className="text-4xl font-bold text-gold mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Paste Request</h3>
              <p className="text-gray-400">
                Add the new client request or change they{String.fromCodePoint(0x2019)}re asking for. Be specific
                about what exactly they{String.fromCodePoint(0x2019)}re adding or modifying.
              </p>
            </div>
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-6">
              <div className="text-4xl font-bold text-gold mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Get Your Response</h3>
              <p className="text-gray-400">
                Get an instant verdict and a professional response you can copy-paste to your client in 10 seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Verdict */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">See It In Action</h2>
          <p className="text-gray-400 text-center mb-10">Here is what a real ScopeShield verdict looks like.</p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-5">
              <p className="text-xs text-gold font-semibold uppercase tracking-wide mb-2">Contract Excerpt</p>
              <p className="text-gray-300 text-sm leading-relaxed">Deliverables include a 5-page marketing website with responsive design, one round of revisions, and deployment to client hosting.</p>
            </div>
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-5">
              <p className="text-xs text-gold font-semibold uppercase tracking-wide mb-2">Client Request</p>
              <p className="text-gray-300 text-sm leading-relaxed">Can you also set up our email newsletter integration and design a custom template for it?</p>
            </div>
          </div>
          <div className="bg-dark/50 border border-gold/20 rounded-lg p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-28 h-28 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E24B4A20', borderColor: '#E24B4A', borderWidth: '2px' }}>
                <div className="text-lg font-bold" style={{ color: '#E24B4A' }}>Out of Scope</div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Verdict</h3>
                <p className="text-gray-400 text-sm">Email newsletter integration and custom template design are not included in the original contract. The scope covers only a 5-page website with one revision round.</p>
              </div>
            </div>
            <div className="border-t border-gold/20 pt-6">
              <h4 className="text-sm font-semibold text-gold uppercase tracking-wide mb-3">Ready-to-Send Response</h4>
              <div className="bg-dark rounded-lg p-4 border border-gold/20">
                <p className="text-gray-300 text-sm leading-relaxed">Hi [Client], thanks for thinking ahead on the newsletter! That falls outside our current scope, which covers the 5-page site build and one revision round. I would be happy to handle the newsletter integration and template as an add-on. I will send over a quick estimate for that separately. Let me know how you would like to proceed!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Tool */}
      <section id="tool" className="py-16 px-6 scroll-mt-20">
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
                You{String.fromCodePoint(0x2019)}ve used all your free analyses.{' '}
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
                placeholder="e.g. Deliverables include a 5-page marketing website with responsive design, one round of revisions, and deployment to client hosting..."
                className="w-full h-48 bg-dark/50 border border-gold/20 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">New Client Request</label>
              <textarea
                value={newRequest}
                onChange={(e) => setNewRequest(e.target.value)}
                placeholder="e.g. Can you also set up our email newsletter integration and design a custom template for it?"
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

          {/* Verdict Result */}
          {result && (
            <div className="space-y-6">
              {/* Verdict Card + Severity Meter */}
              <div className="bg-dark/50 border rounded-lg p-8" style={{ borderColor: VERDICT_CONFIG[result.verdict].color + '40' }}>
                <div className="flex items-start gap-6 mb-6">
                  <div
                    className="shrink-0 px-4 py-2 rounded-lg text-sm font-bold"
                    style={{
                      backgroundColor: VERDICT_CONFIG[result.verdict].badgeBg,
                      color: VERDICT_CONFIG[result.verdict].color,
                      border: `1px solid ${VERDICT_CONFIG[result.verdict].color}60`,
                    }}
                  >
                    {VERDICT_CONFIG[result.verdict].label}
                  </div>
                  <p className="text-lg text-gray-200">{result.summary}</p>
                </div>

                {/* Severity Meter */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>In Scope</span>
                    <span>Severity: {result.severity}/100</span>
                    <span>Out of Scope</span>
                  </div>
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${result.severity}%`,
                        backgroundColor: VERDICT_CONFIG[result.verdict].color,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Flags */}
              {result.flags.length > 0 && (
                <div className="bg-dark/50 border border-gold/20 rounded-lg p-8">
                  <h4 className="text-lg font-semibold mb-4">Breakdown</h4>
                  <div className="space-y-4">
                    {result.flags.map((flag, i) => (
                      <div key={i} className="flex gap-3">
                        <div
                          className="shrink-0 w-3 h-3 rounded-full mt-1.5"
                          style={{ backgroundColor: getFlagColor(flag.status) }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">{flag.item}</span>
                            {flag.estimated_cost && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: getFlagColor(flag.status) + '20',
                                  color: getFlagColor(flag.status),
                                }}
                              >
                                {flag.estimated_cost}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{flag.explanation}</p>
                          {flag.cost_basis && (
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Estimate basis: {flag.cost_basis}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic Note */}
              {result.strategic_note && (
                <div className="bg-dark/50 border border-gold/20 rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-gold uppercase tracking-wide mb-2">Strategic Note</h4>
                  <p className="text-gray-300 text-sm">{result.strategic_note}</p>
                </div>
              )}

              {/* Response Tabs */}
              <div className="bg-dark/50 border border-gold/20 rounded-lg p-8">
                <h4 className="text-lg font-semibold mb-2">Ready-to-Send Response</h4>
                <p className="text-xs text-gray-500 mb-4">Copy and send directly to your client.</p>

                {/* Tab buttons */}
                {result.response_flexible ? (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setActiveResponseTab('firm')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeResponseTab === 'firm'
                          ? 'bg-gold text-dark'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Hold the Line
                    </button>
                    <button
                      onClick={() => setActiveResponseTab('flexible')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeResponseTab === 'flexible'
                          ? 'bg-gold text-dark'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Keep It Warm
                    </button>
                  </div>
                ) : null}

                {/* Tab description */}
                {result.response_flexible && (
                  <p className="text-xs text-gray-500 mb-3">
                    {activeResponseTab === 'firm'
                      ? 'Clear boundaries. Prices the extras. Professional and direct.'
                      : 'Relationship-first. Acknowledges the ask warmly, still draws the line.'}
                  </p>
                )}

                {/* Tab content */}
                <div className="bg-dark rounded-lg p-4 border border-gold/20 mb-4">
                  <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {activeResponseTab === 'firm' ? result.response_firm : result.response_flexible}
                  </p>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      activeResponseTab === 'firm'
                        ? result.response_firm
                        : result.response_flexible || '',
                      activeResponseTab
                    )
                  }
                  className="px-6 py-2 bg-gold text-dark font-semibold rounded-lg hover:bg-gold-light transition"
                >
                  {copiedTab === activeResponseTab ? `${String.fromCodePoint(0x2713)} Copied!` : 'Copy Response'}
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
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Tier */}
            <div className="bg-dark/50 border border-gold/20 rounded-lg p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-gray-400">Try it out</p>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gold mb-1">$0</div>
                <p className="text-sm text-gray-400">Forever free</p>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-gold">{'\u2713'}</span>
                  <span>3 analyses per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">{'\u2713'}</span>
                  <span>Full verdict and explanation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">{'\u2713'}</span>
                  <span>Ready-to-send client response</span>
                </li>
              </ul>
              <button
                disabled
                className="w-full py-3 bg-gray-700 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>

            {/* Pro Tier */}
            <div className="bg-dark/50 border border-gold/40 rounded-lg p-8 flex flex-col ring-2 ring-gold/20 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gold text-dark px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <div className="mb-6 pt-2">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <p className="text-gray-400">For working freelancers</p>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gold mb-1">$9</div>
                <p className="text-sm text-gray-400">Per month</p>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-gold">{'\u2713'}</span>
                  <span>Unlimited analyses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">{'\u2713'}</span>
                  <span>Full verdict and explanation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">{'\u2713'}</span>
                  <span>Ready-to-send client response</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">{'\u2713'}</span>
                  <span>Email support</span>
                </li>
              </ul>
              <button
                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_UNLIMITED || '')}
                className="w-full py-3 bg-gold text-dark font-semibold rounded-lg hover:bg-gold-light transition"
              >
                Go Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/20 py-12 px-6 bg-dark/50">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p className="mb-4">
            Built for designers, devs, and consultants who are done working for free.
          </p>
          <p>
            {'\u00A9'} 2025{'\u2013'}2026 ScopeShield. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

