'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, RefreshCw, AlertTriangle, CreditCard, Zap, TrendingUp, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type BillingCycle = 'Monthly' | 'Yearly' | 'Usage-Based';
type Category = 'Hosting' | 'Domain' | 'Tunnel/Ngrok' | 'AI/Training' | 'Other';

interface Subscription {
    id: number;
    service_name: string;
    category: Category;
    billing_cycle: BillingCycle;
    start_date: string | null;
    expiry_date: string | null;
    cost: number;
    currency: string;
    auto_renew: boolean;
    notes: string | null;
    remaining_days: number | null;
}

interface AgentUsage {
    agent_name: string;
    calls: number;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    estimated_cost: number;
    last_used: string;
}

interface UsageSummary {
    total_calls: number;
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_cost: number;
}

type Tab = 'subscriptions' | 'ai-usage';
type Period = '7d' | '30d' | '90d' | 'all';

const emptyForm = {
    service_name: '', category: 'Hosting' as Category, billing_cycle: 'Monthly' as BillingCycle,
    start_date: '', expiry_date: '', cost: '', currency: 'USD', auto_renew: false, notes: ''
};

function statusInfo(days: number | null) {
    if (days === null) return { label: 'No Expiry', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', dot: 'bg-gray-400' };
    if (days < 0) return { label: 'Expired', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' };
    if (days <= 7) return { label: `${days}d — Critical`, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' };
    if (days <= 15) return { label: `${days}d — Warning`, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-400' };
    return { label: `${days}d remaining`, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', dot: 'bg-green-500' };
}

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

export default function BillingPage() {
    const [tab, setTab] = useState<Tab>('subscriptions');
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loadingS, setLoadingS] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editSub, setEditSub] = useState<Subscription | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [formError, setFormError] = useState('');

    const [period, setPeriod] = useState<Period>('30d');
    const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
    const [byAgent, setByAgent] = useState<AgentUsage[]>([]);
    const [loadingU, setLoadingU] = useState(false);

    const headers = useCallback(() => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api.getToken()}`
    }), []);

    const loadSubscriptions = useCallback(async () => {
        setLoadingS(true);
        const res = await fetch(`${API}/api/billing/subscriptions`, { headers: headers() });
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        setLoadingS(false);
    }, [headers]);

    const loadUsage = useCallback(async () => {
        setLoadingU(true);
        const res = await fetch(`${API}/api/billing/ai-usage?period=${period}`, { headers: headers() });
        const data = await res.json();
        setUsageSummary(data.summary);
        setByAgent(data.byAgent || []);
        setLoadingU(false);
    }, [period, headers]);

    useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);
    useEffect(() => { if (tab === 'ai-usage') loadUsage(); }, [tab, loadUsage]);

    const openAdd = () => { setEditSub(null); setForm(emptyForm); setFormError(''); setShowForm(true); };
    const openEdit = (s: Subscription) => {
        setEditSub(s);
        setForm({
            service_name: s.service_name, category: s.category, billing_cycle: s.billing_cycle,
            start_date: s.start_date ? s.start_date.slice(0, 10) : '',
            expiry_date: s.expiry_date ? s.expiry_date.slice(0, 10) : '',
            cost: String(s.cost), currency: s.currency || 'USD', auto_renew: s.auto_renew, notes: s.notes || ''
        });
        setFormError(''); setShowForm(true);
    };

    const save = async () => {
        if (!form.service_name.trim()) { setFormError('Service name is required'); return; }
        setSaving(true); setFormError('');
        const body = { ...form, cost: parseFloat(form.cost) || 0, start_date: form.start_date || null, expiry_date: form.expiry_date || null };
        const url = editSub ? `${API}/api/billing/subscriptions/${editSub.id}` : `${API}/api/billing/subscriptions`;
        const res = await fetch(url, { method: editSub ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify(body) });
        setSaving(false);
        if (res.ok) { setShowForm(false); loadSubscriptions(); }
        else { const d = await res.json(); setFormError(d.message || 'Failed to save'); }
    };

    const deleteSub = async (id: number) => {
        await fetch(`${API}/api/billing/subscriptions/${id}`, { method: 'DELETE', headers: headers() });
        setDeleteId(null); loadSubscriptions();
    };

    const totalMonthlyCost = subscriptions.reduce((sum, s) => {
        if (s.billing_cycle === 'Monthly') return sum + Number(s.cost);
        if (s.billing_cycle === 'Yearly') return sum + Number(s.cost) / 12;
        return sum;
    }, 0);

    const criticalCount = subscriptions.filter(s => s.remaining_days !== null && s.remaining_days <= 7).length;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-[#00a859]" /> Billing & AI Usage
                    </h1>
                    <p className="text-gray-400 text-sm mt-0.5">Track subscriptions, costs and AI token consumption</p>
                </div>
                {tab === 'subscriptions' && (
                    <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#00a859] hover:bg-[#009048] text-white rounded-xl text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Add Service
                    </button>
                )}
                {tab === 'ai-usage' && (
                    <div className="flex items-center gap-2">
                        <select value={period} onChange={e => setPeriod(e.target.value as Period)}
                            className="px-3 py-2 rounded-xl border border-gray-700 bg-gray-800 text-white text-sm outline-none">
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>
                        <button onClick={loadUsage} className="p-2 rounded-xl border border-gray-700 bg-gray-800 text-gray-400 hover:text-white transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Monthly Cost</p>
                    <p className="text-xl font-bold text-white">${totalMonthlyCost.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{subscriptions.length} services</p>
                </div>
                <div className={`bg-[#0a0a0a] border rounded-2xl p-4 ${criticalCount > 0 ? 'border-red-500/30' : 'border-gray-800'}`}>
                    <p className="text-xs text-gray-500 mb-1">Critical Alerts</p>
                    <p className={`text-xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-white'}`}>{criticalCount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">≤7 days remaining</p>
                </div>
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-1">AI Tokens (30d)</p>
                    <p className="text-xl font-bold text-white">{usageSummary ? fmtTokens(Number(usageSummary.total_tokens)) : '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{usageSummary ? `${Number(usageSummary.total_calls).toLocaleString()} calls` : 'Load AI tab'}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-1">AI Cost (30d)</p>
                    <p className="text-xl font-bold text-white">{usageSummary ? `$${Number(usageSummary.total_cost).toFixed(4)}` : '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Gemini Flash</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-[#111] rounded-xl p-1 w-fit">
                {(['subscriptions', 'ai-usage'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-[#1a1a1a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                        {t === 'subscriptions' ? '💳 Subscriptions' : '⚡ AI Usage'}
                    </button>
                ))}
            </div>

            {/* ── Subscriptions ── */}
            {tab === 'subscriptions' && (
                loadingS ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#00a859]" /></div>
                ) : subscriptions.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">No services added yet. Click "Add Service" to get started.</div>
                ) : (
                    <div className="space-y-2">
                        {subscriptions.map(s => {
                            const st = statusInfo(s.remaining_days);
                            return (
                                <div key={s.id} className={`bg-[#0a0a0a] border rounded-2xl px-5 py-4 flex items-center gap-4 ${s.remaining_days !== null && s.remaining_days <= 7 ? 'border-red-500/30' : s.remaining_days !== null && s.remaining_days <= 15 ? 'border-yellow-500/30' : 'border-gray-800'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-sm text-white">{s.service_name}</p>
                                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{s.category}</span>
                                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{s.billing_cycle}</span>
                                            {s.auto_renew && <span className="text-xs bg-[#00a859]/10 text-[#00a859] px-2 py-0.5 rounded-full">Auto-renew</span>}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                                            <span>${Number(s.cost).toFixed(2)} {s.currency}</span>
                                            {s.expiry_date && <span>Expires {fmtDate(s.expiry_date)}</span>}
                                            {s.notes && <span className="truncate max-w-[200px]">{s.notes}</span>}
                                        </div>
                                    </div>
                                    <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>{st.label}</div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ── AI Usage ── */}
            {tab === 'ai-usage' && (
                loadingU ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#00a859]" /></div>
                ) : (
                    <div className="space-y-4">
                        {byAgent.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">No AI usage logged yet. Usage will appear after Gemini calls are made.</div>
                        ) : (
                            <>
                                {/* Total bar */}
                                {usageSummary && (
                                    <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="font-semibold text-white text-sm">Total Usage ({period === 'all' ? 'All Time' : period})</p>
                                            <span className="text-xs text-gray-500">{Number(usageSummary.total_calls).toLocaleString()} API calls</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <p className="text-xl font-bold text-white">{fmtTokens(Number(usageSummary.total_tokens))}</p>
                                                <p className="text-xs text-gray-500">Total tokens</p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-[#00a859]">${Number(usageSummary.total_cost).toFixed(6)}</p>
                                                <p className="text-xs text-gray-500">Estimated cost</p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-blue-400">{fmtTokens(Number(usageSummary.total_prompt_tokens))}</p>
                                                <p className="text-xs text-gray-500">Input tokens</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* By agent */}
                                <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-800">
                                        <p className="font-semibold text-white text-sm">Usage by Agent</p>
                                    </div>
                                    <div className="divide-y divide-gray-800">
                                        {byAgent.map(a => {
                                            const totalT = Number(usageSummary?.total_tokens) || 1;
                                            const pct = Math.round((Number(a.total_tokens) / totalT) * 100);
                                            return (
                                                <div key={a.agent_name} className="px-5 py-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Zap className="w-4 h-4 text-[#00a859]" />
                                                            <p className="font-medium text-sm text-white">{a.agent_name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                                            <span>{Number(a.calls).toLocaleString()} calls</span>
                                                            <span className="text-[#00a859] font-semibold">${Number(a.estimated_cost).toFixed(6)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#00a859] rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-gray-400 w-24 text-right">{fmtTokens(Number(a.total_tokens))} tokens ({pct}%)</span>
                                                    </div>
                                                    <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                                                        <span>In: {fmtTokens(Number(a.prompt_tokens))}</span>
                                                        <span>Out: {fmtTokens(Number(a.completion_tokens))}</span>
                                                        <span>Last: {new Date(a.last_used).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )
            )}

            {/* Add/Edit modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-[#0a0a0a]">
                            <h2 className="font-semibold text-white">{editSub ? 'Edit Service' : 'Add Service'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {[
                                { key: 'service_name', label: 'Service Name', placeholder: 'e.g. Namecheap Hosting' },
                                { key: 'cost', label: 'Cost', placeholder: '0.00' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-xs font-medium text-gray-400 mb-1 block">{f.label}</label>
                                    <input value={(form as any)[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 text-white text-sm outline-none" />
                                </div>
                            ))}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-400 mb-1 block">Category</label>
                                    <select value={form.category} onChange={e => setForm(x => ({ ...x, category: e.target.value as Category }))}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 text-white text-sm outline-none">
                                        {['Hosting', 'Domain', 'Tunnel/Ngrok', 'AI/Training', 'Other'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-400 mb-1 block">Billing Cycle</label>
                                    <select value={form.billing_cycle} onChange={e => setForm(x => ({ ...x, billing_cycle: e.target.value as BillingCycle }))}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 text-white text-sm outline-none">
                                        {['Monthly', 'Yearly', 'Usage-Based'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-400 mb-1 block">Start Date</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm(x => ({ ...x, start_date: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 text-white text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-400 mb-1 block">Expiry Date</label>
                                    <input type="date" value={form.expiry_date} onChange={e => setForm(x => ({ ...x, expiry_date: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 text-white text-sm outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-400 mb-1 block">Currency</label>
                                    <select value={form.currency} onChange={e => setForm(x => ({ ...x, currency: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 text-white text-sm outline-none">
                                        {['USD', 'PKR', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.auto_renew} onChange={e => setForm(x => ({ ...x, auto_renew: e.target.checked }))}
                                            className="w-4 h-4 accent-[#00a859]" />
                                        <span className="text-sm text-gray-300">Auto Renew</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Notes (optional)</label>
                                <textarea rows={2} value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                                    placeholder="e.g. Login details, renewal link..."
                                    className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 text-white text-sm outline-none resize-none" />
                            </div>
                            {formError && <p className="text-xs text-red-400">{formError}</p>}
                        </div>
                        <div className="px-5 pb-5 flex justify-end gap-2">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 transition-colors">Cancel</button>
                            <button onClick={save} disabled={saving}
                                className="px-4 py-2 rounded-xl text-sm bg-[#00a859] text-white font-medium hover:bg-[#009048] disabled:opacity-60 transition-colors flex items-center gap-2">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {editSub ? 'Save Changes' : 'Add Service'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <p className="font-semibold text-white mb-1">Delete this service?</p>
                        <p className="text-sm text-gray-400 mb-5">This action cannot be undone.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 transition-colors">Cancel</button>
                            <button onClick={() => deleteSub(deleteId)} className="px-4 py-2 rounded-xl text-sm bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
