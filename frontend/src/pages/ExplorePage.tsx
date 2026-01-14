import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../AuthContext'
import { useFollow } from '../hooks/useFollow'

interface ExploreUser {
  id: number
  username: string
  first_name: string
  last_name: string
  profile_image: string | null
  followers_count: number
  bio?: string
}

async function fetchAllUsers(): Promise<ExploreUser[]> {
  const res = await fetch('/api/explore/', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export default function ExplorePage() {
  const { user } = useAuth()
  const { isFollowing, toggleFollow, isLoading: followLoading } = useFollow()

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['exploreUsers'],
    queryFn: fetchAllUsers,
  })

  const colors = ['#FF6B35', '#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4']

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Explore People
        </h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array(6).fill(0).map((_, i) => (
            <div 
              key={i} 
              className="p-4 rounded-2xl animate-pulse"
              style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                  <div className="h-3 w-16 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                  <div className="h-3 w-32 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div 
          className="p-8 rounded-2xl text-center"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <span className="text-2xl">😕</span>
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Something went wrong
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Could not load users. Please try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Explore People
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Discover interesting people to follow on Sphere
        </p>
      </div>

      {/* Users Grid */}
      {users && users.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {users.map((u, i) => {
            const following = isFollowing(u.username)

            return (
              <div 
                key={u.username}
                className="p-4 rounded-2xl transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Link to={`/user/${u.username}`}>
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: colors[i % colors.length] }}
                    >
                      {u.profile_image ? (
                        <img src={u.profile_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/user/${u.username}`} className="group">
                      <h3 className="font-semibold text-sm group-hover:underline truncate" style={{ color: 'var(--text-primary)' }}>
                        {u.first_name || u.username}
                      </h3>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        @{u.username}
                      </p>
                    </Link>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {u.followers_count} {u.followers_count === 1 ? 'follower' : 'followers'}
                    </p>
                    {u.bio && (
                      <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {u.bio}
                      </p>
                    )}
                  </div>

                  {/* Follow Button */}
                  {user && user.username !== u.username && (
                    <button 
                      onClick={() => toggleFollow(u.username)}
                      disabled={followLoading}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50 flex-shrink-0"
                      style={{ 
                        backgroundColor: following ? 'var(--bg-tertiary)' : 'var(--accent)', 
                        color: following ? 'var(--text-primary)' : 'white' 
                      }}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div 
          className="p-8 rounded-2xl text-center"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <span className="text-2xl">👋</span>
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            No users to explore
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Check back later for more people to follow!
          </p>
        </div>
      )}
    </div>
  )
}
