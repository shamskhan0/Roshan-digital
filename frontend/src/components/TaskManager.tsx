import {
import { api } from '@/lib/api-config' useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle, Gift, ExternalLink, Play, Clock, Star, Filter,
  TrendingUp, Zap, Target, Award, ChevronRight, RefreshCw, Sparkles
} from 'lucide-react'

interface Props { user: any }

interface Task {
  id: string
  title: string
  description: string
  reward: number
  category: string
  link: string | null
  duration: number
  requireVisit: boolean
  status: string
}

export default function TaskManager({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [totalEarned, setTotalEarned] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    fetch(api(`/api/app/user-tasks/${user.id}`)
      .then(r => r.json())
      .then(d => {
        setTasks(d.tasks || [])
        setCompleted(d.completed || 0)
        setTotal(d.total || 0)
        setTotalEarned(d.totalEarned || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user.id])

  useEffect(() => { load() }, [load])

  const categories = [
    { id: 'all', label: 'All Tasks', icon: Target, color: 'text-blue-600 bg-blue-100' },
    { id: 'app', label: 'Apps', icon: Zap, color: 'text-purple-600 bg-purple-100' },
    { id: 'video', label: 'Videos', icon: Play, color: 'text-red-600 bg-red-100' },
    { id: 'social', label: 'Social', icon: Star, color: 'text-pink-600 bg-pink-100' },
    { id: 'review', label: 'Reviews', icon: Award, color: 'text-amber-600 bg-amber-100' },
    { id: 'referral', label: 'Referral', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
    { id: 'visit', label: 'Visit', icon: ExternalLink, color: 'text-cyan-600 bg-cyan-100' },
  ]

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.category === filter)

  const availableTasks = filteredTasks.filter(t => t.status !== 'completed')
  const completedTasks = filteredTasks.filter(t => t.status === 'completed')
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent" />
        <p className="text-gray-400 text-sm mt-3">Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">

      {/* Hero Header — Dark Navy like Screenshot */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h1 className="text-xl font-semibold">Daily Tasks</h1>
            </div>
            <p className="text-slate-300 text-sm font-normal">Complete tasks, earn rewards</p>
          </div>
          <button
            onClick={load}
            className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <RefreshCw className="h-5 w-5 text-slate-300" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{completed}</p>
            <p className="text-xs text-slate-300 font-normal">Done</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{availableTasks.length}</p>
            <p className="text-xs text-slate-300 font-normal">Pending</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">PKR {totalEarned.toLocaleString()}</p>
            <p className="text-xs text-slate-300 font-normal">Earned</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
            <span>{completed} of {total} tasks completed</span>
            <span className="font-semibold text-white">{progressPercent}%</span>
          </div>
          <div className="w-full bg-white/15 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-full h-2.5 transition-all duration-700 ease-out shadow-sm"
              style={{ width: progressPercent + '%' }}
            />
          </div>
        </div>
      </div>

      {/* Category Filter — Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {categories.map(cat => {
          const count = cat.id === 'all'
            ? tasks.length
            : tasks.filter(t => t.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filter === cat.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-100'
              }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                filter === cat.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Available Tasks */}
      {availableTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-700">Available ({availableTasks.length})</h2>
          </div>
          <div className="space-y-3">
            {availableTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                user={user}
                onComplete={load}
                completing={completing}
                setCompleting={setCompleting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700">Completed ({completedTasks.length})</h2>
          </div>
          <div className="space-y-3">
            {completedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                user={user}
                onComplete={load}
                completing={completing}
                setCompleting={setCompleting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No tasks found</h3>
          <p className="text-sm text-gray-400 font-normal">
            {filter === 'all' ? 'No tasks available right now. Check back later!' : `No ${filter} tasks available.`}
          </p>
        </div>
      )}

      {/* All Done Banner */}
      {completed === total && total > 0 && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-5 text-center">
            <Award className="h-12 w-12 text-amber-500 mx-auto mb-2" />
            <h3 className="font-semibold text-amber-800">All Tasks Completed! 🎉</h3>
            <p className="text-sm text-amber-600 mt-1 font-normal">
              You've earned PKR {totalEarned.toLocaleString()} today. Come back tomorrow!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ─── Individual Task Card ─── */
function TaskCard({ task, user, onComplete, completing, setCompleting }: {
  task: Task
  user: any
  onComplete: () => void
  completing: string | null
  setCompleting: (id: string | null) => void
}) {
  const [viewing, setViewing] = useState(false)
  const [timeLeft, setTimeLeft] = useState(task.duration || 0)
  const [viewDone, setViewDone] = useState(task.duration === 0 || !task.link)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const hasLink = !!task.link
  const hasDuration = task.duration > 0
  const mustWatch = hasLink && hasDuration
  const isCompleted = task.status === 'completed'

  const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
    app: { bg: 'bg-purple-50', text: 'text-purple-600', icon: '📱' },
    video: { bg: 'bg-red-50', text: 'text-red-600', icon: '🎬' },
    social: { bg: 'bg-pink-50', text: 'text-pink-600', icon: '💙' },
    review: { bg: 'bg-amber-50', text: 'text-amber-600', icon: '⭐' },
    referral: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: '🔗' },
    visit: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: '🌐' },
    general: { bg: 'bg-blue-50', text: 'text-blue-600', icon: '📋' },
  }
  const catStyle = categoryColors[task.category] || categoryColors.general

  const startViewing = useCallback(() => {
    setViewing(true)
    setTimeLeft(task.duration)
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = Math.max(0, task.duration - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        setViewDone(true)
        setViewing(false)
      }
    }, 100)
  }, [task.duration])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleComplete = async () => {
    if (mustWatch && !viewDone) return
    const viewTime = hasDuration ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0
    setCompleting(task.id)
    try {
      const res = await fetch(api('/api/app/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          taskId: task.id,
          viewTime: Math.max(viewTime, task.duration)
        }),
      })
      const data = await res.json()
      if (data.ok) onComplete()
      else alert(data.error || 'Failed to complete task')
    } catch {
      alert('Network error. Please try again.')
    }
    setCompleting(null)
  }

  return (
    <Card className={`transition-all duration-300 ${
      isCompleted
        ? 'opacity-70 border-emerald-100 bg-emerald-50/30'
        : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
    }`}>
      <CardContent className="p-4">
        {/* Top Row — Category Badge + Status */}
        <div className="flex items-start justify-between mb-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${catStyle.bg} ${catStyle.text}`}>
            <span>{catStyle.icon}</span>
            <span className="capitalize">{task.category}</span>
          </div>
          {isCompleted ? (
            <div className="flex items-center gap-1 text-emerald-500">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Done</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-500">
              <Gift className="h-4 w-4" />
              <span className="text-sm font-bold">PKR {task.reward}</span>
            </div>
          )}
        </div>

        {/* Title + Description */}
        <h3 className={`font-semibold text-sm mb-1 ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {task.title}
        </h3>
        <p className="text-xs text-gray-400 font-normal leading-relaxed">{task.description}</p>

        {/* Duration Info */}
        {hasDuration && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{task.duration} seconds required</span>
          </div>
        )}

        {/* Link + Timer Section */}
        {hasLink && !isCompleted && (
          <div className="mt-3 space-y-2">
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (mustWatch && !viewDone) {
                  e.preventDefault()
                  window.open(task.link, '_blank')
                  if (!viewing) startViewing()
                }
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              {hasDuration ? 'Watch & Complete' : 'Open Link'}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </a>

            {/* Timer Progress */}
            {mustWatch && viewing && (
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs text-blue-600 mb-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Play className="h-3.5 w-3.5 animate-pulse" />
                    Watching...
                  </span>
                  <span className="font-semibold">{timeLeft}s left</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2 transition-all duration-200"
                    style={{ width: ((task.duration - timeLeft) / task.duration * 100) + '%' }}
                  />
                </div>
                <p className="text-[10px] text-amber-600 mt-1.5 font-medium">
                  ⚠️ Don't close or skip — timer is running
                </p>
              </div>
            )}

            {mustWatch && viewDone && !viewing && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Viewing requirement met!</span>
              </div>
            )}
          </div>
        )}

        {/* Complete Button */}
        {!isCompleted && (
          <div className="mt-3">
            {mustWatch && !viewDone ? (
              <Button
                className="w-full bg-gray-100 text-gray-400 cursor-not-allowed h-11 rounded-xl"
                disabled
              >
                <Clock className="h-4 w-4 mr-2" />
                Watch content first ({timeLeft}s)
              </Button>
            ) : (
              <Button
                className={`w-full h-11 rounded-xl font-semibold text-sm transition-all ${
                  completing === task.id
                    ? 'bg-slate-300 text-slate-500'
                    : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white active:scale-[0.98] shadow-md hover:shadow-lg'
                }`}
                onClick={handleComplete}
                disabled={completing === task.id}
              >
                {completing === task.id ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Completing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Complete — PKR {task.reward}
                  </span>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Completed Reward Badge */}
        {isCompleted && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl py-2.5 font-medium">
            <Award className="h-4 w-4" />
            PKR {task.reward} earned!
          </div>
        )}
      </CardContent>
    </Card>
  )
}
