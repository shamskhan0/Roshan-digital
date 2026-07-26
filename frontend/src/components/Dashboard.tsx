import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, TrendingUp, CheckCircle, Users, ArrowDownLeft, ArrowUpRight, Zap, Bell } from 'lucide-react'

interface Props { user: any; onNav: (s: string) => void }

export default function Dashboard({ user, onNav }: Props) {
  const [data, setData] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = () => {
    fetch(`/api/app/dashboard/${user.id}`).then(r => r.json()).then(d => {
      setData(d)
      setLastUpdate(new Date())
    }).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [user.id])

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  const { wallet: w, stats, recentTransactions } = data
  const wallet = {
    mainBalance: w?.mainBalance ?? w?.balance ?? 0,
    totalEarned: w?.totalEarned ?? w?.earned ?? 0,
    totalDeposited: w?.totalDeposited ?? w?.deposited ?? 0,
    totalWithdrawn: w?.totalWithdrawn ?? w?.withdrawn ?? 0,
    dailyProfit: w?.dailyProfit ?? 0,
    investmentBalance: w?.investmentBalance ?? 0,
    referralBalance: w?.referralBalance ?? 0,
    bonusBalance: w?.bonusBalance ?? 0,
  }
  const s = stats || {}
  const safeStats = {
    pendingTasks: s.pendingTasks ?? 0,
    completedTasks: s.completedTasks ?? 0,
    activeInvestments: s.activeInvestments ?? 0,
    referralCount: s.referralCount ?? 0,
    todayTasks: s.todayTasks ?? 0,
    unreadNotif: s.unreadNotif ?? 0,
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      {/* Hero Balance Card */}
      <div className="hero-blue rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <p className="text-blue-100 text-sm font-normal truncate mr-2">Welcome, {user.name}</p>
          <div className="flex gap-1 flex-shrink-0">
            {safeStats.unreadNotif > 0 && (
              <Badge className="bg-white/20 text-white text-xs"><Bell className="h-3 w-3 mr-1" />{safeStats.unreadNotif}</Badge>
            )}
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-semibold break-all">PKR {wallet.mainBalance?.toLocaleString()}</p>
        <p className="text-blue-100 text-sm font-normal">Total Balance</p>
        {wallet.dailyProfit > 0 && (
          <div className="mt-2 bg-white/15 rounded-lg p-2 inline-flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-300" />
            <span className="text-xs text-yellow-100">+PKR {wallet.dailyProfit}/day profit</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/15 rounded-xl p-2 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold">PKR {wallet.totalEarned?.toLocaleString()}</p>
            <p className="text-xs text-blue-100">Earned</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold">PKR {wallet.totalDeposited?.toLocaleString()}</p>
            <p className="text-xs text-blue-100">Deposited</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold">PKR {wallet.totalWithdrawn?.toLocaleString()}</p>
            <p className="text-xs text-blue-100">Withdrawn</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: CheckCircle, label: "Today's Tasks", value: safeStats.todayTasks, color: 'blue', nav: 'tasks' },
          { icon: TrendingUp, label: 'Active Investments', value: safeStats.activeInvestments, color: 'purple', nav: 'investment' },
          { icon: Users, label: 'Referrals', value: safeStats.referralCount, color: 'amber', nav: 'referral' },
          { icon: Zap, label: 'Tasks Done', value: safeStats.completedTasks, color: 'emerald', nav: 'tasks' },
        ].map((s, i) => (
          <Card key={i} className="glass-card cursor-pointer hover:shadow-md transition-all" onClick={() => onNav(s.nav)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`bg-${s.color}-50 p-2 rounded-xl`}><s.icon className={`h-5 w-5 text-${s.color}-500`} /></div>
              <div><p className="text-lg font-semibold">{s.value}</p><p className="text-xs text-gray-500 font-normal">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="font-medium text-sm text-gray-600 mb-2">Recent Activity</h3>
        {recentTransactions?.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map((tx: any) => (
              <Card key={tx.id} className="glass-card">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {tx.amount > 0 ? <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.detail || tx.type}</p>
                      <p className="text-xs text-gray-400 font-normal">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={tx.amount > 0 ? 'default' : 'destructive'} className="font-normal">
                    {tx.amount > 0 ? '+' : ''}PKR {tx.amount}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <p className="text-gray-400 text-sm text-center py-4 font-normal">No recent activity</p>}
      </div>
    </div>
  )
}
