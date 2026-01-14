import { useState, useEffect } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useQuery } from '@tanstack/react-query'
import { fetchLivestreams } from '../api'
import { useFollow } from '../hooks/useFollow'

// Types
interface SuggestedUser {
  id: number
  username: string
  first_name: string
  last_name: string
  profile_image: string | null
  followers_count: number
}

interface UserStats {
  username: string
  profile_image: string | null
  posts_count: number
  karma: number
  followers_count: number
  following_count: number
}

// API functions
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

// ==================== LEFT SIDEBAR ====================

export function LeftSidebar() {
  const { user } = useAuth()
  
  return (
    <aside className="hidden lg:block w-64 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pb-8">
      <div className="space-y-4">
        {/* User Stats Card (when logged in) */}
        {user && <UserStatsCard />}
        
        {/* Quick Navigation */}
        <QuickNav />
        
        {/* Your Streak */}
        {user && <StreakCard />}
        
        {/* Community Pulse */}
        <CommunityPulse />
      </div>
    </aside>
  )
}

function UserStatsCard() {
  const { user } = useAuth()
  
  const { data: stats } = useQuery({
    queryKey: ['userStats'],
    queryFn: fetchUserStats,
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  })

  if (!user) return null

  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <Link to={`/user/${user.username}`} className="flex items-center gap-3 mb-4 group">
        <div className="w-12 h-12 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          {(stats?.profile_image || user.profile?.image) ? (
            <img src={stats?.profile_image || user.profile?.image || ''} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: 'var(--accent)' }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-sm group-hover:underline" style={{ color: 'var(--text-primary)' }}>
            {user.username}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            View profile →
          </p>
        </div>
      </Link>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.posts_count ?? 0}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Posts</p>
        </div>
        <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--success)' }}>{stats?.karma ?? 0}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Karma</p>
        </div>
        <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{stats?.followers_count ?? 0}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Followers</p>
        </div>
      </div>
    </div>
  )
}

