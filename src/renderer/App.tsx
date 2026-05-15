import { useEffect, useState, useMemo } from 'react';
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

function calculateMedian(arr: number[]): number {
  const valid = arr.filter((n) => n !== -1);
  if (!valid.length) return -1;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function calculateFailureRate(arr: number[]): number {
  if (!arr.length) return 0;
  const failures = arr.filter((n) => n === -1).length;
  return Math.round((failures / arr.length) * 100);
}

  // Wider and cleaner sparkline for table view
  const Sparkline = ({ data }: { data: number[] }) => {
    const maxVal = 100; // Cap visual max for better differentiation
    if (data.length === 0) return <div className="h-10 w-full" />;
  
    return (
      <div className="flex items-end h-10 gap-[1px] w-full min-w-[150px] max-w-[220px] bg-slate-950/30 p-1 rounded-md border border-slate-800/60 shadow-inner">
        {data.map((val, i) => {
          if (val === -1) {
            return <div key={i} className="flex-1 bg-rose-500 h-full opacity-90 rounded-sm" title={`Test ${i+1}: Timeout`} />;
          }
          const heightPct = Math.min((val / maxVal) * 100, 100);
          const color = val < 20 ? 'bg-emerald-400' : val < 50 ? 'bg-yellow-400' : val < 100 ? 'bg-amber-500' : 'bg-orange-500';
          return (
            <div
              key={i}
              className={`flex-1 ${color} opacity-80 hover:opacity-100 rounded-sm transition-all duration-300`}
              style={{ height: `${Math.max(heightPct, 8)}%` }}
              title={`Test ${i+1}: ${val} ms`}
            />
          );
        })}
      </div>
    );
  };

function Dashboard() {
  const [currentDns, setCurrentDns] = useState<string[]>([]);
  const [providers, setProviders] = useState<DnsProvider[]>(DEFAULT_PROVIDERS);

  // history maps server IP to an array of ping times (ms)
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [testing, setTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [iterationsDone, setIterationsDone] = useState(0);
  const TOTAL_ITERATIONS = 50;

  const [newServerName, setNewServerName] = useState('');
  const [newServerIp, setNewServerIp] = useState('');

  useEffect(() => {
    fetchCurrentDns();
    const saved = localStorage.getItem('customDnsProviders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DnsProvider[];
        // Filter out legacy 'Current System DNS' to avoid duplicates
        setProviders(parsed.filter(p => p.name !== 'Current System DNS'));
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
    if (dns && dns.length > 0) {
      setProviders((prev) => {
        const hasCurrent = prev.find((p) => p.name === 'System DNS');
        if (hasCurrent) {
          return prev.map((p) =>
            p.name === 'System DNS' ? { ...p, servers: dns } : p
          );
        }
        return [
          { name: 'System DNS', servers: dns, isCustom: true },
          ...prev,
        ];
      });
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestProgress(0);
    setIterationsDone(0);

    const allServers = providers.flatMap((p) => p.servers);
    const newHistory: Record<string, number[]> = {};
    allServers.forEach((s) => (newHistory[s] = []));
    setHistory({ ...newHistory });

    for (let i = 0; i < TOTAL_ITERATIONS; i++) {
      // Run queries in parallel for maximum speed
      const promises = allServers.map(async (server) => {
        const speed = await window.electron.dns.testDnsSpeed(server);
        return { server, speed };
      });

      const results = await Promise.all(promises);

      results.forEach(({ server, speed }) => {
        newHistory[server].push(speed);
      });

      // Update UI per iteration
      setHistory({ ...newHistory });
      setIterationsDone(i + 1);
      setTestProgress(Math.round(((i + 1) / TOTAL_ITERATIONS) * 100));
    }

    setTesting(false);
  };

  const addCustomServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName || !newServerIp) return;
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newServerIp.trim())) {
      alert('Please enter a valid IPv4 address.');
      return;
    }
    setProviders([
      ...providers,
      {
        name: newServerName.trim(),
        servers: [newServerIp.trim()],
        isCustom: true,
      },
    ]);
    setNewServerName('');
    setNewServerIp('');
  };

  const removeProvider = (name: string) => {
    setProviders(providers.filter((p) => p.name !== name));
  };

  // Compute final statistics
  const { topServers, failedServers, serverStats } = useMemo(() => {
    const stats: Record<
      string,
      { median: number; failureRate: number; providerName: string }
    > = {};
    const failed: Array<{ ip: string; providerName: string; failureRate: number }> =
      [];
    const validServers: Array<{
      ip: string;
      providerName: string;
      median: number;
    }> = [];

    providers.forEach((p) => {
      p.servers.forEach((server) => {
        const data = history[server] || [];
        const median = calculateMedian(data);
        const failureRate = calculateFailureRate(data);

        stats[server] = { median, failureRate, providerName: p.name };

        if (data.length > 0) {
          if (failureRate === 100 || median === -1) {
            failed.push({ ip: server, providerName: p.name, failureRate });
          } else {
            validServers.push({ ip: server, providerName: p.name, median });
          }
        }
      });
    });

    validServers.sort((a, b) => a.median - b.median);
    const top5 = validServers.slice(0, 5);

    return { topServers: top5, failedServers: failed, serverStats: stats };
  }, [history, providers]);

  const testFinished = !testing && testProgress === 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
        <div className="relative z-10">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-emerald-300 to-teal-500 mb-2">
            DNSSpeed
          </h1>
          <p className="text-slate-400 font-medium text-lg tracking-wide">Professional DNS Benchmarking Suite</p>
        </div>
        
        <div className="flex-1 w-full max-w-md ml-auto flex flex-col items-end relative z-10">
          <button
            onClick={runTest}
            disabled={testing}
            className={`w-full md:w-auto px-10 py-4 rounded-2xl font-bold tracking-wide transition-all shadow-2xl ${
              testing
                ? 'bg-slate-800 text-blue-400 border border-blue-500/30 cursor-not-allowed'
                : 'bg-gradient-to-br from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white hover:-translate-y-1 hover:shadow-blue-500/40 border border-transparent'
            }`}
          >
              {testing ? `Running Test (${iterationsDone}/${TOTAL_ITERATIONS})` : 'Start Benchmark'}
            </button>
            {testing && (
              <div className="w-full mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                  <span>Progress</span>
                  <span>{testProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 shadow-inner overflow-hidden border border-slate-700/50">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${testProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Results Overview (Top 5 & Failures) */}
        {testFinished && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
              <h2 className="text-xl font-bold mb-6 text-emerald-400 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                Top Performing Servers
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {topServers.map((s, idx) => (
                  <div key={s.ip} className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col items-center justify-center text-center relative group hover:border-emerald-500/50 transition-colors shadow-inner">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-70" />
                    <span className="text-emerald-500/20 font-black text-5xl absolute top-2 right-2 select-none">#{idx + 1}</span>
                    <span className="text-emerald-400 font-bold text-3xl mb-1 mt-2 tracking-tight z-10">
                      {s.median} <span className="text-base text-emerald-500/70 font-medium">ms</span>
                    </span>
                    <span className="font-semibold text-slate-200 z-10">{s.providerName}</span>
                    <span className="font-mono text-xs text-slate-500 mt-1.5 bg-slate-900 px-2 py-1 rounded-md z-10 border border-slate-800">{s.ip}</span>
                  </div>
                ))}
                {topServers.length === 0 && <p className="text-slate-400 col-span-5 py-4 text-center">No valid test results found.</p>}
              </div>

              {failedServers.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-800/50">
                  <h3 className="text-sm font-bold text-red-400/80 mb-3 uppercase tracking-wider">Unreachable Servers</h3>
                  <div className="flex flex-wrap gap-2">
                    {failedServers.map((s) => (
                      <div key={s.ip} className="bg-red-950/30 border border-red-900/50 px-3 py-1.5 rounded-md flex items-center text-sm">
                        <span className="text-slate-300 font-medium mr-2">{s.providerName}</span>
                        <span className="font-mono text-slate-500">{s.ip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Detailed Metrics Table */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <section className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-slate-200">Detailed Analytics</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-950/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-xs">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3 text-right">Median</th>
                    <th className="px-4 py-3">Reliability</th>
                    <th className="px-4 py-3 w-full min-w-[200px]">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {providers.flatMap((provider) =>
                    provider.servers.map((server) => {
                      const data = history[server] || [];
                      const stats = serverStats[server] || { median: 0, failureRate: 0 };
                      const hasData = data.length > 0;

                      return (
                        <tr key={server} className="hover:bg-slate-800/20 transition-colors group">
                          <td className="px-4 py-3 font-medium text-slate-300 flex items-center gap-2">
                            {provider.name}
                            {provider.isCustom && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">Custom</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400 group-hover:text-slate-300 transition-colors">
                            {server}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-base">
                            {hasData ? (
                              <span className={stats.median === -1 ? 'text-red-400' : stats.median < 20 ? 'text-emerald-400' : stats.median < 50 ? 'text-yellow-400' : 'text-orange-400'}>
                                {stats.median === -1 ? 'N/A' : `${stats.median} ms`}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-normal">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {hasData ? (
                              stats.failureRate > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20">
                                  {100 - stats.failureRate}% Success
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                                  100% Success
                                </span>
                              )
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 w-full min-w-[200px]">
                            <Sparkline data={data} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-8">
              <h2 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Add Custom DNS
              </h2>
              <form onSubmit={addCustomServer} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">Provider Name</label>
                  <input
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                    placeholder="e.g. Work VPN"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">IPv4 Address</label>
                  <input
                    type="text"
                    value={newServerIp}
                    onChange={(e) => setNewServerIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                    placeholder="e.g. 192.168.1.1"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm mt-2"
                >
                  Add to Benchmark
                </button>
              </form>

              {/* Manage Custom Servers */}
              {providers.some(p => p.isCustom && p.name !== 'System DNS') && (
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Manage Custom List</h3>
                  <ul className="space-y-2">
                    {providers.filter(p => p.isCustom && p.name !== 'System DNS').map(p => (
                      <li key={p.name} className="flex justify-between items-center text-sm bg-slate-950 border border-slate-800 rounded-lg p-2 px-3">
                        <span className="text-slate-300 truncate pr-2">{p.name}</span>
                        <button 
                          onClick={() => removeProvider(p.name)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </aside>
        </div>
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