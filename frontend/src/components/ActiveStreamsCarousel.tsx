import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchLivestreams } from '../api'

export default function ActiveStreamsCarousel() {
    const { data: streams = [] } = useQuery({
        queryKey: ['streams', 'live'],
        queryFn: () => fetchLivestreams('live'),
        refetchInterval: 10000
    })

    // If no one is live, don't show anything (to keep UI clean)
    if (streams.length === 0) return null

    return (
        <div className="mb-6 overflow-x-auto scrollbar-none pb-2">
            <div className="flex gap-4 px-1">
                {streams.map(stream => (
                    <Link
                        key={stream.id}
                        to={`/live/${stream.id}`}
                        className="flex flex-col items-center gap-1.5 min-w-[72px] group"
                    >
                        {/* Avatar with Animated Ring */}
                        <div className="relative">
                            <div className="w-[68px] h-[68px] rounded-full p-[3px] relative z-10"
                                style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
                                <div className="w-full h-full rounded-full border-2 border-[var(--bg-primary)] overflow-hidden bg-[var(--bg-tertiary)]">
                                    {stream.host.profile_image ? (
                                        <img src={stream.host.profile_image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold bg-[var(--accent)]">
                                            {stream.host.username[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pulse Animation */}
                            <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ background: 'linear-gradient(45deg, #f09433, #bc1888)' }} />

                            {/* LIVE Badge */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#f09433] text-[9px] font-bold text-white border-2 border-[var(--bg-primary)] z-20">
                                LIVE
                            </div>
                        </div>

                        <span className="text-xs truncate max-w-[72px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {stream.host.username}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
