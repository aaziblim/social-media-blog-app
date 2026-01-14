import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPosts, likePost, dislikePost } from '../api'
import { useAuth } from '../AuthContext'
import type { Paginated, Post } from '../types'

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function readingTime(text: string): string | null {
  const words = text.trim().split(/\s+/).length
  if (words < 50) return null
  const minutes = Math.ceil(words / 200)
  return `${minutes} min read`
}

// Simulated "active viewers" - in production this would be from websockets
function useActiveViewers() {
  const [count, setCount] = useState(Math.floor(Math.random() * 50) + 10)
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => Math.max(5, prev + Math.floor(Math.random() * 7) - 3))
    }, 8000)
    return () => clearInterval(interval)
  }, [])
  return count
}

type FilterTab = 'foryou' | 'fresh' | 'hot'

// ============ SORTING ALGORITHMS ============

// Calculate "hotness" score using Reddit-style algorithm
// Combines engagement (likes - dislikes) with time decay
function getHotScore(post: Post): number {
  const score = post.likes_count - post.dislikes_count
  const ageHours = (Date.now() - new Date(post.date_posted).getTime()) / (1000 * 60 * 60)
  // Logarithmic score boost + time decay (posts lose ~50% hotness every 12 hours)
  const logScore = score > 0 ? Math.log10(Math.max(score, 1)) : -Math.log10(Math.abs(score) + 1)
  const timePenalty = Math.pow(0.5, ageHours / 12)
  return (logScore + 1) * timePenalty * 1000
}

// Calculate "For You" score - personalized relevance
// Factors: recency, engagement rate, content length, comments activity
function getForYouScore(post: Post): number {
  const ageHours = (Date.now() - new Date(post.date_posted).getTime()) / (1000 * 60 * 60)
  const totalVotes = post.likes_count + post.dislikes_count
  
  // Engagement rate (upvote ratio) - higher is better
  const engagementRate = totalVotes > 0 ? post.likes_count / totalVotes : 0.5
  
  // Controversy boost - posts with mixed votes are interesting
  const controversyScore = totalVotes > 5 
    ? 1 - Math.abs(engagementRate - 0.5) * 2 // Closer to 50/50 = more controversial
    : 0
  
  // Activity score - more comments = more discussion
  const activityScore = Math.log10(Math.max(post.comments_count || 1, 1) + 1)
  
  // Freshness decay - prefer recent but not too aggressive
  const freshnessMultiplier = Math.max(0.3, 1 - (ageHours / 168)) // Decay over 1 week
  
  // Content quality signal - longer content might be higher quality
  const contentLength = post.content?.length || 0
  const qualityBoost = contentLength > 200 ? 1.2 : contentLength > 100 ? 1.1 : 1
  
  // Combine all factors
  const baseScore = (engagementRate * 40) + (controversyScore * 15) + (activityScore * 20) + (totalVotes * 0.5)
  return baseScore * freshnessMultiplier * qualityBoost
}

const VIBE_REACTIONS = [
  { emoji: '🔥', label: 'Fire', color: '#FF6B35' },
  { emoji: '💜', label: 'Love', color: '#A855F7' },
  { emoji: '🤯', label: 'Mind-blown', color: '#3B82F6' },
  { emoji: '😂', label: 'Funny', color: '#FBBF24' },
] as const

