import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useQuery } from '@tanstack/react-query'
import { fetchLivestreams } from '../api'
import { useFollow } from '../hooks/useFollow'

interface MobileMenuSheetProps {
  open: boolean
  onClose: () => void
}

interface UserStats {
  username: string
  profile_image: string | null
  posts_count: number
  karma: number
  followers_count: number
  following_count: number
}

interface SuggestedUser {
  id: number
  username: string
  first_name: string
  last_name: string
  profile_image: string | null
  followers_count: number
}

async function fetchUserStats(): Promise<UserStats> {
  const res = await fetch('/api/stats/', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

async function fetchSuggestions(): Promise<SuggestedUser[]> {
  const res = await fetch('/api/suggestions/', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch suggestions')
  return res.json()
}

export default function MobileMenuSheet({ open, onClose }: MobileMenuSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'quick' | 'trending' | 'people' | 'live'>('quick')

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[70] md:hidden rounded-t-3xl overflow-hidden animate-slideUp"
        style={{ 
          backgroundColor: 'var(--bg-primary)',
          maxHeight: '85vh',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        </div>
        
        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Menu</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'quick', label: 'Quick Access', icon: '⚡' },
            { id: 'trending', label: 'Trending', icon: '🔥' },
            { id: 'people', label: 'People', icon: '👥' },
            { id: 'live', label: 'Live Now', icon: '📺' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-all"
              style={{ 
                backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="px-4 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {activeTab === 'quick' && <QuickAccessContent onClose={onClose} />}
          {activeTab === 'trending' && <TrendingContent onClose={onClose} />}
          {activeTab === 'people' && <PeopleContent onClose={onClose} />}
          {activeTab === 'live' && <LiveContent onClose={onClose} />}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}

function QuickAccessContent({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const currentTab = searchParams.get('tab') || 'foryou'
  const currentPath = location.pathname

  const { data: stats } = useQuery({
    queryKey: ['userStats'],
    queryFn: fetchUserStats,
    enabled: !!user,
    staleTime: 30000,
  })

  const navItems = [
    { icon: '🏠', label: 'Home', href: '/', isActive: currentPath === '/' && !searchParams.get('tab') },
    { icon: '🔥', label: 'Hot Posts', href: '/?tab=hot', isActive: currentTab === 'hot' },
    { icon: '✨', label: 'Fresh Posts', href: '/?tab=fresh', isActive: currentTab === 'fresh' },
    { icon: '📺', label: 'Go Live', href: '/live', isActive: currentPath === '/live' },
    { icon: '🔍', label: 'Explore', href: '/explore', isActive: currentPath === '/explore' },
    { icon: '📝', label: 'Create Post', href: '/posts/new', isActive: currentPath === '/posts/new' },
    { icon: '👤', label: 'My Profile', href: user ? `/user/${user.username}` : '/login', isActive: false },
    { icon: '⚙️', label: 'Settings', href: '/settings', isActive: currentPath === '/settings' },
    { icon: 'ℹ️', label: 'About', href: '/about', isActive: currentPath === '/about' },
  ]

  const handleClick = (href: string) => {
    navigate(href)
    onClose()
  }

  return (
    <div className="space-y-4">
      {/* User Stats (if logged in) */}
      {user && stats && (
        <div 
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <Link to={`/user/${user.username}`} onClick={onClose} className="flex items-center gap-3 mb-4">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {stats.profile_image ? (
                <img src={stats.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.username}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>View profile</p>
            </div>
          </Link>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.posts_count}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Posts</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{stats.karma}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Karma</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{stats.followers_count}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Followers</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation Links */}
      <div className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleClick(item.href)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
            style={{ 
              backgroundColor: item.isActive ? 'var(--accent-alpha)' : 'transparent',
              color: item.isActive ? 'var(--accent)' : 'var(--text-primary)'
            }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
            {item.isActive && (
              <span className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function TrendingContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  
  const topics = [
    { tag: 'react', posts: 234, hot: true },
    { tag: 'typescript', posts: 189, hot: true },
    { tag: 'webdev', posts: 156, hot: false },
    { tag: 'design', posts: 98, hot: false },
    { tag: 'ai', posts: 87, hot: true },
    { tag: 'mobile', posts: 76, hot: false },
    { tag: 'python', posts: 65, hot: false },
    { tag: 'javascript', posts: 54, hot: true },
  ]

  const handleClick = (tag: string) => {
    navigate(`/?search=${tag}`)
    onClose()
  }

  return (
    <div className="space-y-2">
      <p className="text-sm px-1 mb-3" style={{ color: 'var(--text-tertiary)' }}>
        See what's trending right now
      </p>
      {topics.map((topic) => (
        <button
          key={topic.tag}
          onClick={() => handleClick(topic.tag)}
          className="w-full flex items-center justify-between p-4 rounded-xl transition-all active:scale-[0.98]"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>#</span>
            <div className="text-left">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{topic.tag}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{topic.posts} posts</p>
            </div>
          </div>
          {topic.hot && (
            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#FF6B3520', color: '#FF6B35' }}>
              🔥 Hot
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function PeopleContent({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isFollowing, toggleFollow, isLoading: followLoading } = useFollow()

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    staleTime: 60000,
  })

  const colors = ['#FF6B35', '#A855F7', '#3B82F6', '#10B981', '#F59E0B']

  const handleProfileClick = (username: string) => {
    navigate(`/user/${username}`)
    onClose()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm px-1 mb-3" style={{ color: 'var(--text-tertiary)' }}>
        People you might want to follow
      </p>
      {suggestions && suggestions.length > 0 ? (
        suggestions.map((s, i) => {
          const following = isFollowing(s.username)
          
          return (
            <div 
              key={s.username}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <button 
                onClick={() => handleProfileClick(s.username)}
                className="flex items-center gap-3 text-left"
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                  style={{ backgroundColor: colors[i % colors.length] }}
                >
                  {s.profile_image ? (
                    <img src={s.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    s.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {s.first_name || s.username}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    @{s.username} · {s.followers_count} followers
                  </p>
                </div>
              </button>
              {user && (
                <button
                  onClick={() => toggleFollow(s.username)}
                  disabled={followLoading}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{ 
                    backgroundColor: following ? 'var(--bg-primary)' : 'var(--accent)', 
                    color: following ? 'var(--text-primary)' : 'white' 
                  }}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          )
        })
      ) : (
        <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          No suggestions available
        </p>
      )}
      
      <button
        onClick={() => { navigate('/explore'); onClose() }}
        className="w-full py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}
      >
        Discover more people →
      </button>
    </div>
  )
}

function LiveContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()

  const { data: liveStreams = [], isLoading } = useQuery({
    queryKey: ['liveStreams', 'mobile-menu'],
    queryFn: () => fetchLivestreams('live'),
    refetchInterval: 10000,
  })

  const handleStreamClick = (id: number) => {
    navigate(`/live/${id}`)
    onClose()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {liveStreams.length > 0 ? (
        <>
          <p className="text-sm px-1 mb-3" style={{ color: 'var(--text-tertiary)' }}>
            {liveStreams.length} live now
          </p>
          {liveStreams.map(stream => (
            <button
              key={stream.id}
              onClick={() => handleStreamClick(Number(stream.id))}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] text-left"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="relative">
                <img 
                  src={stream.host.profile_image || '/default-avatar.png'} 
                  alt={stream.host.username}
                  className="w-12 h-12 rounded-full object-cover"
                  style={{ border: '3px solid #FF3B30' }}
                />
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold rounded text-white" style={{ backgroundColor: '#FF3B30' }}>
                  LIVE
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {stream.title}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  @{stream.host.username}
                </p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <span className="text-sm">👁</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {stream.viewer_count}
                </span>
              </div>
            </button>
          ))}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">📺</p>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No live streams</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Be the first to go live!</p>
        </div>
      )}
      
      <button
        onClick={() => { navigate('/live'); onClose() }}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: '#FF3B30' }}
      >
        🎬 Go to Live page
      </button>
    </div>
  )
}
