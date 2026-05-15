import { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

interface DnsProvider {
  name: string;
  servers: string[];
  isCustom?: boolean;
}

const DEFAULT_PROVIDERS: DnsProvider[] = [
  { name: 'Google', servers: ['8.8.8.8', '8.8.4.4'] },
  { name: 'Cloudflare', servers: ['1.1.1.1', '1.0.0.1'] },
  { name: 'Quad9', servers: ['9.9.9.9', '149.112.112.112'] },
  { name: 'Control D', servers: ['76.76.2.0', '76.76.10.0'] },
  { name: 'NextDNS', servers: ['45.90.28.0', '45.90.30.0'] },
  { name: 'AdGuard', servers: ['94.140.14.14', '94.140.15.15'] },
];

function Dashboard() {
  const [currentDns, setCurrentDns] = useState<string[]>([]);
  const [providers, setProviders] = useState<DnsProvider[]>(DEFAULT_PROVIDERS);
  const [results, setResults] = useState<Record<string, number>>({});
  const [testing, setTesting] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerIp, setNewServerIp] = useState('');

  useEffect(() => {
    fetchCurrentDns();
    // Load custom providers from local storage if any
    const saved = localStorage.getItem('customDnsProviders');
    if (saved) {
      try {
        setProviders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved providers', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('customDnsProviders', JSON.stringify(providers));
  }, [providers]);

  const fetchCurrentDns = async () => {
    const dns = await window.electron.dns.getCurrentDns();
    setCurrentDns(dns);
    
    // Add current DNS to the list to test against if not already present
    if (dns && dns.length > 0) {
      setProviders(prev => {
        const hasCurrent = prev.find(p => p.name === 'Current System DNS');
        if (hasCurrent) {
          return prev.map(p => p.name === 'Current System DNS' ? { ...p, servers: dns } : p);
        }
        return [{ name: 'Current System DNS', servers: dns, isCustom: true }, ...prev];
      });
    }
  };

  const runTest = async () => {
    setTesting(true);
    setResults({});
    
    const allServers = providers.flatMap(p => p.servers);
    const newResults: Record<string, number> = {};

    for (const server of allServers) {
      const speed = await window.electron.dns.testDnsSpeed(server);
      newResults[server] = speed;
      // Update state incrementally so user sees progress
      setResults(prev => ({ ...prev, [server]: speed }));
    }

    setTesting(false);
  };

  const addCustomServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName || !newServerIp) return;
    
    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newServerIp.trim())) {
      alert('Please enter a valid IPv4 address.');
      return;
    }

    setProviders([...providers, { name: newServerName.trim(), servers: [newServerIp.trim()], isCustom: true }]);
    setNewServerName('');
    setNewServerIp('');
  };

  const removeProvider = (name: string) => {
    setProviders(providers.filter(p => p.name !== name));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <header className="border-b border-slate-700 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">DNSSpeed</h1>
          <p className="text-slate-400 mt-2">Analyze and benchmark DNS resolution performance</p>
        </div>
        <button 
          onClick={runTest} 
          disabled={testing}
          className={`px-6 py-3 rounded-lg font-semibold shadow-lg transition-all ${testing ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/20'}`}
        >
          {testing ? 'Running Test...' : 'Start Benchmark'}
        </button>
      </header>

      <section className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Detected System DNS Settings
        </h2>
        {currentDns.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {currentDns.map(ip => (
              <span key={ip} className="bg-slate-700 px-4 py-2 rounded-lg font-mono text-emerald-300 border border-slate-600">
                {ip}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 italic">No DNS servers detected automatically.</p>
        )}
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        <section className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Benchmark List & Results</h2>
          <div className="space-y-4">
            {providers.map((provider) => {
              // Calculate average or best time for the provider if multiple servers
              const providerResults = provider.servers.map(s => results[s]).filter(r => r !== undefined);
              let bestTime: number | null = null;
              if (providerResults.length > 0) {
                 const validTimes = providerResults.filter(t => t !== -1);
                 bestTime = validTimes.length > 0 ? Math.min(...validTimes) : -1;
              }

              return (
                <div key={provider.name} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-lg flex items-center">
                        {provider.name}
                        {provider.isCustom && <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">Custom</span>}
                      </h3>
                    </div>
                    {bestTime !== null && (
                      <div className={`text-xl font-bold ${bestTime === -1 ? 'text-red-400' : bestTime < 20 ? 'text-emerald-400' : bestTime < 50 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {bestTime === -1 ? 'Failed' : `${bestTime} ms`}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {provider.servers.map(server => (
                      <div key={server} className="flex justify-between items-center text-sm bg-slate-900/50 p-2 rounded border border-slate-700/50">
                        <span className="font-mono text-slate-300">{server}</span>
                        <span className="text-slate-400">
                          {results[server] !== undefined ? (
                            results[server] === -1 ? <span className="text-red-400">Down/Timeout</span> : `${results[server]} ms`
                          ) : (
                            <span className="text-slate-600">Pending</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {provider.isCustom && provider.name !== 'Current System DNS' && (
                    <button 
                      onClick={() => removeProvider(provider.name)}
                      className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      Remove
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-700 pb-2">Add Custom Server</h2>
            <form onSubmit={addCustomServer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Provider Name</label>
                <input 
                  type="text" 
                  value={newServerName}
                  onChange={e => setNewServerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. My ISP DNS"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">IPv4 Address</label>
                <input 
                  type="text" 
                  value={newServerIp}
                  onChange={e => setNewServerIp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 192.168.1.1"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Add to List
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}