function QuickNav() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const currentTab = searchParams.get('tab') || 'foryou'
  const currentPath = location.pathname

  const navItems = [
    { icon: '🏠', label: 'Home', href: '/', isActive: currentPath === '/' && !searchParams.get('tab') },
    { icon: '🔥', label: 'Hot', href: '/?tab=hot', isActive: currentTab === 'hot' },
    { icon: '✨', label: 'Fresh', href: '/?tab=fresh', isActive: currentTab === 'fresh' },
    { icon: '📺', label: 'Live', href: '/live', isActive: currentPath === '/live' || currentPath.startsWith('/live/') },
    { icon: '🔍', label: 'Explore', href: '/explore', isActive: currentPath === '/explore' },
    { icon: '📝', label: 'Create Post', href: '/posts/new', isActive: currentPath === '/posts/new' },
  ]

  return (
    <div 
      className="p-3 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-2" style={{ color: 'var(--text-tertiary)' }}>
        Quick Access
      </p>
      <div className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:translate-x-1"
            style={{ 
              backgroundColor: item.isActive ? 'var(--accent-alpha)' : 'transparent',
              color: item.isActive ? 'var(--accent)' : 'var(--text-primary)'
            }}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
            {item.isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function StreakCard() {
  const { user } = useAuth()
  const [days, setDays] = useState([true, true, false, true, true, true, false])
  
  useEffect(() => {
    // Simulate streak data - in production would come from API
    const newDays = Array(7).fill(false).map(() => Math.random() > 0.3)
    newDays[6] = true // Today is always active if user is here
    setDays(newDays)
  }, [])

  if (!user) return null

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const currentStreak = days.filter(Boolean).length

  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          This Week
        </p>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B3520', color: '#FF6B35' }}>
          🔥 {currentStreak} day streak
        </span>
      </div>
      <div className="flex justify-between">
        {days.map((active, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div 
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${active ? 'scale-110' : ''}`}
              style={{ 
                backgroundColor: active ? '#FF6B35' : 'var(--bg-tertiary)',
                color: active ? 'white' : 'var(--text-tertiary)'
              }}
            >
              {active ? '✓' : dayLabels[i]}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{dayLabels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommunityPulse() {
  const [pulse, setPulse] = useState(75)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => Math.max(20, Math.min(100, prev + (Math.random() - 0.5) * 10)))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const getMood = () => {
    if (pulse > 80) return { emoji: '🔥', text: 'On Fire!', color: '#FF6B35' }
    if (pulse > 60) return { emoji: '✨', text: 'Vibing', color: '#A855F7' }
    if (pulse > 40) return { emoji: '😌', text: 'Chill', color: '#3B82F6' }
    return { emoji: '💤', text: 'Quiet', color: 'var(--text-tertiary)' }
  }

  const mood = getMood()

  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Community Pulse
      </p>
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl animate-pulse"
          style={{ backgroundColor: mood.color + '20' }}
        >
          {mood.emoji}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: mood.color }}>{Math.round(pulse)}%</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{mood.text}</span>
          </div>
          <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pulse}%`, backgroundColor: mood.color }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== RIGHT SIDEBAR ====================

export function RightSidebar() {
  return (
    <aside className="hidden xl:block w-72 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pb-8">
      <div className="space-y-4">
        {/* Trending Topics */}
        <TrendingTopics />
        
        {/* Who to Follow */}
        <WhoToFollow />
        
        {/* Live Activity */}
        <LiveActivity />
        
        {/* Footer Links */}
        <FooterLinks />
      </div>
    </aside>
  )
}

function TrendingTopics() {
  const topics = [
    { tag: 'react', posts: 234, hot: true },
    { tag: 'typescript', posts: 189, hot: true },
    { tag: 'webdev', posts: 156, hot: false },
    { tag: 'design', posts: 98, hot: false },
    { tag: 'ai', posts: 87, hot: true },
  ]

  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Trending Now
        </p>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#FF6B35' }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#FF6B35' }} />
        </span>
      </div>
      <div className="space-y-2">
        {topics.map((topic) => (
          <Link
            key={topic.tag}
            to={`/?search=${topic.tag}`}
            className="flex items-center justify-between p-2 rounded-xl transition-all hover:translate-x-1"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                #{topic.tag}
              </span>
              {topic.hot && <span className="text-xs">🔥</span>}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {topic.posts} posts
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function WhoToFollow() {
  const { user } = useAuth()
  const { isFollowing, toggleFollow, isLoading: followLoading } = useFollow()

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    staleTime: 60000, // 1 minute
  })

  const colors = ['#FF6B35', '#A855F7', '#3B82F6', '#10B981', '#F59E0B']

  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Who to Follow
      </p>
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeleton
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="space-y-1">
                  <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                  <div className="h-2 w-14 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                </div>
              </div>
              <div className="h-6 w-14 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            </div>
          ))
        ) : suggestions && suggestions.length > 0 ? (
          suggestions.map((suggestedUser, i) => {
            const following = isFollowing(suggestedUser.username)
            
            return (
              <div key={suggestedUser.username} className="flex items-center justify-between">
                <Link to={`/user/${suggestedUser.username}`} className="flex items-center gap-2 group">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  >
                    {suggestedUser.profile_image ? (
                      <img src={suggestedUser.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      suggestedUser.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium group-hover:underline" style={{ color: 'var(--text-primary)' }}>
                        {suggestedUser.first_name || suggestedUser.username}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      @{suggestedUser.username} · {suggestedUser.followers_count} followers
                    </span>
                  </div>
                </Link>
                {user && (
                  <button 
                    onClick={() => toggleFollow(suggestedUser.username)}
                    disabled={followLoading}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ 
                      backgroundColor: following ? 'var(--bg-tertiary)' : 'var(--accent)', 
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
          <p className="text-sm text-center py-2" style={{ color: 'var(--text-tertiary)' }}>
            No suggestions available
          </p>
        )}
      </div>
      {suggestions && suggestions.length > 0 && (
        <Link 
          to="/explore"
          className="block w-full mt-3 py-2 text-sm font-medium rounded-xl transition-all text-center"
          style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-tertiary)' }}
        >
          Show more
        </Link>
      )}
    </div>
  )
}

function LiveActivity() {
  const { data: liveStreams = [], isLoading } = useQuery({
    queryKey: ['liveStreams', 'sidebar'],
    queryFn: () => fetchLivestreams('live'),
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Show top 3 live streams
  const displayStreams = liveStreams.slice(0, 3)

  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Live Now
        </p>
        {displayStreams.length > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#FF3B30' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#FF3B30' }} />
          </span>
        )}
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : displayStreams.length > 0 ? (
          displayStreams.map((stream, i) => (
            <Link 
              key={stream.id} 
              to={`/live/${stream.id}`}
              className="flex items-center gap-3 py-2 px-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{ backgroundColor: i === 0 ? 'var(--bg-tertiary)' : 'transparent' }}
            >
              <div className="relative">
                <img 
                  src={stream.host.profile_image || '/default-avatar.png'} 
                  alt={stream.host.username}
                  className="w-9 h-9 rounded-full object-cover"
                  style={{ border: '2px solid #FF3B30' }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ backgroundColor: '#FF3B30', borderColor: 'var(--bg-primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  @{stream.host.username}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {stream.title}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">👁</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {stream.viewer_count}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              No live streams right now
            </p>
            <Link 
              to="/live" 
              className="text-xs font-medium mt-1 inline-block hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Be the first to go live →
            </Link>
          </div>
        )}
        {displayStreams.length > 0 && (
          <Link 
            to="/live" 
            className="block text-center text-xs font-medium pt-2 hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            See all live streams →
          </Link>
        )}
      </div>
    </div>
  )
}

function FooterLinks() {
  return (
    <div className="px-2 text-center">
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {['About', 'Terms', 'Privacy', 'Help'].map(link => (
          <Link 
            key={link} 
            to={link === 'About' ? '/about' : `/${link.toLowerCase()}`} 
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {link}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        © 2026 Sphere
      </p>
    </div>
  )
}
