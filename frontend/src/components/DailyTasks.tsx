import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Gift, ExternalLink, Play, Clock } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any }

export default function DailyTasks({ user }: Props) {
  const [tasks, setTasks] = useState<any[]>([])
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const load = () => {
    fetch(api('/api/app/user-tasks/' + user.id)
      .then(r => r.json())
      .then(d => {
        setTasks(d.tasks || [])
        setCompleted(d.completed || 0)
        setTotal(d.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [user.id])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-blue rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-5 w-5" />
          <h2 className="text-lg font-medium">Daily Tasks</h2>
        </div>
        <p className="text-blue-100 text-sm font-normal">{completed} / {total} completed</p>
        <div className="w-full bg-white/30 rounded-full h-2 mt-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-500"
            style={{ width: (total > 0 ? (completed / total) * 100 : 0) + '%' }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
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
  )
}

function TaskCard({ task, user, onComplete, completing, setCompleting }: any) {
  const [viewing, setViewing] = useState(false)
  const [timeLeft, setTimeLeft] = useState(task.duration || 0)
  const [viewDone, setViewDone] = useState(task.duration === 0 || !task.link)
  const timerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)

  const hasLink = !!task.link
  const hasDuration = task.duration > 0
  const mustWatch = hasLink && hasDuration

  const startViewing = useCallback(() => {
    setViewing(true)
    setTimeLeft(task.duration)
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = Math.max(0, task.duration - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current)
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
    const res = await fetch(api('/api/app/tasks/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, taskId: task.id, viewTime: Math.max(viewTime, task.duration) }),
    })
    const data = await res.json()
    if (data.ok) onComplete()
    else alert(data.error || 'Failed')
    setCompleting(null)
  }

  return (
    <Card className={'glass-card transition-all ' + (task.status === 'completed' ? 'opacity-60' : '')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{task.title}</h3>
              {task.status === 'completed' && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Done</Badge>}
            </div>
            <p className="text-xs text-gray-500 mt-1 font-normal">{task.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Gift className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">PKR {task.reward}</span>
              {hasDuration && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {task.duration}s required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Link viewer section */}
        {hasLink && task.status !== 'completed' && (
          <div className="mt-3">
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
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {hasDuration ? 'Watch & complete task' : 'Open link'}
            </a>

            {/* Timer bar */}
            {mustWatch && viewing && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><Play className="h-3 w-3 text-blue-500 animate-pulse" /> Watching...</span>
                  <span>{timeLeft}s remaining</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 rounded-full h-2 transition-all duration-200"
                    style={{ width: ((task.duration - timeLeft) / task.duration * 100) + '%' }}
                  />
                </div>
                <p className="text-xs text-amber-600 mt-1 font-normal">Do not close or skip — timer is running</p>
              </div>
            )}

            {mustWatch && viewDone && !viewing && (
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle className="h-3 w-3" /> Viewing requirement met!
              </div>
            )}
          </div>
        )}

        {/* Complete button */}
        {task.status !== 'completed' && (
          <div className="mt-3">
            {mustWatch && !viewDone ? (
              <Button
                className="w-full bg-gray-300 text-gray-600 cursor-not-allowed"
                disabled
              >
                Watch the content first ({timeLeft}s left)
              </Button>
            ) : (
              <Button
                className="w-full hero-blue text-white"
                onClick={handleComplete}
                disabled={completing === task.id}
              >
                {completing === task.id ? 'Completing...' : 'Mark as Complete'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
