'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'
import { format, parseISO } from 'date-fns'
import PlayerQuickActions from '@/components/social/PlayerQuickActions'

type Author = { id: string; name: string | null; image: string | null }
type Post = {
  id: string
  author_id: string
  body: string
  pinned: boolean
  created_at: string
  author: Author | null
  comment_count: number
  reactions: { like: number; celebrate: number; fire: number }
  my_reaction: string | null
}

type CommentRow = {
  id: string
  parent_id: string | null
  author_id: string
  body: string
  created_at: string
  author: Author | null
}

const EMOJI_LABEL: Record<string, string> = {
  like: '👍',
  celebrate: '🎉',
  fire: '🔥',
}

export default function GroupFeed({
  groupId,
  isMember,
  viewerId,
  canModerate,
}: {
  groupId: string
  isMember: boolean
  viewerId: string | null
  canModerate: boolean
}) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [composer, setComposer] = useState('')
  const [posting, setPosting] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentRow[]>>({})
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({})
  const [savingComment, setSavingComment] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    if (!isMember) {
      setPosts([])
      setLoading(false)
      return
    }
    const res = await fetch(`/api/groups/${groupId}/posts`, { credentials: 'include' })
    if (!res.ok) {
      setPosts([])
      setLoading(false)
      return
    }
    const j = await res.json()
    setPosts(j.posts ?? [])
    setLoading(false)
  }, [groupId, isMember])

  const loadComments = useCallback(async (postId: string) => {
    const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
      credentials: 'include',
    })
    if (!res.ok) return
    const j = await res.json()
    setCommentsByPost((prev) => ({ ...prev, [postId]: j.comments ?? [] }))
  }, [groupId])

  useEffect(() => {
    setLoading(true)
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    if (!isMember) return
    const supabase = createBrowserClient()
    const ch = supabase
      .channel(`group_feed:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_posts', filter: `group_id=eq.${groupId}` },
        () => loadPosts()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [groupId, isMember, loadPosts])

  const openCommentPostIds = useMemo(
    () =>
      Object.entries(expanded)
        .filter(([, on]) => on)
        .map(([pid]) => pid)
        .sort()
        .join(','),
    [expanded]
  )

  useEffect(() => {
    if (!isMember || !openCommentPostIds) return
    const postIds = openCommentPostIds.split(',').filter(Boolean)
    if (postIds.length === 0) return
    const supabase = createBrowserClient()
    const channels = postIds.map((postId) => {
      const ch = supabase.channel(`group_comments:${groupId}:${postId}`)
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_post_comments', filter: `post_id=eq.${postId}` },
        () => loadComments(postId)
      )
      ch.subscribe()
      return ch
    })
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [openCommentPostIds, groupId, isMember, loadComments])

  const submitPost = async () => {
    const t = composer.trim()
    if (!t || posting) return
    setPosting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: t }),
      })
      if (!res.ok) return
      setComposer('')
      await loadPosts()
    } finally {
      setPosting(false)
    }
  }

  const toggleReaction = async (postId: string, emoji: 'like' | 'celebrate' | 'fire') => {
    const res = await fetch(`/api/groups/${groupId}/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emoji }),
    })
    if (!res.ok) return
    const j = await res.json()
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, reactions: j.reactions, my_reaction: j.my_reaction }
          : p
      )
    )
  }

  const toggleExpand = async (postId: string) => {
    setExpanded((e) => ({ ...e, [postId]: !e[postId] }))
    if (!commentsByPost[postId]) await loadComments(postId)
  }

  const submitComment = async (postId: string) => {
    const key = postId
    const text = (commentDraft[key] || '').trim()
    if (!text || savingComment) return
    setSavingComment(postId)
    try {
      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          body: text,
          parent_id: replyTo[postId] ?? null,
        }),
      })
      if (!res.ok) return
      setCommentDraft((d) => ({ ...d, [key]: '' }))
      setReplyTo((r) => ({ ...r, [postId]: null }))
      await loadComments(postId)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
        )
      )
    } finally {
      setSavingComment(null)
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    const res = await fetch(`/api/groups/${groupId}/posts/${postId}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) await loadPosts()
  }

  const togglePin = async (postId: string, pinned: boolean) => {
    const res = await fetch(`/api/groups/${groupId}/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pinned: !pinned }),
    })
    if (res.ok) await loadPosts()
  }

  if (!isMember) {
    return (
      <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 text-stone text-sm">
        Join the group to see and post on the wall.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-stone-soft/50 animate-pulse" />
        <div className="h-32 rounded-2xl bg-stone-soft/50 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-4 md:p-5">
        <label htmlFor="feed-composer" className="block text-sm font-bold text-ink mb-2">
          Share with the group
        </label>
        <textarea
          id="feed-composer"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white resize-none"
          placeholder="Match results, court ideas, questions…"
        />
        <button
          type="button"
          onClick={submitPost}
          disabled={posting || !composer.trim()}
          className="mt-3 btn-premium w-full sm:w-auto min-h-[44px] px-6 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>

      {posts.length === 0 && (
        <p className="text-stone text-sm text-center py-8">No posts yet. Start the conversation.</p>
      )}

      {posts.map((p) => (
        <article
          key={p.id}
          className={`bg-white rounded-2xl border shadow-sm p-4 md:p-5 ${
            p.pinned ? 'border-terracotta/40 ring-1 ring-terracotta/15' : 'border-stone-soft'
          }`}
        >
          {p.pinned && (
            <span className="inline-block mb-2 px-2.5 py-1 text-xs font-semibold bg-terracotta/10 text-terracotta rounded-lg border border-terracotta/25">
              Pinned
            </span>
          )}
          <div className="flex items-start gap-3">
            {p.author?.image ? (
              <img src={p.author.image} alt="" className="w-11 h-11 rounded-full object-cover border border-stone-soft shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-terracotta/15 flex items-center justify-center text-terracotta font-semibold shrink-0">
                {(p.author?.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="font-semibold text-ink">{p.author?.name || 'Member'}</p>
                  <p className="text-xs text-stone">{format(parseISO(p.created_at), 'MMM d · h:mm a')}</p>
                  {viewerId && p.author_id !== viewerId && (
                    <PlayerQuickActions userId={p.author_id} compact />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canModerate && (
                    <button
                      type="button"
                      onClick={() => togglePin(p.id, p.pinned)}
                      className="min-h-[44px] px-3 text-xs font-semibold text-terracotta border border-terracotta/30 rounded-xl hover:bg-terracotta/10"
                    >
                      {p.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                  {viewerId && p.author_id === viewerId && (
                    <button
                      type="button"
                      onClick={() => deletePost(p.id)}
                      className="min-h-[44px] px-3 text-xs font-semibold text-stone border border-stone-soft rounded-xl hover:bg-beige"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p className="text-ink whitespace-pre-wrap mt-2 text-[15px] leading-relaxed">{p.body}</p>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {(['like', 'celebrate', 'fire'] as const).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => toggleReaction(p.id, em)}
                    className={`min-h-[44px] px-3 rounded-xl border text-sm font-medium inline-flex items-center gap-1.5 ${
                      p.my_reaction === em
                        ? 'bg-terracotta/15 border-terracotta/40 text-ink'
                        : 'bg-beige/50 border-stone-soft text-stone hover:bg-beige'
                    }`}
                  >
                    <span aria-hidden>{EMOJI_LABEL[em]}</span>
                    <span>{p.reactions[em]}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => toggleExpand(p.id)}
                  className="min-h-[44px] px-4 rounded-xl border border-stone-soft bg-white text-sm font-semibold text-ink hover:bg-beige"
                >
                  {expanded[p.id] ? 'Hide' : 'Comments'} ({p.comment_count})
                </button>
              </div>

              {expanded[p.id] && (
                <div className="mt-4 pt-4 border-t border-stone-soft space-y-3">
                  {(commentsByPost[p.id] ?? []).map((c) => (
                    <div
                      key={c.id}
                      className={c.parent_id ? 'pl-4 border-l-2 border-stone-soft' : ''}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-ink">{c.author?.name || 'Member'}</p>
                          <p className="text-sm text-ink whitespace-pre-wrap mt-0.5">{c.body}</p>
                          {viewerId && c.author_id !== viewerId && (
                            <PlayerQuickActions userId={c.author_id} compact />
                          )}
                          <button
                            type="button"
                            className="text-xs text-terracotta font-medium mt-1 min-h-[40px] px-0"
                            onClick={() =>
                              setReplyTo((r) => ({ ...r, [p.id]: r[p.id] === c.id ? null : c.id }))
                            }
                          >
                            {replyTo[p.id] === c.id ? 'Cancel reply' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {replyTo[p.id] && (
                    <p className="text-xs text-stone">Replying to thread — your comment will nest under that reply.</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={commentDraft[p.id] ?? ''}
                      onChange={(e) =>
                        setCommentDraft((d) => ({ ...d, [p.id]: e.target.value }))
                      }
                      placeholder="Write a comment…"
                      className="flex-1 min-h-[44px] px-4 border-2 border-terracotta/30 rounded-xl text-ink bg-white"
                    />
                    <button
                      type="button"
                      disabled={savingComment === p.id}
                      onClick={() => submitComment(p.id)}
                      className="min-h-[44px] px-5 btn-premium text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
