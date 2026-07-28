import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpRight } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any }

export default function Withdraw({ user }: Props) {
  const [wallet, setWallet] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState<'new' | 'history'>('new')

  useEffect(() => {
    fetch(api(`/api/app/wallet/${user.id}`).then(r => r.json()).then(d => setWallet(d.wallet)).catch(() => {})
    fetch(api(`/api/app/withdrawals/${user.id}`).then(r => r.json()).then(d => setWithdrawals(d.withdrawals || [])).catch(() => {})
  }, [user.id])

  const submit = async () => {
    if (!amount || !method || !accountNumber) { setMsg('All fields are required'); return }
    setLoading(true); setMsg('')
    const res = await fetch(api('/api/app/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, amount: parseFloat(amount), method, accountName, accountNumber }) })
    const data = await res.json()
    if (data.ok) { setMsg(data.message); setAmount(''); setMethod(''); setAccountName(''); setAccountNumber(''); const w = await fetch(api(`/api/app/wallet/${user.id}`).then(r => r.json()); setWallet(w.wallet); const wl = await fetch(api(`/api/app/withdrawals/${user.id}`).then(r => r.json()); setWithdrawals(wl.withdrawals || []); setTab('history') }
    else setMsg(data.error); setLoading(false)
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-red rounded-2xl p-5 text-white shadow-lg">
        <ArrowUpRight className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">Withdraw Funds</h2>
        {wallet && <p className="text-red-100 text-sm font-normal">Available: PKR {(wallet.mainBalance ?? wallet.balance ?? 0).toLocaleString()}</p>}
      </div>
      <div className="tab-scroll flex gap-2 pb-1">
        <Button variant={tab === 'new' ? 'default' : 'outline'} className="flex-1 font-normal min-h-[40px] flex-shrink-0" onClick={() => setTab('new')}>New Request</Button>
        <Button variant={tab === 'history' ? 'default' : 'outline'} className="flex-1 font-normal min-h-[40px] flex-shrink-0" onClick={() => setTab('history')}>History</Button>
      </div>
      {tab === 'new' && (
        <Card className="glass-card"><CardContent className="p-4 space-y-4">
          <div className="space-y-1"><Label className="text-sm font-normal">Amount (PKR)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
          <div className="space-y-1"><Label className="text-sm font-normal">Method</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="jazzcash">JazzCash</SelectItem><SelectItem value="easypaisa">EasyPaisa</SelectItem><SelectItem value="bank">Bank</SelectItem><SelectItem value="usdt">USDT</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm font-normal">Account Name</Label><Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Name" /></div>
          <div className="space-y-1"><Label className="text-sm font-normal">Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Number" /></div>
          {msg && <p className={`text-sm text-center ${msg.includes('✅') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
          <Button className="w-full hero-blue text-white" onClick={submit} disabled={loading}>{loading ? 'Processing...' : 'Submit Request'}</Button>
        </CardContent></Card>
      )}
      {tab === 'history' && (
        <div className="space-y-2">
          {withdrawals.length === 0 ? <p className="text-center text-gray-400 py-4 font-normal">No withdrawals</p> :
            withdrawals.map(w => (<Card key={w.id} className="glass-card"><CardContent className="p-3 flex items-center justify-between"><div><p className="font-medium">PKR {w.amount.toLocaleString()}</p><p className="text-xs text-gray-500 font-normal">{w.method} · {new Date(w.createdAt).toLocaleDateString()}</p></div><Badge variant={w.status === 'approved' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'} className="font-normal">{w.status}</Badge></CardContent></Card>))}
        </div>
      )}
    </div>
  )
}
