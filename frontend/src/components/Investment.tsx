import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Clock, Calculator, Zap, CheckCircle, XCircle } from 'lucide-react'

interface Props { user: any }

export default function Investment({ user }: Props) {
  const [plans, setPlans] = useState<any[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)
  const [tab, setTab] = useState<'plans' | 'my' | 'calc'>('plans')
  const [calcAmount, setCalcAmount] = useState('10000')
  const [calcResult, setCalcResult] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [showResult, setShowResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/app/investment-plans').then(r => r.json()),
      fetch(`/api/app/investments/${user.id}`).then(r => r.json()),
      fetch(`/api/app/wallet/${user.id}`).then(r => r.json()),
    ]).then(([p, i, w]) => {
      setPlans(p.plans || [])
      setInvestments(i.investments || [])
      setBalance(w.wallet?.mainBalance || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user.id])

  const activate = async (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return

    if (balance < plan.amount) {
      setShowResult({ type: 'error', message: `Insufficient balance. You need PKR ${plan.amount.toLocaleString()} to activate this plan.` })
      return
    }

    setActivating(planId)
    const res = await fetch('/api/app/investments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, planId }) })
    const data = await res.json()
    if (data.ok) {
      const [i, w] = await Promise.all([
        fetch(`/api/app/investments/${user.id}`).then(r => r.json()),
        fetch(`/api/app/wallet/${user.id}`).then(r => r.json()),
      ])
      setInvestments(i.investments || [])
      setBalance(w.wallet?.mainBalance || 0)
      setShowResult({ type: 'success', message: `Congratulations! Your plan "${plan.name}" has been activated successfully.` })
      setTab('my')
    } else {
      setShowResult({ type: 'error', message: data.error || 'Failed to activate plan. Please try again.' })
    }
    setActivating(null)
  }

  const calculate = async (planId?: string) => {
    const amt = calcAmount || '10000'
    const url = planId ? `/api/app/calculator?investment=${amt}&planId=${planId}` : `/api/app/calculator?investment=${amt}`
    const res = await fetch(url).then(r => r.json())
    setCalcResult(res)
    if (planId) setSelectedPlan(planId)
  }

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-purple rounded-2xl p-5 text-white shadow-lg">
        <TrendingUp className="h-5 w-5 mb-1" /><h2 className="text-lg font-medium">Investment Plans</h2>
        <p className="text-purple-100 text-sm font-normal">Grow your balance with daily profits</p>
      </div>

      <div className="tab-scroll flex gap-2 pb-1">
        {[{ id: 'plans', label: 'Plans' }, { id: 'my', label: 'My Investments' }, { id: 'calc', label: 'Calculator' }].map(t => (
          <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" className="flex-1 font-normal min-h-[36px] flex-shrink-0" onClick={() => setTab(t.id as any)}>{t.label}</Button>
        ))}
      </div>

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowResult(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${showResult.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {showResult.type === 'success' ? <CheckCircle className="h-8 w-8 text-emerald-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
            </div>
            <h3 className="text-lg font-medium text-center mb-2">{showResult.type === 'success' ? 'Success!' : 'Error'}</h3>
            <p className="text-sm text-gray-600 text-center font-normal leading-relaxed">{showResult.message}</p>
            <Button className={`w-full mt-4 ${showResult.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'} text-white`} onClick={() => setShowResult(null)}>
              {showResult.type === 'success' ? 'OK' : 'Try Again'}
            </Button>
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          <div className="glass-card p-3 rounded-xl flex items-center justify-between">
            <span className="text-sm font-normal text-gray-500">Your Balance</span>
            <span className="text-lg font-semibold text-blue-600">PKR {balance.toLocaleString()}</span>
          </div>
          {plans.map(plan => {
            const hasBalance = balance >= plan.amount
            return (
              <Card key={plan.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{plan.name}</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setTab('calc'); calculate(plan.id) }}><Calculator className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-gray-500 font-normal">{plan.description}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-blue-50 p-2 rounded-lg text-center"><p className="text-lg font-semibold text-blue-600">PKR {plan.amount.toLocaleString()}</p><p className="text-xs text-gray-500">Investment</p></div>
                    <div className="bg-purple-50 p-2 rounded-lg text-center"><p className="text-lg font-semibold text-purple-600">PKR {plan.dailyProfit}/day</p><p className="text-xs text-gray-500">Daily Profit</p></div>
                  </div>
                  <div className="flex items-center gap-1 mt-2"><Clock className="h-4 w-4 text-gray-400" /><span className="text-xs text-gray-500 font-normal">{plan.duration} days · Total PKR {(plan.dailyProfit * plan.duration).toLocaleString()}</span></div>
                  <div className="mt-3">
                    <Button
                      className={`w-full text-white ${hasBalance ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-400 hover:bg-red-500'}`}
                      onClick={() => activate(plan.id)}
                      disabled={activating === plan.id}
                    >
                      {activating === plan.id ? 'Activating...' : hasBalance ? 'Activate Now ✅' : 'Insufficient Balance ❌'}
                    </Button>
                    {!hasBalance && (
                      <p className="text-xs text-red-500 text-center mt-1 font-normal">
                        You need PKR {(plan.amount - balance).toLocaleString()} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'my' && (
        <div className="space-y-3">
          {investments.length === 0 ? <p className="text-center text-gray-400 py-8 font-normal">No active investments</p> :
            investments.map(inv => (
              <Card key={inv.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{inv.plan?.name}</h3>
                    <Badge variant={inv.status === 'active' ? 'default' : 'secondary'} className="font-normal">{inv.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div><p className="text-sm font-semibold">PKR {inv.amount.toLocaleString()}</p><p className="text-xs text-gray-500">Invested</p></div>
                    <div><p className="text-sm font-semibold">PKR {inv.totalProfit.toLocaleString()}</p><p className="text-xs text-gray-500">Profit</p></div>
                    <div><p className="text-sm font-semibold">{inv.daysPassed}/{inv.plan?.duration}</p><p className="text-xs text-gray-500">Days</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {tab === 'calc' && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2"><Calculator className="h-5 w-5 text-blue-500" /> Smart Investment Calculator</h3>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Investment Amount (PKR)</label>
              <Input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} placeholder="10000" />
            </div>
            <Button className="w-full hero-blue text-white" onClick={() => calculate(selectedPlan || undefined)}>Calculate Returns</Button>

            {calcResult && (
              <div className="space-y-2 bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">Investment</span><span className="font-medium">PKR {calcResult.investment?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">Daily Profit</span><span className="font-medium text-emerald-600">PKR {calcResult.dailyProfit?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">Weekly Profit</span><span className="font-medium text-emerald-600">PKR {calcResult.weeklyProfit?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">Monthly Profit</span><span className="font-medium text-emerald-600">PKR {calcResult.monthlyProfit?.toLocaleString()}</span></div>
                <hr />
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">Duration</span><span className="font-medium">{calcResult.duration} days</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">Total Profit</span><span className="font-semibold text-emerald-600">PKR {calcResult.totalProfit?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">Total Return</span><span className="font-semibold text-blue-600">PKR {calcResult.totalReturn?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-normal">ROI</span><Badge className="bg-emerald-100 text-emerald-700">{calcResult.roi}%</Badge></div>
                <div className="flex justify-between text-xs text-gray-400 font-normal"><span>Maturity</span><span>{calcResult.endDate ? new Date(calcResult.endDate).toLocaleDateString() : '-'}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
