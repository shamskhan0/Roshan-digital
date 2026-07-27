import {
import { api } from '@/lib/api-config' useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Users, DollarSign, TrendingUp, Settings, Shield, CheckCircle, XCircle,
  Bell, BarChart3, Plus, Trash2, Edit, Send, Search, Download, Printer,
  Eye, ArrowUpRight, ArrowDownRight, Activity, Zap, Cloud, Server,
  Database, Lock, RefreshCw, LayoutDashboard, UserCheck, Wallet,
  FileText, MessageSquare, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

interface Props { user: any; onNav: (s: string) => void }

const COLORS = {
  royalBlue: '#2563EB',
  purple: '#7C3AED',
  gold: '#D4A017',
  white: '#FFFFFF',
  darkBg: '#0F172A',
  surface: '#F8FAFC',
  muted: '#94A3B8',
}

const CHART_COLORS = ['#2563EB', '#7C3AED', '#D4A017', '#10B981', '#F59E0B', '#EF4444']

export default function AdminPanel({ user, onNav }: Props) {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [sidebarTab, setSidebarTab] = useState('dashboard')
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [planForm, setPlanForm] = useState({ name: '', description: '', amount: '', dailyProfit: '', duration: '' })
  const [editPlanId, setEditPlanId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', reward: '', category: 'general', link: '', duration: '', requireVisit: false })
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const load = async () => {
    try {
      const [s, u, d, w, p, t, st] = await Promise.all([
        fetch(api('/api/app/admin/stats').then(r => r.json()), fetch(api('/api/app/admin/users').then(r => r.json()),
        fetch(api('/api/app/admin/deposits').then(r => r.json()), fetch(api('/api/app/admin/withdrawals').then(r => r.json()),
        fetch(api('/api/app/admin/plans').then(r => r.json()), fetch(api('/api/app/admin/tasks').then(r => r.json()),
        fetch(api('/api/app/admin/settings').then(r => r.json()),
      ])
      setStats(s); setUsers(u.users || []); setDeposits(d.deposits || []); setWithdrawals(w.withdrawals || [])
      setPlans(p.plans || []); setTasks(t.tasks || []); setSettings(st.settings || {}); setLoading(false)
    } catch { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const withProcessing = async (id: string, fn: () => Promise<void>) => {
    setProcessingId(id)
    await fn()
    setProcessingId(null)
  }

  const approveDeposit = async (id: string) => withProcessing(id, async () => { await fetch(api(`/api/app/admin/deposits/${id}/approve`, { method: 'POST' }); load() })
  const rejectDeposit = async (id: string) => { const reason = prompt('Rejection reason:'); await withProcessing(id, async () => { await fetch(api(`/api/app/admin/deposits/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }); load() }) }
  const approveWithdrawal = async (id: string) => withProcessing(id, async () => { await fetch(api(`/api/app/admin/withdrawals/${id}/approve`, { method: 'POST' }); load() })
  const rejectWithdrawal = async (id: string) => { const reason = prompt('Rejection reason:'); await withProcessing(id, async () => { await fetch(api(`/api/app/admin/withdrawals/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }); load() }) }
  const makeAdmin = async (id: string) => withProcessing(id, async () => { await fetch(api(`/api/app/admin/users/${id}/role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'admin' }) }); load() })
  const toggleActive = async (id: string) => withProcessing(id, async () => { await fetch(api(`/api/app/admin/users/${id}/toggle-active`, { method: 'POST' }); load() })
  const forceLogout = async (id: string) => withProcessing(id, async () => { await fetch(api('/api/app/admin/force-logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) }); load() })
  const saveSettings = async () => { await fetch(api('/api/app/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }); load() }
  const savePlan = async () => { if (!planForm.name || !planForm.amount) return; const url = editPlanId ? `/api/app/admin/plans/${editPlanId}` : '/api/app/admin/plans'; await fetch(url, { method: editPlanId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(planForm) }); setPlanForm({ name: '', description: '', amount: '', dailyProfit: '', duration: '' }); setEditPlanId(null); load() }
  const deletePlan = async (id: string) => { await withProcessing(id, async () => { await fetch(api(`/api/app/admin/plans/${id}`, { method: 'DELETE' }); load() }) }
  const saveTask = async () => { if (!taskForm.title || !taskForm.reward) return; const url = editTaskId ? '/api/app/admin/tasks/' + editTaskId : '/api/app/admin/tasks'; await fetch(url, { method: editTaskId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskForm) }); setTaskForm({ title: '', description: '', reward: '', category: 'general', link: '', duration: '', requireVisit: false }); setEditTaskId(null); load() }
  const deleteTask = async (id: string) => { await withProcessing(id, async () => { await fetch(api(`/api/app/admin/tasks/${id}`, { method: 'DELETE' }); load() }) }
  const broadcast = async () => { if (!broadcastMsg) return; await fetch(api('/api/app/admin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '📢 Announcement', message: broadcastMsg, type: 'info' }) }); setBroadcastMsg(''); load() }

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const q = searchQuery.toLowerCase()
    return users.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
  }, [users, searchQuery])

  const filteredDeposits = useMemo(() => {
    if (!searchQuery) return deposits
    const q = searchQuery.toLowerCase()
    return deposits.filter(d => (d.user?.name || '').toLowerCase().includes(q) || d.method?.toLowerCase().includes(q))
  }, [deposits, searchQuery])

  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery) return withdrawals
    const q = searchQuery.toLowerCase()
    return withdrawals.filter(w => (w.user?.name || '').toLowerCase().includes(q) || w.method?.toLowerCase().includes(q))
  }, [withdrawals, searchQuery])

  const investmentChartData = useMemo(() => {
    if (!plans.length) return []
    return plans.map(p => ({ name: p.name, amount: p.amount, profit: p.dailyProfit * p.duration, dailyProfit: p.dailyProfit }))
  }, [plans])

  const pieData = useMemo(() => {
    const pendingD = deposits.filter(d => d.status === 'pending').length
    const approvedD = deposits.filter(d => d.status === 'approved').length
    const rejectedD = deposits.filter(d => d.status === 'rejected').length
    return [
      { name: 'Pending', value: pendingD || 0, color: COLORS.gold },
      { name: 'Approved', value: approvedD || 0, color: '#10B981' },
      { name: 'Rejected', value: rejectedD || 0, color: '#EF4444' },
    ].filter(d => d.value > 0)
  }, [deposits])

  const revenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return months.map((m, i) => ({
      name: m,
      deposits: Math.floor(Math.random() * 50000 + 10000),
      withdrawals: Math.floor(Math.random() * 30000 + 5000),
    }))
  }, [])

  const handleExport = (type: string) => {
    let csv = ''
    let filename = ''
    if (type === 'users') {
      csv = 'Name,Email,Role,Balance,Active\n' + users.map(u => `"${u.name}","${u.email}","${u.role}","${u.mainBalance || 0}","${u.active}"`).join('\n')
      filename = 'users_export.csv'
    } else if (type === 'deposits') {
      csv = 'User,Amount,Method,Status,Date\n' + deposits.map(d => `"${d.user?.name}","${d.amount}","${d.method}","${d.status}","${d.createdAt}"`).join('\n')
      filename = 'deposits_export.csv'
    } else if (type === 'withdrawals') {
      csv = 'User,Amount,Method,Status,Date\n' + withdrawals.map(w => `"${w.user?.name}","${w.amount}","${w.method}","${w.status}","${w.createdAt}"`).join('\n')
      filename = 'withdrawals_export.csv'
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => { window.print() }

  if (loading) return (
    <div className="admin-loading-screen">
      <div className="admin-loading-spinner" />
      <p className="admin-loading-text">Loading Admin Panel...</p>
    </div>
  )

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'deposits', label: 'Deposits', icon: Wallet },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownRight },
    { id: 'plans', label: 'Investments', icon: TrendingUp },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'broadcast', label: 'Broadcast', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="admin-panel-root">
      {/* Mobile Overlay Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="admin-sidebar absolute left-0 top-0 bottom-0 w-64" onClick={e => e.stopPropagation()}>
            <div className="admin-sidebar-header">
              <div className="flex items-center gap-2">
                <div className="admin-logo-icon"><Zap className="h-5 w-5 text-white" /></div>
                <div>
                  <h1 className="admin-logo-text">Roshan Digital</h1>
                  <p className="admin-logo-sub">Admin Panel</p>
                </div>
              </div>
              <button className="admin-sidebar-toggle" onClick={() => setMobileMenuOpen(false)}>
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <nav className="admin-sidebar-nav">
              {sidebarItems.map(item => (
                <button key={item.id} className={`admin-sidebar-item ${sidebarTab === item.id ? 'active' : ''}`}
                  onClick={() => { setSidebarTab(item.id); setMobileMenuOpen(false) }}>
                  <item.icon className="h-5 w-5 flex-shrink-0" /><span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="admin-sidebar-footer">
              <button className="admin-sidebar-item" onClick={() => { setMobileMenuOpen(false); onNav('settings') }}>
                <ArrowUpRight className="h-5 w-5 flex-shrink-0" /><span>Back to App</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} hidden md:flex`}>
        <div className="admin-sidebar-header">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="admin-logo-icon"><Zap className="h-5 w-5 text-white" /></div>
              <div>
                <h1 className="admin-logo-text">Roshan Digital</h1>
                <p className="admin-logo-sub">Admin Panel</p>
              </div>
            </div>
          )}
          <button className="admin-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              className={`admin-sidebar-item ${sidebarTab === item.id ? 'active' : ''}`}
              onClick={() => setSidebarTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-item" onClick={() => onNav('settings')}>
            <ArrowUpRight className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Back to App</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="flex items-center gap-2 flex-1">
            <button className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileMenuOpen(true)}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="admin-topbar-title">{sidebarItems.find(i => i.id === sidebarTab)?.label}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="admin-search-box">
              <Search className="h-4 w-4 text-slate-400" />
              <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button size="sm" className="admin-btn-ghost" onClick={handlePrint}><Printer className="h-4 w-4" /></Button>
            <div className="admin-avatar">
              <Shield className="h-4 w-4" />
            </div>
          </div>
        </header>

        <div className="admin-content">
          {/* Dashboard */}
          {sidebarTab === 'dashboard' && (
            <div className="admin-section animate-fade-in-up">
              <div className="admin-stats-grid">
                {[
                  { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: COLORS.royalBlue, change: '+12%' },
                  { label: 'Active Investments', value: stats?.activeInvestments || 0, icon: TrendingUp, color: COLORS.purple, change: '+8%' },
                  { label: 'Total Deposits', value: `PKR ${(stats?.totalDeposits || 0).toLocaleString()}`, icon: Wallet, color: COLORS.gold, change: '+24%' },
                  { label: 'Total Withdrawals', value: `PKR ${(stats?.totalWithdrawals || 0).toLocaleString()}`, icon: ArrowDownRight, color: '#EF4444', change: '+15%' },
                  { label: 'Pending Deposits', value: stats?.pendingDeposits || 0, icon: RefreshCw, color: '#F59E0B', change: '' },
                  { label: 'Pending Withdrawals', value: stats?.pendingWithdrawals || 0, icon: Activity, color: '#10B981', change: '' },
                ].map((s, i) => (
                  <Card key={i} className="admin-stat-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="admin-stat-icon" style={{ backgroundColor: `${s.color}15` }}>
                          <s.icon className="h-5 w-5" style={{ color: s.color }} />
                        </div>
                        {s.change && <span className="admin-stat-change">{s.change}</span>}
                      </div>
                      <p className="admin-stat-value">{s.value}</p>
                      <p className="admin-stat-label">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts Row */}
              <div className="admin-charts-grid">
                <Card className="admin-chart-card">
                  <CardContent className="p-5">
                    <h3 className="admin-chart-title">Revenue Overview</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                          <defs>
                            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.royalBlue} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.royalBlue} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="deposits" stroke={COLORS.royalBlue} fill="url(#gradBlue)" strokeWidth={2} />
                          <Area type="monotone" dataKey="withdrawals" stroke={COLORS.purple} fill="url(#gradPurple)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-chart-card">
                  <CardContent className="p-5">
                    <h3 className="admin-chart-title">Deposit Status</h3>
                    <div className="h-64 flex items-center justify-center">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                              {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-slate-400 text-sm">No deposit data</p>
                      )}
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.name} ({d.value})
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Investment Plans Chart */}
              {investmentChartData.length > 0 && (
                <Card className="admin-chart-card">
                  <CardContent className="p-5">
                    <h3 className="admin-chart-title">Investment Plans Analysis</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={investmentChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="amount" fill={COLORS.royalBlue} radius={[6, 6, 0, 0]} />
                          <Bar dataKey="profit" fill={COLORS.gold} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cloud Status */}
              <div className="admin-cloud-status-grid">
                {[
                  { label: 'Cloud Database', icon: Database, status: 'Online', ok: true },
                  { label: 'SSL Security', icon: Lock, status: 'Active', ok: true },
                  { label: 'Server Status', icon: Server, status: 'Running', ok: true },
                  { label: 'API Integration', icon: Cloud, status: 'Connected', ok: true },
                ].map((c, i) => (
                  <Card key={i} className="admin-cloud-card">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="admin-cloud-icon"><c.icon className="h-4 w-4" /></div>
                      <div className="flex-1">
                        <p className="admin-cloud-label">{c.label}</p>
                        <p className="admin-cloud-status">{c.status}</p>
                      </div>
                      <div className={`admin-cloud-dot ${c.ok ? 'online' : ''}`} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {sidebarTab === 'users' && (
            <div className="admin-section animate-fade-in-up">
              <div className="admin-section-header">
                <h3 className="admin-section-title">User Management</h3>
                <div className="flex gap-2">
                  <Button size="sm" className="admin-btn-outline" onClick={() => handleExport('users')}><Download className="h-4 w-4 mr-1" />Export</Button>
                </div>
              </div>
              <div className="admin-data-table">
                <div className="admin-table-header-row">
                  <span className="admin-table-th flex-1">User</span>
                  <span className="admin-table-th w-20 text-center">Role</span>
                  <span className="admin-table-th w-20 text-center">Status</span>
                  <span className="admin-table-th w-40 text-right">Actions</span>
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="admin-empty-state">No users found</div>
                ) : filteredUsers.map(u => (
                  <div key={u.id} className="admin-table-row">
                    <div className="flex-1 min-w-0">
                      <p className="admin-table-cell-primary">{u.name || 'No Name'}</p>
                      <p className="admin-table-cell-secondary">{u.email}</p>
                    </div>
                    <span className="w-20 text-center">
                      <Badge className={`admin-badge-${u.role === 'admin' ? 'gold' : 'blue'}`}>{u.role}</Badge>
                    </span>
                    <span className="w-20 text-center">
                      <span className={`admin-status-dot ${u.active ? 'active' : 'inactive'}`} />
                    </span>
                    <div className="w-40 flex justify-end gap-1.5">
                      {u.role !== 'admin' && (
                        <Button size="sm" className="admin-btn-sm admin-btn-gold" disabled={processingId === u.id} onClick={() => makeAdmin(u.id)}>
                          {processingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="sm" className={`admin-btn-sm ${u.active ? 'admin-btn-danger' : 'admin-btn-success'}`} disabled={processingId === u.id} onClick={() => toggleActive(u.id)}>
                        {processingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.active ? 'Ban' : 'Unban'}
                      </Button>
                      <Button size="sm" className="admin-btn-sm admin-btn-outline" disabled={processingId === u.id} onClick={() => forceLogout(u.id)}>
                        {processingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Logout'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deposits */}
          {sidebarTab === 'deposits' && (
            <div className="admin-section animate-fade-in-up">
              <div className="admin-section-header">
                <h3 className="admin-section-title">Deposit Management</h3>
                <div className="flex gap-2">
                  <Button size="sm" className="admin-btn-outline" onClick={() => handleExport('deposits')}><Download className="h-4 w-4 mr-1" />Export</Button>
                </div>
              </div>
              <div className="admin-data-table">
                <div className="admin-table-header-row">
                  <span className="admin-table-th flex-1">User</span>
                  <span className="admin-table-th w-24 text-right">Amount</span>
                  <span className="admin-table-th w-20">Method</span>
                  <span className="admin-table-th w-24 text-center">Status</span>
                  <span className="admin-table-th w-28 text-center">Actions</span>
                </div>
                {filteredDeposits.length === 0 ? (
                  <div className="admin-empty-state">No deposits found</div>
                ) : filteredDeposits.map(d => (
                  <div key={d.id} className="admin-table-row">
                    <div className="flex-1 min-w-0">
                      <p className="admin-table-cell-primary">{d.user?.name || 'Unknown'}</p>
                      <p className="admin-table-cell-secondary">{new Date(d.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="w-24 text-right font-semibold text-slate-800">PKR {d.amount.toLocaleString()}</span>
                    <span className="w-20 text-sm text-slate-600">{d.method}</span>
                    <span className="w-24 text-center">
                      <Badge className={`admin-badge-${d.status === 'approved' ? 'success' : d.status === 'rejected' ? 'danger' : 'gold'}`}>{d.status}</Badge>
                    </span>
                    <div className="w-28 flex justify-end gap-1.5">
                      {d.screenshot && (
                        <a href={d.screenshot} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="admin-btn-sm admin-btn-outline"><Eye className="h-3.5 w-3.5" /></Button>
                        </a>
                      )}
                      {d.status === 'pending' && (
                        <>
                          <Button size="sm" className="admin-btn-sm admin-btn-success" disabled={processingId === d.id} onClick={() => approveDeposit(d.id)}>
                            {processingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" className="admin-btn-sm admin-btn-danger" disabled={processingId === d.id} onClick={() => rejectDeposit(d.id)}>
                            {processingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Withdrawals */}
          {sidebarTab === 'withdrawals' && (
            <div className="admin-section animate-fade-in-up">
              <div className="admin-section-header">
                <h3 className="admin-section-title">Withdrawal Management</h3>
                <div className="flex gap-2">
                  <Button size="sm" className="admin-btn-outline" onClick={() => handleExport('withdrawals')}><Download className="h-4 w-4 mr-1" />Export</Button>
                </div>
              </div>
              <div className="admin-data-table">
                <div className="admin-table-header-row">
                  <span className="admin-table-th flex-1">User</span>
                  <span className="admin-table-th w-24 text-right">Amount</span>
                  <span className="admin-table-th w-20">Method</span>
                  <span className="admin-table-th w-24 text-center">Status</span>
                  <span className="admin-table-th w-28 text-center">Actions</span>
                </div>
                {filteredWithdrawals.length === 0 ? (
                  <div className="admin-empty-state">No withdrawals found</div>
                ) : filteredWithdrawals.map(w => (
                  <div key={w.id} className="admin-table-row">
                    <div className="flex-1 min-w-0">
                      <p className="admin-table-cell-primary">{w.user?.name || 'Unknown'}</p>
                      <p className="admin-table-cell-secondary">{w.method} · {w.accountNumber}</p>
                    </div>
                    <span className="w-24 text-right font-semibold text-slate-800">PKR {w.amount.toLocaleString()}</span>
                    <span className="w-20 text-sm text-slate-600">{w.method}</span>
                    <span className="w-24 text-center">
                      <Badge className={`admin-badge-${w.status === 'approved' ? 'success' : w.status === 'rejected' ? 'danger' : 'gold'}`}>{w.status}</Badge>
                    </span>
                    <div className="w-28 flex justify-end gap-1.5">
                      {w.status === 'pending' && (
                        <>
                          <Button size="sm" className="admin-btn-sm admin-btn-success" disabled={processingId === w.id} onClick={() => approveWithdrawal(w.id)}>
                            {processingId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" className="admin-btn-sm admin-btn-danger" disabled={processingId === w.id} onClick={() => rejectWithdrawal(w.id)}>
                            {processingId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investment Plans */}
          {sidebarTab === 'plans' && (
            <div className="admin-section animate-fade-in-up">
              <div className="admin-section-header">
                <h3 className="admin-section-title">Investment Plans</h3>
              </div>

              <Card className="admin-form-card">
                <CardContent className="p-5 space-y-4">
                  <h4 className="admin-form-title">{editPlanId ? 'Edit Plan' : 'Create New Plan'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="admin-label">Plan Name</Label><Input className="admin-input" placeholder="e.g. Gold Plan" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} /></div>
                    <div><Label className="admin-label">Description</Label><Input className="admin-input" placeholder="Plan description" value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /></div>
                    <div><Label className="admin-label">Amount (PKR)</Label><Input className="admin-input" type="number" placeholder="10000" value={planForm.amount} onChange={e => setPlanForm({ ...planForm, amount: e.target.value })} /></div>
                    <div><Label className="admin-label">Daily Profit (PKR)</Label><Input className="admin-input" type="number" placeholder="500" value={planForm.dailyProfit} onChange={e => setPlanForm({ ...planForm, dailyProfit: e.target.value })} /></div>
                    <div><Label className="admin-label">Duration (Days)</Label><Input className="admin-input" type="number" placeholder="30" value={planForm.duration} onChange={e => setPlanForm({ ...planForm, duration: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="admin-btn-primary" onClick={savePlan}>
                      <Plus className="h-4 w-4 mr-1" />{editPlanId ? 'Save Changes' : 'Create Plan'}
                    </Button>
                    {editPlanId && <Button className="admin-btn-outline" onClick={() => { setEditPlanId(null); setPlanForm({ name: '', description: '', amount: '', dailyProfit: '', duration: '' }) }}>Cancel</Button>}
                  </div>
                </CardContent>
              </Card>

              <div className="admin-data-table mt-4">
                <div className="admin-table-header-row">
                  <span className="admin-table-th flex-1">Plan Name</span>
                  <span className="admin-table-th w-24 text-right">Amount</span>
                  <span className="admin-table-th w-24 text-right">Daily Profit</span>
                  <span className="admin-table-th w-16 text-center">Days</span>
                  <span className="admin-table-th w-24 text-center">Total Return</span>
                  <span className="admin-table-th w-24 text-right">Actions</span>
                </div>
                {plans.map(p => (
                  <div key={p.id} className="admin-table-row">
                    <div className="flex-1 min-w-0">
                      <p className="admin-table-cell-primary">{p.name}</p>
                      <p className="admin-table-cell-secondary">{p.description}</p>
                    </div>
                    <span className="w-24 text-right font-semibold text-slate-800">PKR {p.amount.toLocaleString()}</span>
                    <span className="w-24 text-right text-emerald-600 font-medium">PKR {p.dailyProfit}</span>
                    <span className="w-16 text-center text-slate-600">{p.duration}</span>
                    <span className="w-24 text-center font-semibold text-[#7C3AED]">PKR {(p.dailyProfit * p.duration).toLocaleString()}</span>
                    <div className="w-24 flex justify-end gap-1.5">
                      <Button size="sm" className="admin-btn-sm admin-btn-blue" onClick={() => { setEditPlanId(p.id); setPlanForm({ name: p.name, description: p.description, amount: String(p.amount), dailyProfit: String(p.dailyProfit), duration: String(p.duration) }) }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" className="admin-btn-sm admin-btn-danger" disabled={processingId === p.id} onClick={() => deletePlan(p.id)}>
                        {processingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {sidebarTab === 'tasks' && (
            <div className="admin-section animate-fade-in-up">
              <div className="admin-section-header">
                <h3 className="admin-section-title">Daily Tasks</h3>
              </div>

              <Card className="admin-form-card">
                <CardContent className="p-5 space-y-4">
                  <h4 className="admin-form-title">{editTaskId ? 'Edit Task' : 'Create New Task'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="admin-label">Task Title</Label><Input className="admin-input" placeholder="e.g. Watch Video" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
                    <div><Label className="admin-label">Description</Label><Input className="admin-input" placeholder="Task description" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                    <div><Label className="admin-label">Reward (PKR)</Label><Input className="admin-input" type="number" placeholder="100" value={taskForm.reward} onChange={e => setTaskForm({ ...taskForm, reward: e.target.value })} /></div>
                    <div>
                      <Label className="admin-label">Category</Label>
                      <Select value={taskForm.category} onValueChange={v => setTaskForm({ ...taskForm, category: v })}>
                        <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="app">App</SelectItem>
                          <SelectItem value="social">Social Media</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="admin-label">Video/Link URL (optional)</Label><Input className="admin-input" placeholder="https://..." value={taskForm.link} onChange={e => setTaskForm({ ...taskForm, link: e.target.value })} /></div>
                    <div><Label className="admin-label">Watch Time (seconds)</Label><Input className="admin-input" type="number" placeholder="10" value={taskForm.duration} onChange={e => setTaskForm({ ...taskForm, duration: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={taskForm.requireVisit} onCheckedChange={v => setTaskForm({ ...taskForm, requireVisit: v })} />
                    <Label className="admin-label">Require viewing before completion</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button className="admin-btn-primary" onClick={saveTask}>
                      <Plus className="h-4 w-4 mr-1" />{editTaskId ? 'Save Changes' : 'Create Task'}
                    </Button>
                    {editTaskId && <Button className="admin-btn-outline" onClick={() => { setEditTaskId(null); setTaskForm({ title: '', description: '', reward: '', category: 'general', link: '', duration: '', requireVisit: false }) }}>Cancel</Button>}
                  </div>
                </CardContent>
              </Card>

              <div className="admin-data-table mt-4">
                <div className="admin-table-header-row">
                  <span className="admin-table-th flex-1">Task</span>
                  <span className="admin-table-th w-24 text-right">Reward</span>
                  <span className="admin-table-th w-24 text-center">Category</span>
                  <span className="admin-table-th w-20 text-center">Link</span>
                  <span className="admin-table-th w-24 text-right">Actions</span>
                </div>
                {tasks.map(t => (
                  <div key={t.id} className="admin-table-row">
                    <div className="flex-1 min-w-0">
                      <p className="admin-table-cell-primary">{t.title}</p>
                      <p className="admin-table-cell-secondary">{t.description}</p>
                    </div>
                    <span className="w-24 text-right font-semibold text-emerald-600">PKR {t.reward}</span>
                    <span className="w-24 text-center"><Badge className="admin-badge-blue">{t.category}</Badge></span>
                    <span className="w-20 text-center">{t.link ? <Badge className="admin-badge-gold">Yes</Badge> : <span className="text-slate-300">—</span>}</span>
                    <div className="w-24 flex justify-end gap-1.5">
                      <Button size="sm" className="admin-btn-sm admin-btn-blue" onClick={() => { setEditTaskId(t.id); setTaskForm({ title: t.title, description: t.description, reward: String(t.reward), category: t.category, link: t.link || '', duration: String(t.duration || ''), requireVisit: t.requireVisit || false }) }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" className="admin-btn-sm admin-btn-danger" disabled={processingId === t.id} onClick={() => deleteTask(t.id)}>
                        {processingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Broadcast */}
          {sidebarTab === 'broadcast' && (
            <div className="admin-section animate-fade-in-up">
              <div className="admin-section-header">
                <h3 className="admin-section-title">Broadcast Announcement</h3>
              </div>
              <Card className="admin-form-card">
                <CardContent className="p-5 space-y-4">
                  <h4 className="admin-form-title">Send Announcement to All Users</h4>
                  <div><Label className="admin-label">Message</Label><Textarea className="admin-input" placeholder="Type your announcement message..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} rows={5} /></div>
                  <Button className="admin-btn-primary" onClick={broadcast} disabled={!broadcastMsg}>
                    <Send className="h-4 w-4 mr-1" />Send Announcement
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings */}
          {sidebarTab === 'settings' && (
            <div className="admin-section animate-fade-in-up space-y-4">
              <div className="admin-section-header">
                <h3 className="admin-section-title">Platform Settings</h3>
              </div>

              <Card className="admin-form-card">
                <CardContent className="p-5 space-y-4">
                  <h4 className="admin-form-title">Feature Controls</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{ key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Temporarily disable the platform' }, { key: 'tasksEnabled', label: 'Tasks Enabled', desc: 'Allow users to complete tasks' }, { key: 'investmentsEnabled', label: 'Investments Enabled', desc: 'Allow users to buy investment plans' }, { key: 'depositsEnabled', label: 'Deposits Enabled', desc: 'Allow users to make deposits' }, { key: 'withdrawalsEnabled', label: 'Withdrawals Enabled', desc: 'Allow users to request withdrawals' }, { key: 'referralsEnabled', label: 'Referrals Enabled', desc: 'Allow referral system' }].map(s => (
                      <div key={s.key} className="admin-settings-toggle">
                        <div className="flex-1"><p className="admin-label">{s.label}</p><p className="admin-settings-desc">{s.desc}</p></div>
                        <Switch checked={settings[s.key] === 'true'} onCheckedChange={v => setSettings({ ...settings, [s.key]: v ? 'true' : 'false' })} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-form-card">
                <CardContent className="p-5 space-y-4">
                  <h4 className="admin-form-title">Payment Accounts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="admin-label">JazzCash Number</Label><Input className="admin-input" placeholder="03XX-XXXXXXX" value={settings.depositNumberJazzcash || ''} onChange={e => setSettings({ ...settings, depositNumberJazzcash: e.target.value })} /></div>
                    <div><Label className="admin-label">EasyPaisa Number</Label><Input className="admin-input" placeholder="03XX-XXXXXXX" value={settings.depositNumberEasypaisa || ''} onChange={e => setSettings({ ...settings, depositNumberEasypaisa: e.target.value })} /></div>
                    <div><Label className="admin-label">Bank Account</Label><Input className="admin-input" placeholder="Account number" value={settings.depositNumberBank || ''} onChange={e => setSettings({ ...settings, depositNumberBank: e.target.value })} /></div>
                    <div><Label className="admin-label">USDT Address</Label><Input className="admin-input" placeholder="TRC20 address" value={settings.depositNumberUsdt || ''} onChange={e => setSettings({ ...settings, depositNumberUsdt: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="admin-form-card">
                <CardContent className="p-5 space-y-4">
                  <h4 className="admin-form-title">Platform Limits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="admin-label">Minimum Deposit (PKR)</Label><Input className="admin-input" type="number" placeholder="500" value={settings.minDeposit || ''} onChange={e => setSettings({ ...settings, minDeposit: e.target.value })} /></div>
                    <div><Label className="admin-label">Maximum Deposit (PKR)</Label><Input className="admin-input" type="number" placeholder="100000" value={settings.maxDeposit || ''} onChange={e => setSettings({ ...settings, maxDeposit: e.target.value })} /></div>
                    <div><Label className="admin-label">Minimum Withdrawal (PKR)</Label><Input className="admin-input" type="number" placeholder="1000" value={settings.minWithdrawal || ''} onChange={e => setSettings({ ...settings, minWithdrawal: e.target.value })} /></div>
                    <div><Label className="admin-label">Referral Reward (PKR)</Label><Input className="admin-input" type="number" placeholder="200" value={settings.referralReward || ''} onChange={e => setSettings({ ...settings, referralReward: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              <Button className="admin-btn-primary w-full" onClick={saveSettings}>
                <CheckCircle className="h-4 w-4 mr-1" />Save All Settings
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
