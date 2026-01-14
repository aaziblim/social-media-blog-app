import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchComments, createComment, deleteComment, likeComment, dislikeComment } from '../api'
import type { Comment, User } from '../types'

// Simple relative time function
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
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
  onReply: (parentId: number) => void
  replyingTo: number | null
  onCancelReply: () => void
}

function CommentItem({ comment, postId, currentUser, depth = 0, onReply, replyingTo, onCancelReply }: CommentItemProps) {
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = useState('')

  const likeMutation = useMutation({
    mutationFn: () => likeComment(comment.id),
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

  const replyMutation = useMutation({
    mutationFn: (content: string) => createComment({ post: postId, content, parent: comment.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      setReplyContent('')
      onCancelReply()
    },
    onError: (error) => {
      console.error('Failed to create reply:', error)
      alert('Failed to post reply. Please try again.')
    },
  })

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (replyContent.trim()) {
      replyMutation.mutate(replyContent)
    }
  }

  const score = comment.likes_count - comment.dislikes_count
  const isShowingReplyForm = replyingTo === comment.id

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-4' : ''}`} style={depth > 0 ? { borderLeft: '2px solid var(--border-light)' } : {}}>
      <div className="py-3">
        {/* Comment Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            {comment.author.profile_image ? (
              <img src={comment.author.profile_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--accent)' }}>
                {comment.author.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {comment.author.username}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            · {formatTimeAgo(comment.created_at)}
          </span>
        </div>

        {/* Comment Content */}
        <p className="text-sm leading-relaxed mb-2 pl-9" style={{ color: 'var(--text-primary)' }}>
          {comment.content}
        </p>

        {/* Comment Actions */}
        <div className="flex items-center gap-4 pl-9">
          {/* Vote Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => likeMutation.mutate()}
              disabled={!currentUser || likeMutation.isPending}
              className="p-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{ 
                backgroundColor: comment.user_has_liked ? 'rgba(52, 199, 89, 0.2)' : 'transparent',
                color: comment.user_has_liked ? 'var(--success)' : 'var(--text-secondary)'
              }}
              title="Upvote"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className="text-sm font-semibold min-w-[20px] text-center" style={{ 
              color: score > 0 ? 'var(--success)' : score < 0 ? 'var(--danger)' : 'var(--text-secondary)'
            }}>
              {score}
            </span>
            <button
              onClick={() => dislikeMutation.mutate()}
              disabled={!currentUser || dislikeMutation.isPending}
              className="p-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{ 
                backgroundColor: comment.user_has_disliked ? 'rgba(255, 59, 48, 0.2)' : 'transparent',
                color: comment.user_has_disliked ? 'var(--danger)' : 'var(--text-secondary)'
              }}
              title="Downvote"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Reply Button */}
          {currentUser && depth < 3 && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Reply
            </button>
          )}

          {/* Delete Button (for comment author) */}
          {currentUser && currentUser.id === comment.author.id && (
            <button
              onClick={() => {
                if (confirm('Delete this comment?')) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
              className="text-xs font-medium transition-colors disabled:opacity-50"
              style={{ color: 'var(--danger)' }}
            >
              Delete
            </button>
          )}
        </div>

        {/* Reply Form */}
        {isShowingReplyForm && (
          <form onSubmit={handleSubmitReply} className="mt-3 pl-9">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Reply to @${comment.author.username}...`}
              className="w-full p-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="submit"
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="px-4 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {replyMutation.isPending ? 'Posting...' : 'Reply'}
              </button>
              <button
                type="button"
                onClick={onCancelReply}
                className="px-4 py-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUser={currentUser}
              depth={depth + 1}
              onReply={onReply}
              replyingTo={replyingTo}
              onCancelReply={onCancelReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ postId, currentUser }: CommentSectionProps) {
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)

  const { data: comments = [], isLoading, isError } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
  })

  const createMutation = useMutation({
    mutationFn: (content: string) => createComment({ post: postId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      setNewComment('')
    },
    onError: (error) => {
      console.error('Failed to create comment:', error)
      alert('Failed to post comment. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      createMutation.mutate(newComment)
    }
  }

  const totalComments = comments.reduce((acc, comment) => {
    return acc + 1 + (comment.replies_count || 0)
  }, 0)

  if (isError) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--danger)' }}>Failed to load comments</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Discussion
        </h3>
        <span className="px-2.5 py-0.5 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          {totalComments}
        </span>
      </div>

      {/* New Comment Form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              {currentUser.profile?.image ? (
                <img src={currentUser.profile.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'var(--accent)' }}>
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full p-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim() || createMutation.isPending}
                  className="px-5 py-2 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Posting...
                    </span>
                  ) : (
                    'Comment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <a href="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Sign in</a> to join the discussion
          </p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUser={currentUser}
              onReply={(parentId) => setReplyingTo(parentId)}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
