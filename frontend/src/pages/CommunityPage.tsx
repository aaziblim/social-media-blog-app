import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { fetchCommunity, joinCommunity, leaveCommunity } from '../api'
import { useAuth } from '../AuthContext'
import PostCard from '../components/PostCard'
import type { Post } from '../types'

export default function CommunityPage() {
    const { slug } = useParams<{ slug: string }>()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [tab, setTab] = useState<'posts' | 'about'>('posts')

    const { data: community, isLoading, isError } = useQuery({
        queryKey: ['community', slug],
        queryFn: () => fetchCommunity(slug!),
        enabled: !!slug,
    })

    // Fetch posts for this community
    const { data: postsData } = useQuery({
        queryKey: ['communityPosts', slug],
        queryFn: async () => {
            const { data } = await api.get(`/posts/?community=${slug}`)
            return data.results as Post[]
        },
        enabled: !!slug,
    })

    const joinMutation = useMutation({
        mutationFn: () => joinCommunity(slug!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', slug] })
            queryClient.invalidateQueries({ queryKey: ['myCommunities'] })
        },
    })

    const leaveMutation = useMutation({
        mutationFn: () => leaveCommunity(slug!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', slug] })
            queryClient.invalidateQueries({ queryKey: ['myCommunities'] })
        },
    })

    if (isLoading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /></div>
    if (isError || !community) return <div className="p-8 text-center">Community not found</div>

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header / Cover */}
            <div
                className="relative h-48 md:h-64 rounded-3xl overflow-hidden mb-6"
                style={{ backgroundColor: 'var(--bg-tertiary)', boxShadow: 'var(--card-shadow)' }}
            >
                {community.cover_image_url ? (
                    <img src={community.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--accent-alpha)] via-[var(--bg-tertiary)] to-[var(--accent-alpha)]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 md:p-8">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div
                            className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl border-4 flex items-center justify-center text-2xl md:text-4xl font-bold shadow-2xl overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--bg-primary)' }}
                        >
                            {community.icon_url ? (
                                <img src={community.icon_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{community.name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="text-white">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{community.name}</h1>
                            <p className="text-sm opacity-90">c/{community.slug} • {community.members_count} members</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Controls */}
                    <div className="flex items-center justify-between gap-4 p-2 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setTab('posts')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'posts' ? 'shadow-sm' : 'hover:bg-[var(--bg-tertiary)]'}`}
                                style={{
                                    backgroundColor: tab === 'posts' ? 'var(--bg-primary)' : 'transparent',
                                    color: tab === 'posts' ? 'var(--accent)' : 'var(--text-secondary)'
                                }}
                            >
                                Posts
                            </button>
                            <button
                                onClick={() => setTab('about')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'about' ? 'shadow-sm' : 'hover:bg-[var(--bg-tertiary)]'}`}
                                style={{
                                    backgroundColor: tab === 'about' ? 'var(--bg-primary)' : 'transparent',
                                    color: tab === 'about' ? 'var(--accent)' : 'var(--text-secondary)'
                                }}
                            >
                                About
                            </button>
                        </div>

                        <div className="flex gap-2">
                            {user && (
                                community.is_member ? (
                                    <button
                                        onClick={() => leaveMutation.mutate()}
                                        disabled={leaveMutation.isPending}
                                        className="px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                    >
                                        Joined
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => joinMutation.mutate()}
                                        disabled={joinMutation.isPending}
                                        className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
                                        style={{ backgroundColor: 'var(--accent)' }}
                                    >
                                        Join
                                    </button>
                                )
                            )}
                            <Link
                                to={`/posts/new?community=${community.slug}`}
                                className="p-2 rounded-xl transition-all hover:bg-[var(--bg-tertiary)] shadow-sm flex items-center justify-center"
                                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            >
                                <span className="text-xl">⊕</span>
                            </Link>

                            {/* Nebula Entry Button */}
                            <Link
                                to={`/spheres/${community.slug}`}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)' }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                                </svg>
                                Enter Sphere
                            </Link>
                        </div>
                    </div>

                    {/* Feed */}
                    {tab === 'posts' && (
                        <div className="space-y-4">
                            {postsData && postsData.length > 0 ? (
                                postsData.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        isAuthenticated={!!user}
                                        currentUsername={user?.username}
                                        onLike={() => {
                                            api.post(`/posts/${post.public_id || post.slug || post.id}/like/`)
                                                .then(res => {
                                                    queryClient.setQueryData(['communityPosts', slug], (old: Post[] | undefined) => {
                                                        return old?.map(p => p.id === res.data.id ? res.data : p)
                                                    })
                                                    // Also update the general 'posts' query if it exists
                                                    queryClient.invalidateQueries({ queryKey: ['posts'] })
                                                })
                                        }}
                                        onDislike={() => {
                                            api.post(`/posts/${post.public_id || post.slug || post.id}/dislike/`)
                                                .then(res => {
                                                    queryClient.setQueryData(['communityPosts', slug], (old: Post[] | undefined) => {
                                                        return old?.map(p => p.id === res.data.id ? res.data : p)
                                                    })
                                                    // Also update the general 'posts' query if it exists
                                                    queryClient.invalidateQueries({ queryKey: ['posts'] })
                                                })
                                        }}
                                    />
                                ))
                            ) : (
                                <div className="py-20 text-center rounded-3xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
                                    <p className="text-lg font-medium" style={{ color: 'var(--text-tertiary)' }}>No posts yet in this community.</p>
                                    <Link
                                        to={`/posts/new?community=${community.slug}`}
                                        className="mt-4 inline-block text-sm font-bold opacity-80 hover:opacity-100"
                                        style={{ color: 'var(--accent)' }}
                                    >
                                        Be the first to share something →
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'about' && (
                        <div className="p-8 rounded-3xl space-y-4" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}>
                            <h2 className="text-xl font-bold">About {community.name}</h2>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {community.description || "The creator didn't provide a description yet. This is a space for the community to grow."}
                            </p>
                            <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
                                <div>
                                    <p className="text-xs uppercase font-bold tracking-widest text-gray-400">Created At</p>
                                    <p className="text-sm font-medium">{new Date(community.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase font-bold tracking-widest text-gray-400">Creator</p>
                                    <p className="text-sm font-medium text-right">@{community.creator.username}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="hidden lg:block space-y-6">
                    <div className="p-6 rounded-3xl" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
                            Community Info
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Members</span>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{community.members_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Posts</span>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{community.posts_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Type</span>
                                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700 uppercase">
                                    {community.is_private ? 'Private' : 'Public'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
