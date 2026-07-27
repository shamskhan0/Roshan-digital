import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowDownLeft, ArrowUpRight, Copy, Upload, CheckCircle, Clock, XCircle, ChevronRight, Wallet, Shield, Info } from 'lucide-react'
import { api } from '@/lib/api-config'

const METHODS = [
  { id: 'jazzcash', name: 'JazzCash', icon: '📱', color: 'text-red-500', bg: 'bg-red-50', setting: 'depositNumberJazzcash' },
  { id: 'easypaisa', name: 'EasyPaisa', icon: '💚', color: 'text-green-500', bg: 'bg-green-50', setting: 'depositNumberEasypaisa' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦', color: 'text-blue-500', bg: 'bg-blue-50', setting: 'depositNumberBank' },
  { id: 'usdt', name: 'USDT (TRC20)', icon: '💵', color: 'text-emerald-500', bg: 'bg-emerald-50', setting: 'depositNumberUsdt' },
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
  const [selectedMethodInfo, setSelectedMethodInfo] = useState<any>(null)
  const [copiedField, setCopiedField] = useState('')

  useEffect(() => {
    fetch(api(`/api/app/deposits/${user.id}`).then(r => r.json()).then(d => setDeposits(d.deposits || [])).catch(() => {})
    fetch(api('/api/app/admin/settings').then(r => r.json()).then(d => setSettings(d.settings || {})).catch(() => {})
  }, [user.id])

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = () => setScreenshot(reader.result as string); reader.readAsDataURL(file)
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(''), 2000)
  }

  const submit = async () => {
    if (!amount || !method) { setMsg('Please enter amount and select payment method'); return }
    if (parseFloat(amount) < 100) { setMsg('Minimum deposit amount is PKR 100'); return }
    setLoading(true); setMsg('')
    const res = await fetch(api('/api/app/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, amount: parseFloat(amount), method, screenshot }) })
    const data = await res.json()
    if (data.ok) { setMsg(data.message || '✅ Deposit request submitted successfully!'); setAmount(''); setMethod(''); setScreenshot(''); const d = await fetch(api(`/api/app/deposits/${user.id}`).then(r => r.json()); setDeposits(d.deposits || []); setTab('history') }
    else setMsg(data.error || 'Error submitting deposit')
    setLoading(false)
  }

  const totalDeposited = deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0)
  const totalPending = deposits.filter(d => d.status === 'pending').reduce((s, d) => s + d.amount, 0)
  const pendingCount = deposits.filter(d => d.status === 'pending').length

  const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-amber-500" />
    }
  }

  return (
    <div className="space-y-3 pb-4 animate-fade-in-up">

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="h-5 w-5" />
              <span className="text-lg font-medium">Deposit Funds</span>
            </div>
            <p className="text-emerald-100 text-xs">Add money to your wallet</p>
          </div>
          <div className="bg-white/20 rounded-full p-2">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold">PKR {totalDeposited.toLocaleString()}</p>
            <p className="text-xs text-emerald-100">Total Deposited</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold">PKR {totalPending.toLocaleString()}</p>
            <p className="text-xs text-emerald-100">{pendingCount} Pending</p>
          </div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${tab === 'new' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          onClick={() => setTab('new')}
        >
          <ArrowDownLeft className="h-4 w-4 inline mr-1" />
          New Deposit
        </button>
        <button
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          onClick={() => setTab('history')}
        >
          <Clock className="h-4 w-4 inline mr-1" />
          History ({deposits.length})
        </button>
      </div>

      {/* ============ NEW DEPOSIT TAB ============ */}
      {tab === 'new' && (
        <div className="space-y-3">

          {/* Payment Methods */}
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Choose Payment Method</h3>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map(m => {
                  const num = settings[m.setting]
                  return (
                    <button
                      key={m.id}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                        method === m.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                      onClick={() => { setMethod(m.id); setSelectedMethodInfo(m) }}
                      disabled={!num}
                      style={{ opacity: num ? 1 : 0.4 }}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-400">{num ? 'Available' : 'Not available'}</p>
                      </div>
                      {method === m.id && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payment Account Details */}
          {selectedMethodInfo && settings[selectedMethodInfo.setting] && (
            <Card className="border border-emerald-100 bg-emerald-50/50 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-emerald-100 rounded-full p-1.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-emerald-800">Send Payment To</h3>
                </div>

                <div className="bg-white rounded-xl p-4 border border-emerald-100">
                  <p className="text-xs text-gray-500 mb-1">{selectedMethodInfo.name} Account</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-gray-900 tracking-wide">{settings[selectedMethodInfo.setting]}</p>
                    <button
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
                      onClick={() => copyText(settings[selectedMethodInfo.setting], selectedMethodInfo.name)}
                    >
                      {copiedField === selectedMethodInfo.name ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> Copied!</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copy</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">Send the exact amount to this account, then upload your payment screenshot below.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Amount Input */}
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <Label className="text-sm font-semibold text-gray-800">Deposit Amount (PKR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">PKR</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="pl-12 text-xl font-bold h-14 rounded-xl border-gray-200"
                  min="100"
                />
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                      amount === String(a)
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-300'
                    }`}
                    onClick={() => setAmount(String(a))}
                  >
                    {a >= 1000 ? `${a/1000}K` : a}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Screenshot Upload */}
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <Label className="text-sm font-semibold text-gray-800 mb-2 block">Payment Screenshot</Label>
              <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" id="screenshot-upload" />
              <label htmlFor="screenshot-upload" className="block cursor-pointer">
                {screenshot ? (
                  <div className="relative">
                    <img src={screenshot} alt="Screenshot" className="w-full max-h-48 object-contain rounded-xl border border-gray-200" />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-emerald-600 text-center mt-2 font-medium">Screenshot uploaded ✓</p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-300 transition-colors">
                    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Tap to upload screenshot</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
                  </div>
                )}
              </label>
            </CardContent>
          </Card>

          {/* Message */}
          {msg && (
            <div className={`p-3 rounded-xl text-sm text-center font-medium ${
              msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {msg}
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-base shadow-lg shadow-emerald-200"
            onClick={submit}
            disabled={loading || !amount || !method}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5" />
                Submit Deposit Request
              </span>
            )}
          </Button>

          {/* Minimum Notice */}
          <p className="text-center text-xs text-gray-400">Minimum deposit: PKR 100 · Maximum: PKR 500,000</p>
        </div>
      )}

      {/* ============ HISTORY TAB ============ */}
      {tab === 'history' && (
        <div className="space-y-2">
          {deposits.length === 0 ? (
            <Card className="border border-gray-100 shadow-sm rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <ArrowDownLeft className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No deposits yet</p>
                <p className="text-sm text-gray-400 mt-1">Make your first deposit to get started</p>
                <Button className="mt-4 bg-emerald-600 text-white" onClick={() => setTab('new')}>
                  <ArrowDownLeft className="h-4 w-4 mr-1" /> Make Deposit
                </Button>
              </CardContent>
            </Card>
          ) : (
            deposits.map(d => (
              <Card key={d.id} className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${
                        d.status === 'approved' ? 'bg-emerald-50' : d.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                      }`}>
                        {getStatusIcon(d.status)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">PKR {d.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-400">{METHODS.find(m => m.id === d.method)?.icon}</span>
                          <span className="text-xs text-gray-500">{METHODS.find(m => m.id === d.method)?.name || d.method}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={d.status === 'approved' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'}
                        className={`font-medium text-xs ${
                          d.status === 'approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                          d.status === 'rejected' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                          'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {d.status === 'approved' ? '✅ Approved' : d.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                      </Badge>
                    </div>
                  </div>
                  {d.adminNote && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Admin Note: {d.adminNote}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
