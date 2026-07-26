import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowDownLeft, Copy, Upload } from 'lucide-react'

const METHODS = [
  { id: 'jazzcash', name: 'JazzCash', setting: 'depositNumberJazzcash' },
  { id: 'easypaisa', name: 'EasyPaisa', setting: 'depositNumberEasypaisa' },
  { id: 'bank', name: 'Bank Transfer', setting: 'depositNumberBank' },
  { id: 'usdt', name: 'USDT', setting: 'depositNumberUsdt' },
]

interface Props { user: any }

export default function Deposit({ user }: Props) {
  const [deposits, setDeposits] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState<'new' | 'history'>('new')

  useEffect(() => {
    fetch(`/api/app/deposits/${user.id}`).then(r => r.json()).then(d => setDeposits(d.deposits || [])).catch(() => {})
    fetch('/api/app/admin/settings').then(r => r.json()).then(d => setSettings(d.settings || {})).catch(() => {})
  }, [user.id])

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = () => setScreenshot(reader.result as string); reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!amount || !method) { setMsg('Amount and method are required'); return }
    setLoading(true); setMsg('')
    const res = await fetch('/api/app/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, amount: parseFloat(amount), method, screenshot }) })
    const data = await res.json()
    if (data.ok) { setMsg(data.message); setAmount(''); setMethod(''); setScreenshot(''); const d = await fetch(`/api/app/deposits/${user.id}`).then(r => r.json()); setDeposits(d.deposits || []); setTab('history') }
    else setMsg(data.error || 'Error')
    setLoading(false)
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-emerald rounded-2xl p-5 text-white shadow-lg"><ArrowDownLeft className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">Make a Deposit</h2></div>

      {/* Account Numbers */}
      {METHODS.some(m => settings[m.setting]) && (
        <Card className="glass-card"><CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-600">Payment Accounts</h3>
          {METHODS.map(m => { const num = settings[m.setting]; if (!num) return null; return (
            <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <div><p className="text-xs text-gray-500">{m.name}</p><p className="text-sm font-medium">{num}</p></div>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(num); alert('Copied!') }}><Copy className="h-4 w-4" /></Button>
            </div>
          )})}
        </CardContent></Card>
      )}

      <div className="tab-scroll flex gap-2 pb-1">
        <Button variant={tab === 'new' ? 'default' : 'outline'} className="flex-1 font-normal min-h-[40px] flex-shrink-0" onClick={() => setTab('new')}>New Deposit</Button>
        <Button variant={tab === 'history' ? 'default' : 'outline'} className="flex-1 font-normal min-h-[40px] flex-shrink-0" onClick={() => setTab('history')}>History</Button>
      </div>

      {tab === 'new' && (
        <Card className="glass-card"><CardContent className="p-4 space-y-4">
          <div className="space-y-1"><Label className="text-sm font-normal">Amount (PKR)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
          <div className="space-y-1"><Label className="text-sm font-normal">Payment Method</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger><SelectContent>{METHODS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1">
            <Label className="text-sm font-normal">Payment Screenshot</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
              <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" id="screenshot" />
              <label htmlFor="screenshot" className="cursor-pointer">
                {screenshot ? <img src={screenshot} alt="screenshot" className="max-h-32 mx-auto rounded-lg" /> : <div className="text-gray-400"><Upload className="h-8 w-8 mx-auto mb-1" /><p className="text-sm font-normal">Upload image</p></div>}
              </label>
            </div>
          </div>
          {msg && <p className={`text-sm text-center ${msg.includes('✅') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
          <Button className="w-full hero-blue text-white" onClick={submit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Deposit'}</Button>
        </CardContent></Card>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {deposits.length === 0 ? <p className="text-center text-gray-400 py-4 font-normal">No deposits yet</p> :
            deposits.map(d => (
              <Card key={d.id} className="glass-card"><CardContent className="p-3 flex items-center justify-between">
                <div><p className="font-medium">PKR {d.amount.toLocaleString()}</p><p className="text-xs text-gray-500 font-normal">{d.method} · {new Date(d.createdAt).toLocaleDateString()}</p></div>
                <Badge variant={d.status === 'approved' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'} className="font-normal">{d.status}</Badge>
              </CardContent></Card>
            ))}
        </div>
      )}
    </div>
  )
}
