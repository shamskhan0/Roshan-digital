import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Heart, Send, Trash2, Users } from 'lucide-react'
import { api } from '@/lib/api-config'

interface Props { user: any }

export default function Community({ user }: Props) {
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const load = (p: number) => {
    fetch(api('/api/app/community/posts?page=' + p + '&limit=20')
      .then(r => r.json())
      .then(d => {
        if (p === 1) setPosts(d.posts || [])
        else setPosts(prev => [...prev, ...(d.posts || [])])
        setHasMore(d.hasMore || false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [])

  const createPost = async () => {
    if (!newPost.trim()) return
    setPosting(true)
    const res = await fetch(api('/api/app/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, content: newPost }),
    })
    const data = await res.json()
    if (data.ok) { setNewPost(''); load(1) }
    setPosting(false)
  }

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return
    await fetch(api('/api/app/community/posts/' + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isAdmin: user.role === 'admin' }),
    })
    load(1)
  }

  const toggleLike = async (postId: string) => {
    await fetch(api('/api/app/community/posts/' + postId + '/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    load(1)
  }

  const addComment = async (postId: string) => {
    const text = commentText[postId]
    if (!text || !text.trim()) return
    await fetch(api('/api/app/community/posts/' + postId + '/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, content: text }),
    })
    setCommentText(prev => ({ ...prev, [postId]: '' }))
    load(1)
  }

  const deleteComment = async (id: string) => {
    await fetch(api('/api/app/community/comments/' + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isAdmin: user.role === 'admin' }),
    })
    load(1)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="hero-purple rounded-2xl p-5 text-white shadow-lg">
        <Users className="h-5 w-5 mb-1" />
        <h2 className="text-lg font-medium">Community</h2>
        <p className="text-purple-100 text-sm font-normal">Posts, comments & likes</p>
      </div>

      <Card className="glass-card">
        <CardContent className="p-3">
          <p className="text-xs text-gray-500 font-normal">
            Community Rules: Be respectful, no spam, follow guidelines.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="Write something..."
            rows={3}
          />
          <Button
            size="sm"
            className="hero-blue text-white"
            onClick={createPost}
            disabled={posting || !newPost.trim()}
          >
            <Send className="mr-1 h-4 w-4" />
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <p className="text-center text-gray-400 py-8 font-normal">No posts yet</p>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              commentText={commentText}
              setCommentText={setCommentText}
              onLike={toggleLike}
              onDeletePost={deletePost}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
            />
          ))}
          {hasMore && (
            <Button variant="outline" className="w-full font-normal" onClick={() => { setPage(p => p + 1); load(page + 1) }}>
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function PostCard({ post, user, commentText, setCommentText, onLike, onDeletePost, onAddComment, onDeleteComment }: any) {
  const liked = post.likes?.some((l: any) => l.userId === user.id)

  return (
    <Card className="glass-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold">
              {post.user?.name?.[0]}
            </div>
            <div>
              <p className="font-medium text-sm">{post.user?.name}</p>
              <p className="text-xs text-gray-400 font-normal">
                {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
            {post.user?.role === 'admin' && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">Admin</Badge>
            )}
          </div>
          {(post.userId === user.id || user.role === 'admin') && (
            <Button variant="ghost" size="sm" onClick={() => onDeletePost(post.id)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          )}
        </div>

        <p className="text-sm font-normal whitespace-pre-wrap">{post.content}</p>

        <div className="flex items-center gap-4">
          <button
            className={'flex items-center gap-1 text-sm font-normal ' + (liked ? 'text-red-500' : 'text-gray-400')}
            onClick={() => onLike(post.id)}
          >
            <Heart className={'h-4 w-4 ' + (liked ? 'fill-red-500' : '')} />
            {post.likes?.length || 0}
          </button>
          <span className="flex items-center gap-1 text-sm text-gray-400 font-normal">
            <MessageCircle className="h-4 w-4" />
            {post.comments?.length || 0}
          </span>
        </div>

        {post.comments?.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            {post.comments
              .filter((c: any) => !c.parentId)
              .map((comment: any) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold">
                    {comment.user?.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs font-medium">{comment.user?.name}</p>
                      <p className="text-sm font-normal">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 font-normal">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                      {(comment.userId === user.id || user.role === 'admin') && (
                        <button className="text-xs text-red-400" onClick={() => onDeleteComment(comment.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={commentText[post.id] || ''}
            onChange={e => setCommentText((prev: any) => ({ ...prev, [post.id]: e.target.value }))}
            placeholder="Write a comment..."
            className="text-sm"
            onKeyDown={e => { if (e.key === 'Enter') onAddComment(post.id) }}
          />
          <Button size="sm" variant="ghost" onClick={() => onAddComment(post.id)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
