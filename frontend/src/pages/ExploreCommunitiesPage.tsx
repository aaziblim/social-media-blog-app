import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchCommunities } from '../api'
import type { Community } from '../types'

export default function ExploreCommunitiesPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['communities'],
        queryFn: fetchCommunities,
    })

    const communities = data?.results || []

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>
                        Discover <span style={{ color: 'var(--accent)' }}>Communities</span>
                    </h1>
                    <p className="text-lg md:text-xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Join the conversation in specialized spaces. From tech to art, find your tribe on Sphere.
                    </p>
                </div>
                <Link
                    to="/communities/new"
                    className="px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 text-center"
                    style={{
                        color: 'var(--accent)',
                        backgroundColor: 'var(--bg-primary)',
                        boxShadow: 'var(--card-shadow)',
                        border: '1px solid var(--border-light)'
                    }}
                >
                    Create Community ⊕
                </Link>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 rounded-3xl animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {communities.map((community) => (
                        <Link
                            key={community.id}
                            to={`/c/${community.slug}`}
                            className="group relative flex flex-col h-full rounded-[2.5rem] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
                        >
                            {/* Cover Mini */}
                            <div className="h-32 w-full overflow-hidden relative">
                                {community.cover_image_url ? (
                                    <img src={community.cover_image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[var(--accent-alpha)] via-[var(--bg-tertiary)] to-[var(--accent-alpha)]" />
                                )}
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                            </div>

                            {/* Icon Overlay */}
                            <div className="relative px-6 pb-6 pt-0">
                                <div
                                    className="absolute -top-10 left-6 w-20 h-20 rounded-3xl border-4 flex items-center justify-center text-3xl font-bold shadow-2xl overflow-hidden transform group-hover:-translate-y-1 transition-transform"
                                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--bg-primary)' }}
                                >
                                    {community.icon_url ? (
                                        <img src={community.icon_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{community.name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>

                                <div className="mt-12">
                                    <h3 className="text-xl font-bold mb-2 group-hover:underline" style={{ color: 'var(--text-primary)' }}>
                                        {community.name}
                                    </h3>
                                    <p className="text-sm line-clamp-2 mb-4 h-10" style={{ color: 'var(--text-secondary)' }}>
                                        {community.description || "A growing community on Sphere waiting for your contribution."}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase font-bold tracking-widest text-gray-400">Members</span>
                                            <span className="text-sm font-semibold">{community.members_count}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs uppercase font-bold tracking-widest text-gray-400">Posts</span>
                                            <span className="text-sm font-semibold">{community.posts_count}</span>
                                        </div>
                                    </div>

                                    <div
                                        className="mt-6 w-full py-3 rounded-2xl text-center text-sm font-bold transition-all group-hover:shadow-md"
                                        style={{ backgroundColor: community.is_member ? 'var(--bg-tertiary)' : 'var(--accent)', color: community.is_member ? 'var(--text-primary)' : 'white' }}
                                    >
                                        {community.is_member ? 'Joined' : 'Join Community'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