function PostCard({ 
  post, 
  onLike, 
  onDislike, 
  liking, 
  disliking, 
  isAuthenticated,
  isHot 
}: {
  post: Post
  onLike: () => void
  onDislike: () => void
  liking: boolean
  disliking: boolean
  isAuthenticated: boolean
  isHot?: boolean
}) {
  const [showVibes, setShowVibes] = useState(false)
  const [selectedVibe, setSelectedVibe] = useState<number | null>(null)
  const readTime = readingTime(post.content)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isAuthenticated && !liking && !disliking) {
      onLike()
    }
  }

  const handleDislike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isAuthenticated && !liking && !disliking) {
      onDislike()
    }
  }

  const handleVibe = (index: number) => {
    setSelectedVibe(selectedVibe === index ? null : index)
    setShowVibes(false)
  }

  return (
    <article 
      className="rounded-3xl overflow-hidden transition-all duration-300 hover:translate-y-[-4px] group"
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        boxShadow: 'var(--card-shadow)'
      }}
    >
      {/* ===== TOP: Profile Header ===== */}
      <div className="p-4 pb-3 flex items-center gap-3">
        <Link to={`/user/${post.author.username}`} className="relative shrink-0">
          <div 
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-offset-2 transition-transform group-hover:scale-105"
            style={{ 
              backgroundColor: 'var(--bg-tertiary)',
              '--tw-ring-color': isHot ? '#FF6B35' : 'var(--border-light)',
              '--tw-ring-offset-color': 'var(--bg-primary)'
            } as React.CSSProperties}
          >
            {post.author.profile_image ? (
              <img src={post.author.profile_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {post.author.username.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          {/* Online indicator */}
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{ 
              backgroundColor: 'var(--success)', 
              borderColor: 'var(--bg-primary)' 
            }}
          />
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link 
              to={`/user/${post.author.username}`} 
              className="font-semibold text-sm hover:underline truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {post.author.username}
            </Link>
            {isHot && (
              <span 
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
                style={{ backgroundColor: 'rgba(255, 107, 53, 0.15)', color: '#FF6B35' }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#FF6B35' }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: '#FF6B35' }} />
                </span>
                Hot
              </span>
            )}
            {!isHot && post.likes_count >= 5 && (
              <span 
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: 'var(--accent-alpha)', color: 'var(--accent)' }}
              >
                Popular
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span>{timeAgo(post.date_posted)}</span>
            {readTime && (
              <>
                <span className="opacity-50">•</span>
                <span>{readTime}</span>
              </>
            )}
          </div>
        </div>

        {/* More options */}
        <button 
          type="button"
          className="p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* ===== MIDDLE: Media (Image or Video) ===== */}
      {(post.post_image_url || post.post_video_url) && (
        <Link to={`/posts/${post.slug || post.public_id || post.id}`} className="block relative">
          <div 
            className="overflow-hidden relative"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            {post.post_video_url ? (
              <>
                <video 
                  src={post.post_video_url}
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause()
                    e.currentTarget.currentTime = 0
                  }}
                  className="w-full max-h-[520px] object-cover"
                />
                {/* Video indicator */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Video
                </div>
              </>
            ) : post.post_image_url ? (
              <img 
                src={post.post_image_url} 
                alt="" 
                className="w-full max-h-[520px] object-cover transition-transform duration-500 group-hover:scale-[1.02]" 
              />
            ) : null}
          </div>
        </Link>
      )}

      {/* ===== BOTTOM: Content & Actions ===== */}
      <div className="p-4 pt-3">
        {/* Quick Actions Row - Compact */}
        <div className="flex items-center gap-0.5 mb-3">
          {/* Like */}
          <button 
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95"
            style={{ 
              backgroundColor: post.user_has_liked ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
              color: post.user_has_liked ? 'var(--success)' : 'var(--text-secondary)',
              opacity: !isAuthenticated || liking || disliking ? 0.5 : 1
            }}
            title={!isAuthenticated ? 'Sign in to like' : post.user_has_liked ? 'Unlike' : 'Like'}
          >
            <svg viewBox="0 0 24 24" fill={post.user_has_liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            {post.likes_count > 0 && <span>{post.likes_count}</span>}
          </button>

          {/* Dislike */}
          <button 
            type="button"
            onClick={handleDislike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95"
            style={{ 
              backgroundColor: post.user_has_disliked ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              color: post.user_has_disliked ? 'var(--danger)' : 'var(--text-secondary)',
              opacity: !isAuthenticated || liking || disliking ? 0.5 : 1
            }}
            title={!isAuthenticated ? 'Sign in to dislike' : post.user_has_disliked ? 'Remove dislike' : 'Dislike'}
          >
            <svg viewBox="0 0 24 24" fill={post.user_has_disliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
            {post.dislikes_count > 0 && <span>{post.dislikes_count}</span>}
          </button>

          {/* Comment */}
          <Link 
            to={`/posts/${post.slug || post.public_id || post.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {post.comments_count > 0 && <span>{post.comments_count}</span>}
          </Link>

          {/* Vibe Reaction */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => isAuthenticated && setShowVibes(!showVibes)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: selectedVibe !== null ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-secondary)',
                opacity: !isAuthenticated ? 0.5 : 1
              }}
              title={!isAuthenticated ? 'Sign in to react' : 'Add vibe'}
            >
              {selectedVibe !== null ? (
                <span className="text-base">{VIBE_REACTIONS[selectedVibe].emoji}</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2} strokeLinecap="round" />
                  <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2} strokeLinecap="round" />
                </svg>
              )}
            </button>
            {showVibes && (
              <div 
                className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 rounded-2xl shadow-xl z-10 animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
              >
                {VIBE_REACTIONS.map((vibe, i) => (
                  <button
                    key={vibe.label}
                    onClick={() => handleVibe(i)}
                    className="p-2 rounded-xl hover:scale-125 transition-transform"
                    style={{ backgroundColor: selectedVibe === i ? vibe.color + '20' : 'transparent' }}
                    title={vibe.label}
                  >
                    <span className="text-xl">{vibe.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bookmark */}
          <button 
            type="button"
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Share */}
          <button 
            type="button"
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        </div>

        {/* Title & Content - Below Media */}
        {post.title && (
          <Link to={`/posts/${post.slug || post.public_id || post.id}`}>
            <h2 
              className="text-[17px] font-bold mb-1.5 hover:underline leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {post.title}
            </h2>
          </Link>
        )}

        <Link to={`/posts/${post.slug || post.public_id || post.id}`} className="block">
          <p 
            className="text-[15px] leading-relaxed whitespace-pre-wrap break-words line-clamp-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {post.content}
          </p>
        </Link>
      </div>
    </article>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get tab from URL or default to 'foryou'
  const urlTab = searchParams.get('tab')
  const activeTab: FilterTab = (urlTab === 'hot' || urlTab === 'fresh') ? urlTab : 'foryou'
  
  const setActiveTab = (tab: FilterTab) => {
    if (tab === 'foryou') {
      searchParams.delete('tab')
    } else {
      searchParams.set('tab', tab)
    }
    setSearchParams(searchParams)
  }
  
  const activeViewers = useActiveViewers()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['posts'], // Single cache for all tabs - sorting happens client-side
    queryFn: ({ pageParam = 1 }) => fetchPosts(pageParam),
    getNextPageParam: (lastPage: Paginated<Post>) => {
      if (!lastPage.next) return undefined
      const url = new URL(lastPage.next, window.location.origin)
      return Number(url.searchParams.get('page'))
    },
    initialPageParam: 1,
  })

  const updatePostInCache = (updated: Post) => {
    queryClient.setQueryData(['posts'], (old: { pages: Paginated<Post>[]; pageParams: number[] } | undefined) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map(page => ({
          ...page,
          results: page.results.map(p => p.id === updated.id ? updated : p)
        }))
      }
    })
  }

  const likeMutation = useMutation({
      mutationFn: likePost,
      onSuccess: updatePostInCache,
      onError: (err: any) => {
        console.error('Like failed:', err?.response?.data)
      },
    })

  const dislikeMutation = useMutation({
      mutationFn: dislikePost,
      onSuccess: updatePostInCache,
      onError: (err: any) => {
        console.error('Dislike failed:', err?.response?.data)
      },
    })

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  const posts = data?.pages.flatMap(p => p.results) ?? []

  // Track the stable order of post IDs to prevent re-sorting on like/dislike
  const sortOrderRef = useRef<{ tab: FilterTab; order: number[] } | null>(null)
  
  // Sort posts based on active tab - but maintain stable order after initial sort
  const sortedPosts = useMemo(() => {
    if (!posts.length) return []
    
    // Check if we need to re-sort (new tab or new posts loaded)
    const currentPostIds = posts.map(p => p.id).sort((a, b) => a - b).join(',')
    const cachedPostIds = sortOrderRef.current?.order?.slice().sort((a, b) => a - b).join(',')
    const needsResort = sortOrderRef.current?.tab !== activeTab || currentPostIds !== cachedPostIds
    
    if (!needsResort && sortOrderRef.current) {
      // Use cached order - just map IDs to current post data
      const postsMap = new Map(posts.map(p => [p.id, p]))
      return sortOrderRef.current.order
        .map(id => postsMap.get(id))
        .filter((p): p is Post => p !== undefined)
    }
    
    // Need to sort - calculate new order
    const sorted = [...posts].sort((a, b) => {
      if (activeTab === 'hot') {
        const scoreA = getHotScore(a)
        const scoreB = getHotScore(b)
        if (Math.abs(scoreB - scoreA) < 0.001) {
          return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
        }
        return scoreB - scoreA
      }
      if (activeTab === 'fresh') {
        return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
      }
      const scoreA = getForYouScore(a)
      const scoreB = getForYouScore(b)
      if (Math.abs(scoreB - scoreA) < 0.001) {
        return (b.likes_count - b.dislikes_count) - (a.likes_count - a.dislikes_count)
      }
      return scoreB - scoreA
    })
    
    // Cache the order
    sortOrderRef.current = { tab: activeTab, order: sorted.map(p => p.id) }
    
    return sorted
  }, [posts, activeTab])

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { 
      key: 'foryou', 
      label: 'For You',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
    },
    { 
      key: 'fresh', 
      label: 'Fresh',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    },
    { 
      key: 'hot', 
      label: 'Hot',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path d="M12 2c.5 2.5 2 4.5 4 6 2.5 2 4 5 4 8a8 8 0 1 1-16 0c0-3 1.5-6 4-8 2-1.5 3.5-3.5 4-6z" /></svg>
    },
  ]

  return (
    <div className="w-full">
      {/* Header section */}
      <div className="mb-6">
        {/* Live hangout indicator */}
        <div 
          className="flex items-center justify-between mb-4 py-3 px-4 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}
              />
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ color: 'var(--accent)' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                The Hangout
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="inline-flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--success)' }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--success)' }} />
                  </span>
                  {activeViewers} people here now
                </span>
              </p>
            </div>
          </div>
          
          {user && (
            <Link 
              to="/posts/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">Share something</span>
            </Link>
          )}
        </div>

        {/* Filter tabs */}
        <div 
          className="flex gap-2 p-1.5 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
              style={{ 
                backgroundColor: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: activeTab === tab.key ? 'var(--card-shadow)' : 'none'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}>
              <div className="aspect-[16/10] skeleton" />
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full skeleton" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 skeleton rounded" />
                    <div className="h-3 w-16 skeleton rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full skeleton rounded" />
                  <div className="h-4 w-3/4 skeleton rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
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
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Something went wrong
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            We couldn't load the feed. Try refreshing.
          </p>
        </div>
      ) : sortedPosts.length === 0 ? (
        <div 
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <div 
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10" style={{ color: 'var(--text-tertiary)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            The hangout is empty
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Be the first to start a conversation.
          </p>
          {user && (
            <Link 
              to="/posts/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create the first post
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {sortedPosts.map((post, index) => {
              // Determine if post is "hot" - top 3 posts with high engagement in Hot tab
              const isHotPost = activeTab === 'hot' && index < 3 && getHotScore(post) > 50
              // Show trending badge on For You for highly engaging recent posts
              const isTrending = activeTab === 'foryou' && getHotScore(post) > 100 && index < 5
              const postKey = post.slug || post.public_id
              
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => likeMutation.mutate(postKey)}
                  onDislike={() => dislikeMutation.mutate(postKey)}
                  liking={likeMutation.isPending && likeMutation.variables === postKey}
                  disliking={dislikeMutation.isPending && dislikeMutation.variables === postKey}
                  isAuthenticated={!!user}
                  isHot={isHotPost || isTrending}
                />
              )
            })}
          </div>

          <div ref={loadMoreRef} className="py-10 flex justify-center">
            {isFetchingNextPage && (
              <div 
                className="w-7 h-7 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
