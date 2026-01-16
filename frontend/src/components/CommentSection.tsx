import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchComments, createComment, deleteComment, likeComment, dislikeComment } from '../api'
import type { Comment, User } from '../types'

// Elegant relative time
function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

interface CommentSectionProps {
  postId: number
  currentUser: User | null
}

interface CommentItemProps {
  comment: Comment
  postId: number
  currentUser: User | null
  depth?: number
  onReply: (parentId: number, username: string) => void
  isReplying: boolean
  onSubmitReply: (content: string, parentId: number) => void
  onCancelReply: () => void
  replyPending: boolean
}

// Heart icon with animation
function HeartIcon({ filled, animating }: { filled: boolean; animating: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={`w-4 h-4 transition-transform ${animating ? 'scale-125' : ''}`}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CommentItem({
  comment,
  postId,
  currentUser,
  depth = 0,
  onReply,
  isReplying,
  onSubmitReply,
  onCancelReply,
  replyPending
}: CommentItemProps) {
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = useState('')
  const [showActions, setShowActions] = useState(false)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isReplying && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isReplying])

  const likeMutation = useMutation({
    mutationFn: () => likeComment(comment.id),
    onMutate: () => {
      setLikeAnimating(true)
      setTimeout(() => setLikeAnimating(false), 200)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
  })

  const dislikeMutation = useMutation({
    mutationFn: () => dislikeComment(comment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
  })

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (replyContent.trim()) {
      onSubmitReply(replyContent, comment.id)
      setReplyContent('')
    }
  }

  const isAuthor = currentUser?.id === comment.author.id
  const hasReplies = comment.replies && comment.replies.length > 0
  const maxDepth = 2 // Keep threads clean

  // Thread line colors based on depth
  const threadColors = ['#A855F7', '#3B82F6', '#10B981']
  const threadColor = threadColors[depth % threadColors.length]

  return (
    <div
      className={`relative ${depth > 0 ? 'ml-5' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Elegant thread line */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full opacity-30 hover:opacity-60 transition-opacity"
          style={{ backgroundColor: threadColor }}
        />
      )}

      <div className={`${depth > 0 ? 'pl-5' : ''} py-3`}>
        {/* Comment bubble */}
        <div className="group">
          {/* Author row */}
          <div className="flex items-center gap-2.5 mb-2">
            <Link to={`/user/${comment.author.username}`} className="shrink-0">
              <div
                className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[var(--accent)] transition-all duration-300"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                {comment.author.profile_image ? (
                  <img src={comment.author.profile_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: `linear-gradient(135deg, var(--accent) 0%, #A855F7 100%)`
                    }}
                  >
                    {comment.author.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/user/${comment.author.username}`}
                className="font-semibold text-[13px] hover:underline transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                {comment.author.username}
              </Link>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)'
                }}
              >
                {timeAgo(comment.created_at)}
              </span>
              {isAuthor && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--accent-alpha)',
                    color: 'var(--accent)'
                  }}
                >
                  You
                </span>
              )}
            </div>
          </div>

          {/* Comment content with elegant styling */}
          <div className="ml-[42px]">
            <p
              className="text-[14px] leading-[1.6] break-words"
              style={{ color: 'var(--text-primary)' }}
            >
              {comment.content}
            </p>

            {/* Actions bar - elegant and minimal */}
            <div
              className={`flex items-center gap-1 mt-2.5 transition-opacity duration-200 ${showActions || comment.likes_count > 0 ? 'opacity-100' : 'opacity-0'}`}
            >
              {/* Like button - heart for love */}
              <button
                onClick={() => likeMutation.mutate()}
                disabled={!currentUser || likeMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: comment.user_has_liked ? 'rgba(239, 68, 108, 0.12)' : 'transparent',
                  color: comment.user_has_liked ? '#EF446C' : 'var(--text-tertiary)'
                }}
              >
                <HeartIcon filled={comment.user_has_liked} animating={likeAnimating} />
                {comment.likes_count > 0 && (
                  <span className="min-w-[12px]">{comment.likes_count}</span>
                )}
              </button>

              {/* Reply button */}
              {currentUser && depth < maxDepth && (
                <button
                  onClick={() => onReply(comment.id, comment.author.username)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Reply
                </button>
              )}

              {/* More options */}
              {isAuthor && (
                <button
                  onClick={() => {
                    if (confirm('Delete this comment?')) {
                      deleteMutation.mutate()
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ml-auto"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Inline reply form - elegant animation */}
            {isReplying && (
              <form
                onSubmit={handleSubmitReply}
                className="mt-3 animate-slideInFromBottom"
              >
                <div
                  className="relative rounded-2xl overflow-hidden transition-all focus-within:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    '--tw-ring-color': 'var(--accent)'
                  } as React.CSSProperties}
                >
                  <textarea
                    ref={textareaRef}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to @${comment.author.username}...`}
                    className="w-full p-3 pb-12 text-[14px] resize-none bg-transparent outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    rows={2}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onCancelReply}
                      className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || replyPending}
                      className="px-4 py-1.5 text-white rounded-full text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      {replyPending ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Posting
                        </span>
                      ) : 'Reply'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Nested replies with elegant animation */}
        {hasReplies && (
          <div className="mt-1">
            {comment.replies!.map((reply, index) => (
              <div
                key={reply.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CommentItem
                  comment={reply}
                  postId={postId}
                  currentUser={currentUser}
                  depth={depth + 1}
                  onReply={onReply}
                  isReplying={false}
                  onSubmitReply={onSubmitReply}
                  onCancelReply={onCancelReply}
                  replyPending={replyPending}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommentSection({ postId, currentUser }: CommentSectionProps) {
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: number; username: string } | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Curated emoji set for quick reactions
  const quickEmojis = ['😀', '😂', '🥰', '😍', '🔥', '👏', '💯', '🎉', '❤️', '👀', '🤔', '😮', '🙌', '✨', '💪', '🚀']

  const { data: comments = [], isLoading, isError } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
  })

  const createMutation = useMutation({
    mutationFn: (data: { content: string; parent?: number }) =>
      createComment({ post: postId, content: data.content, parent: data.parent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      setNewComment('')
      setReplyingTo(null)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      createMutation.mutate({ content: newComment })
    }
  }

  const handleReply = (content: string, parentId: number) => {
    createMutation.mutate({ content, parent: parentId })
  }

  const totalComments = comments.reduce((acc, comment) => {
    return acc + 1 + (comment.replies?.length || 0)
  }, 0)

  if (isError) {
    return (
      <div className="text-center py-12">
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7" style={{ color: 'var(--danger)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Unable to load comments</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header - Clean and minimal */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Comments
          </h3>
          {totalComments > 0 && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, #A855F7 100%)',
                color: 'white'
              }}
            >
              {totalComments}
            </span>
          )}
        </div>
      </div>

      {/* Premium comment composer */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div
            className={`flex gap-3 p-4 rounded-2xl transition-all duration-300 ${isFocused ? 'ring-2' : ''}`}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              '--tw-ring-color': 'var(--accent)'
            } as React.CSSProperties}
          >
            <div className="shrink-0">
              <div
                className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-transparent"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                {currentUser.profile?.image ? (
                  <img src={currentUser.profile.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent) 0%, #A855F7 100%)'
                    }}
                  >
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Share your thoughts..."
                className="w-full bg-transparent text-[14px] resize-none outline-none placeholder:text-[var(--text-tertiary)]"
                style={{ color: 'var(--text-primary)' }}
                rows={isFocused || newComment ? 3 : 1}
              />

              {/* Action bar - appears when focused */}
              <div
                className={`flex items-center justify-between mt-3 pt-3 transition-all duration-300 ${isFocused || newComment ? 'opacity-100 border-t' : 'opacity-0 h-0 overflow-hidden'}`}
                style={{ borderColor: 'var(--border-light)' }}
              >
                <div className="flex items-center gap-2 relative">
                  {/* Emoji picker */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-full transition-all ${showEmojiPicker ? 'bg-[var(--accent-alpha)]' : ''}`}
                    style={{ color: showEmojiPicker ? 'var(--accent)' : 'var(--text-tertiary)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2} strokeLinecap="round" />
                      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2} strokeLinecap="round" />
                    </svg>
                  </button>

                  {/* Emoji dropdown */}
                  {showEmojiPicker && (
                    <div
                      className="absolute bottom-full left-0 mb-2 p-2 rounded-2xl shadow-lg animate-slideInFromBottom grid grid-cols-8 gap-1 z-10"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                    >
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setNewComment(prev => prev + emoji)
                            setShowEmojiPicker(false)
                            textareaRef.current?.focus()
                          }}
                          className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-[var(--bg-tertiary)] hover:scale-110 transition-all"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!newComment.trim() || createMutation.isPending}
                  className="px-5 py-2 text-white rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background: newComment.trim()
                      ? 'linear-gradient(135deg, var(--accent) 0%, #A855F7 100%)'
                      : 'var(--text-tertiary)'
                  }}
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Posting...
                    </span>
                  ) : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div
          className="mb-8 p-5 rounded-2xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid var(--border-light)'
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Link
              to="/login"
              className="font-semibold hover:underline"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Sign in
            </Link>
            {' '}to join the conversation
          </p>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-10 h-10" style={{ color: 'var(--text-tertiary)' }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Start the conversation
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Be the first to share your thoughts
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <CommentItem
                comment={comment}
                postId={postId}
                currentUser={currentUser}
                onReply={(id, username) => setReplyingTo({ id, username })}
                isReplying={replyingTo?.id === comment.id}
                onSubmitReply={handleReply}
                onCancelReply={() => setReplyingTo(null)}
                replyPending={createMutation.isPending}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
