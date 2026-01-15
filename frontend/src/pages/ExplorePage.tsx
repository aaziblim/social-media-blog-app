import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../AuthContext'
import { useFollow } from '../hooks/useFollow'
import { searchAll, type SearchUser, type SearchPost } from '../api'

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

type TabType = 'all' | 'people' | 'posts'

export default function ExplorePage() {
  const { user } = useAuth()
  const { isFollowing, toggleFollow, isLoading: followLoading } = useFollow()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('all')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch all users for browse mode
  const { data: users, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['exploreUsers'],
    queryFn: fetchAllUsers,
  })

  // Fetch search results
  const { data: searchResults, isLoading: searchLoading, isError: searchError } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })

  const isSearchMode = debouncedQuery.length >= 2
  const isLoading = isSearchMode ? searchLoading : usersLoading
  const isError = isSearchMode ? searchError : usersError

  // Filter results based on active tab
  const filteredResults = useMemo(() => {
    if (!searchResults) return { users: [], posts: [] }
    if (activeTab === 'people') return { users: searchResults.users, posts: [] }
    if (activeTab === 'posts') return { users: [], posts: searchResults.posts }
    return searchResults
  }, [searchResults, activeTab])

  const colors = ['#FF6B35', '#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4']

  // User card component
  const UserCard = ({ u, index }: { u: ExploreUser | SearchUser; index: number }) => {
    const following = isFollowing(u.username)
    return (
      <div
        className="p-4 rounded-2xl transition-all hover:scale-[1.02]"
        style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-start gap-3">
          <Link to={`/user/${u.username}`}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            >
              {u.profile_image ? (
                <img src={u.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                u.username.charAt(0).toUpperCase()
              )}
            </div>
          </Link>
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
  }

  // Post card component for search results
  const PostCard = ({ post }: { post: SearchPost }) => {
    const truncatedContent = post.content.length > 120
      ? post.content.substring(0, 120) + '...'
      : post.content

    return (
      <Link
        to={`/posts/${post.slug}`}
        className="block p-4 rounded-2xl transition-all hover:scale-[1.01]"
        style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex gap-3">
          {post.post_image_url && (
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <img src={post.post_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>
              {post.title}
            </h3>
            <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
              {truncatedContent}
            </p>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span className="flex items-center gap-1">
                <span>👤</span> {post.author.username}
              </span>
              <span className="flex items-center gap-1">
                <span>❤️</span> {post.likes_count}
              </span>
              <span className="flex items-center gap-1">
                <span>💬</span> {post.comments_count}
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        {/* Search Bar */}
        <div className="mb-6">
          <div
            className="relative"
          >
            <input
              type="text"
              placeholder="Search users and posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 rounded-2xl border-none outline-none text-sm transition-all focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--card-shadow)'
              }}
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--text-tertiary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          {isSearchMode ? 'Searching...' : 'Explore People'}
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

  // Error state
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
            Could not load results. Please try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users and posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 rounded-2xl border-none outline-none text-sm transition-all focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--card-shadow)'
            }}
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--text-tertiary)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation (only in search mode) */}
      {isSearchMode && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'people', 'posts'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab ? 'var(--accent)' : 'var(--bg-primary)',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                boxShadow: activeTab === tab ? 'none' : 'var(--card-shadow)'
              }}
            >
              {tab === 'all' && '✨ All'}
              {tab === 'people' && '👥 People'}
              {tab === 'posts' && '📝 Posts'}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {isSearchMode ? `Results for "${debouncedQuery}"` : 'Explore People'}
        </h1>
        {!isSearchMode && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Discover interesting people to follow on Sphere
          </p>
        )}
      </div>

      {/* Search Results Mode */}
      {isSearchMode ? (
        <>
          {/* Users Section */}
          {(activeTab === 'all' || activeTab === 'people') && filteredResults.users.length > 0 && (
            <div className="mb-8">
              {activeTab === 'all' && (
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  👥 People
                </h2>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredResults.users.map((u, i) => (
                  <UserCard key={u.username} u={u} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {(activeTab === 'all' || activeTab === 'posts') && filteredResults.posts.length > 0 && (
            <div className="mb-8">
              {activeTab === 'all' && (
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  📝 Posts
                </h2>
              )}
              <div className="grid gap-4">
                {filteredResults.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredResults.users.length === 0 && filteredResults.posts.length === 0 && (
            <div
              className="p-8 rounded-2xl text-center"
              style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                No results found
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Try different keywords or check your spelling
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Browse Mode - Users Grid */}
          {users && users.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {users.map((u, i) => (
                <UserCard key={u.username} u={u} index={i} />
              ))}
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
        </>
      )}
    </div>
  )
}
