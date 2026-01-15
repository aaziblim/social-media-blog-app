import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import VerifiedBadge from '../components/VerifiedBadge'
import type { CreatorAnalytics } from '../types'

// Generate mock analytics data for demo
function generateMockAnalytics(): CreatorAnalytics {
  const now = new Date()
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (29 - i))
    return {
      date: date.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 500) + 100,
      likes: Math.floor(Math.random() * 50) + 10,
      followers: Math.floor(Math.random() * 20) + 5,
    }
  })

  return {
    overview: {
      total_views: 12847,
      total_likes: 1432,
      total_comments: 287,
      total_followers: 523,
      views_change: 23.5,
      likes_change: 12.8,
      followers_change: 8.2,
    },
    chart_data: chartData,
    top_posts: [
      { id: '1', title: 'How I built my first startup in 30 days', views: 2341, likes: 234, engagement_rate: 9.8 },
      { id: '2', title: 'The future of AI in everyday life', views: 1876, likes: 187, engagement_rate: 8.4 },
      { id: '3', title: 'Why minimalism changed my life', views: 1432, likes: 156, engagement_rate: 7.9 },
      { id: '4', title: '10 habits of successful people', views: 1287, likes: 143, engagement_rate: 7.2 },
      { id: '5', title: 'Remote work: The new normal', views: 987, likes: 98, engagement_rate: 6.8 },
    ],
    audience: {
      countries: [
        { name: 'Nigeria', percentage: 45 },
        { name: 'United States', percentage: 22 },
        { name: 'United Kingdom', percentage: 12 },
        { name: 'Ghana', percentage: 8 },
        { name: 'Other', percentage: 13 },
      ],
      age_groups: [
        { range: '18-24', percentage: 28 },
        { range: '25-34', percentage: 42 },
        { range: '35-44', percentage: 18 },
        { range: '45+', percentage: 12 },
      ],
    },
  }
}

// Get verification status from localStorage
function getVerificationStatus(): { isVerified: boolean; tier?: string } {
  try {
    const status = localStorage.getItem('verificationStatus')
    return status ? JSON.parse(status) : { isVerified: false }
  } catch {
    return { isVerified: false }
  }
}

type TimeRange = '7d' | '30d' | '90d' | 'all'

export default function CreatorDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const verificationStatus = getVerificationStatus()

  const analytics = useMemo(() => generateMockAnalytics(), [])

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div 
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in to view your dashboard</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Access your creator analytics and insights
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-full font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (!verificationStatus.isVerified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div 
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(29, 161, 242, 0.1)' }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#1DA1F2" strokeWidth={1.5}>
              <path d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-11V5m0 1a7 7 0 1 1 0 14 7 7 0 0 1 0-14z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Unlock Creator Analytics
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Get verified to access detailed analytics, insights, and track your growth over time.
          </p>
          <button 
            onClick={() => navigate('/get-verified')}
            className="px-6 py-2.5 rounded-full font-medium text-white inline-flex items-center gap-2"
            style={{ backgroundColor: '#1DA1F2' }}
          >
            <VerifiedBadge size="sm" className="[&_path]:fill-white" />
            Get Verified
          </button>
        </div>
      </div>
    )
  }

  const chartMax = Math.max(...analytics.chart_data.map(d => d.views))

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Creator Dashboard</h1>
            <VerifiedBadge size="md" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Track your performance and grow your audience
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex rounded-xl p-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{ 
                backgroundColor: timeRange === range ? 'var(--bg-primary)' : 'transparent',
                color: timeRange === range ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: timeRange === range ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Views" 
          value={analytics.overview.total_views.toLocaleString()}
          change={analytics.overview.views_change}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
        />
        <StatCard 
          label="Total Likes" 
          value={analytics.overview.total_likes.toLocaleString()}
          change={analytics.overview.likes_change}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
          color="#FF6B6B"
        />
        <StatCard 
          label="Comments" 
          value={analytics.overview.total_comments.toLocaleString()}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
          color="#A855F7"
        />
        <StatCard 
          label="Followers" 
          value={analytics.overview.total_followers.toLocaleString()}
          change={analytics.overview.followers_change}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          color="#3B82F6"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Views Chart */}
        <div 
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <h3 className="font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Views Over Time</h3>
          
          {/* Simple Bar Chart */}
          <div className="h-48 flex items-end gap-1">
            {analytics.chart_data.slice(-14).map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                  style={{ 
                    height: `${(day.views / chartMax) * 100}%`,
                    backgroundColor: 'var(--accent)',
                    minHeight: '4px'
                  }}
                  title={`${day.date}: ${day.views} views`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span>14 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Audience Demographics */}
        <div 
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Audience</h3>
          
          <div className="mb-6">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>BY COUNTRY</p>
            <div className="space-y-3">
              {analytics.audience.countries.slice(0, 4).map((country, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: 'var(--text-primary)' }}>{country.name}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>{country.percentage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${country.percentage}%`,
                          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#A855F7'][i] || 'var(--accent)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>BY AGE</p>
            <div className="flex gap-2">
              {analytics.audience.age_groups.map((group, i) => (
                <div key={i} className="flex-1 text-center">
                  <div 
                    className="h-16 rounded-lg flex items-end justify-center mb-1"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <div 
                      className="w-full rounded-lg transition-all duration-500"
                      style={{ 
                        height: `${group.percentage * 1.5}%`,
                        backgroundColor: 'var(--accent)'
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{group.percentage}%</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{group.range}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Posts */}
      <div 
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Top Performing Posts</h3>
          <Link 
            to={`/user/${user.username}`}
            className="text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            View All →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <th className="pb-3 font-medium">Post</th>
                <th className="pb-3 font-medium text-right">Views</th>
                <th className="pb-3 font-medium text-right">Likes</th>
                <th className="pb-3 font-medium text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {analytics.top_posts.map((post, i) => (
                <tr 
                  key={post.id} 
                  className="border-t transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ borderColor: 'var(--border-light)' }}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ 
                          backgroundColor: i < 3 ? 'var(--accent-alpha)' : 'var(--bg-tertiary)',
                          color: i < 3 ? 'var(--accent)' : 'var(--text-tertiary)'
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate max-w-[200px] sm:max-w-[300px]" style={{ color: 'var(--text-primary)' }}>
                        {post.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {post.views.toLocaleString()}
                  </td>
                  <td className="py-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {post.likes.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: post.engagement_rate >= 8 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
                        color: post.engagement_rate >= 8 ? '#10B981' : 'var(--text-secondary)'
                      }}
                    >
                      {post.engagement_rate >= 8 && '🔥'} {post.engagement_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tips Section */}
      <div 
        className="mt-6 rounded-2xl p-6"
        style={{ backgroundColor: 'rgba(29, 161, 242, 0.08)' }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(29, 161, 242, 0.15)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#1DA1F2" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Pro Tip: Post consistently
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Creators who post 3-5 times per week see 40% more engagement than those who post less frequently. 
              Try scheduling your posts for peak hours (12pm-2pm and 6pm-9pm).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  change, 
  icon, 
  color 
}: { 
  label: string
  value: string
  change?: number
  icon: React.ReactNode
  color?: string
}) {
  return (
    <div 
      className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ 
            backgroundColor: color ? `${color}15` : 'var(--accent-alpha)',
            color: color || 'var(--accent)'
          }}
        >
          {icon}
        </div>
        {change !== undefined && (
          <span 
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: change >= 0 ? '#10B981' : '#EF4444'
            }}
          >
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    </div>
  )
}
