import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, ArrowDownLeft, ArrowUpRight, TrendingUp, Users, CheckSquare, LogIn } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any }

const TABS = [
  { id: 'all', label: 'All', icon: History },
  { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft },
  { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'referrals', label: 'Referrals', icon: Users },
  { id: 'login', label: 'Login', icon: LogIn },
]

export default function HistorySection({ user }: Props) {
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetch(api(`/api/app/history/${user.id}`).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }, [user.id])
  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
  if (!data) return <p className="text-center text-gray-400 py-8">Failed to load</p>

  const badge = (s: string) => { switch (s) { case 'approved': case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 font-normal">Approved</Badge>; case 'rejected': return <Badge variant="destructive" className="font-normal">Rejected</Badge>; case 'active': return <Badge className="bg-blue-100 text-blue-700 font-normal">Active</Badge>; default: return <Badge variant="secondary" className="font-normal">Pending</Badge> } }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-blue rounded-2xl p-5 text-white shadow-lg"><History className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">Transaction History</h2></div>
      <div className="tab-scroll flex gap-1.5 pb-1">{TABS.map(t => (<Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" className="whitespace-nowrap text-xs font-normal min-h-[36px] px-3 flex-shrink-0" onClick={() => setTab(t.id)}><t.icon className="h-3 w-3 mr-1" />{t.label}</Button>))}</div>

      {tab !== 'login' && data.deposits?.length > 0 && (tab === 'all' || tab === 'deposits') && <div>{tab === 'all' && <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase">Deposits</h3>}{data.deposits.map((d: any) => <Card key={d.id} className="glass-card mb-2"><CardContent className="p-3 flex items-center justify-between"><div className="flex items-center gap-2"><ArrowDownLeft className="h-4 w-4 text-emerald-500" /><div><p className="font-medium text-sm">PKR {d.amount.toLocaleString()} · {d.method}</p><p className="text-xs text-gray-400 font-normal">{new Date(d.createdAt).toLocaleDateString()}</p></div></div>{badge(d.status)}</CardContent></Card>)}</div>}
      {data.withdrawals?.length > 0 && (tab === 'all' || tab === 'withdrawals') && <div>{tab === 'all' && <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase">Withdrawals</h3>}{data.withdrawals.map((w: any) => <Card key={w.id} className="glass-card mb-2"><CardContent className="p-3 flex items-center justify-between"><div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-red-500" /><div><p className="font-medium text-sm">PKR {w.amount.toLocaleString()} · {w.method}</p><p className="text-xs text-gray-400 font-normal">{new Date(w.createdAt).toLocaleDateString()}</p></div></div>{badge(w.status)}</CardContent></Card>)}</div>}
      {data.tasks?.length > 0 && (tab === 'all' || tab === 'tasks') && <div>{tab === 'all' && <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase">Tasks</h3>}{data.tasks.map((t: any) => <Card key={t.id} className="glass-card mb-2"><CardContent className="p-3 flex items-center justify-between"><div className="flex items-center gap-2"><CheckSquare className="h-4 w-4 text-blue-500" /><div><p className="font-medium text-sm">{t.task?.title} · PKR {t.task?.reward}</p><p className="text-xs text-gray-400 font-normal">{new Date(t.createdAt).toLocaleDateString()}</p></div></div>{badge(t.status)}</CardContent></Card>)}</div>}
      {data.transactions?.length > 0 && tab === 'all' && <div><h3 className="font-medium text-xs text-gray-500 mb-2 uppercase">Wallet Transactions</h3>{data.transactions.map((tx: any) => <Card key={tx.id} className="glass-card mb-2"><CardContent className="p-3 flex items-center justify-between"><div><p className="font-medium text-sm">{tx.detail || tx.type}</p><p className="text-xs text-gray-400 font-normal">{new Date(tx.createdAt).toLocaleDateString()}</p></div><Badge variant={tx.amount > 0 ? 'default' : 'destructive'} className="font-normal">{tx.amount > 0 ? '+' : ''}PKR {tx.amount}</Badge></CardContent></Card>)}</div>}
      {(tab === 'all' || tab === 'login') && data.loginHistory?.length > 0 && <div>{tab === 'all' && <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase">Login History</h3>}{data.loginHistory.map((l: any) => <Card key={l.id} className="glass-card mb-2"><CardContent className="p-3 flex items-center gap-2"><LogIn className="h-4 w-4 text-gray-400" /><div className="flex-1"><p className="text-sm font-normal">{l.device || 'Browser'} · {l.browser || 'Web'}</p><p className="text-xs text-gray-400 font-normal">{new Date(l.createdAt).toLocaleString()}</p></div><Badge variant={l.status === 'success' ? 'default' : 'destructive'} className="font-normal">{l.status}</Badge></CardContent></Card>)}</div>}

      {tab === 'all' && !data.deposits?.length && !data.withdrawals?.length && !data.tasks?.length && !data.transactions?.length && <p className="text-center text-gray-400 py-8 font-normal">No history yet</p>}
    </div>
  )
}
