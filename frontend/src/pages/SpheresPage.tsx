import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchUserProfile } from '../api'
import { useAuth } from '../AuthContext'
import { useFollow } from '../hooks/useFollow'

interface Orb {
    id: string
    username: string
    image: string | null
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    isTalking: boolean
    isSelf?: boolean
}

interface Particle {
    id: string
    x: number
    y: number
    vx: number
    vy: number
    emoji: string
    life: number
}

// --- Glass Profile Card Component ---
function GlassProfileCard({ username, onClose }: { username: string, onClose: () => void }) {
    const { data: profile, isLoading } = useQuery({
        queryKey: ['userProfile', username],
        queryFn: () => fetchUserProfile(username),
        enabled: !!username
    })

    const { isFollowing, toggleFollow, isLoading: followLoading } = useFollow()
    const { user: currentUser } = useAuth()

    // Check if following via hook (which syncs with local cache)
    const amIFollowing = isFollowing(username)
    const isMe = currentUser?.username === username

    // Stop propagation to prevent closing when clicking inside
    const stopProp = (e: React.MouseEvent) => e.stopPropagation()

    return (
        <div className="absolute inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="w-full max-w-sm bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center gap-6 text-center"
                onClick={stopProp}
            >
                {/* Avatar */}
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-[#5856D6] to-pink-500">
                    <div className="w-full h-full rounded-full border-4 border-black overflow-hidden bg-zinc-900">
                        {isLoading ? (
                            <div className="w-full h-full bg-white/10 animate-pulse" />
                        ) : profile?.profile_image ? (
                            <img src={profile.profile_image} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white/50">
                                {username[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-1 w-full">
                    <h2 className="text-2xl font-bold text-white">{username}</h2>
                    {isLoading ? (
                        <div className="h-4 w-24 bg-white/10 animate-pulse mx-auto rounded" />
                    ) : (
                        <p className="text-sm font-medium text-white/50 line-clamp-2 px-2">
                            {profile?.bio || "Space Drifter"}
                        </p>
                    )}
                </div>

                {/* Stats */}
                <div className="flex gap-8 py-4 border-y border-white/5 w-full justify-center">
                    <div>
                        <p className="text-xl font-bold text-white">
                            {isLoading ? '-' : profile?.following_count ?? 0}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Following</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold text-white">
                            {isLoading ? '-' : profile?.followers_count ?? 0}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Followers</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 w-full">
                    {!isMe && (
                        <button
                            onClick={() => toggleFollow(username)}
                            disabled={followLoading || isLoading}
                            className={`flex-1 py-4 rounded-2xl font-bold text-sm tracking-wide hover:scale-105 transition-all ${amIFollowing
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-white text-black'
                                }`}
                        >
                            {followLoading ? '...' : (amIFollowing ? 'Following' : 'Follow')}
                        </button>
                    )}
                    <Link
                        to={`/user/${username}`}
                        className={`flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold text-sm tracking-wide hover:bg-white/10 transition-colors flex items-center justify-center ${isMe ? 'w-full' : ''}`}
                    >
                        View Profile
                    </Link>
                </div>
            </div>
        </div>
    )
}

function useSpheresEngine(slug: string, currentUser: any) {
    const [orbs, setOrbs] = useState<Orb[]>([])
    const [particles, setParticles] = useState<Particle[]>([])
    const [selectedOrbId, setSelectedOrbId] = useState<string | null>(null)

    const [isMuted, setIsMuted] = useState(true)
    const [isDeafened, setIsDeafened] = useState(false)

    const socketRef = useRef<WebSocket | null>(null)
    const lastUpdateRef = useRef<number>(0)
    const requestRef = useRef<number>(0)

    // Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const dataArrayRef = useRef<Uint8Array | null>(null)

    // Initialize WebSocket & Physics
    useEffect(() => {
        if (!currentUser || !slug) return

        const myOrb: Orb = {
            id: String(currentUser.id),
            username: currentUser.username,
            image: currentUser.profile_image,
            x: Math.random() * 60 + 20,
            y: Math.random() * 60 + 20,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            radius: 8,
            isTalking: false,
            isSelf: true
        }
        setOrbs([myOrb])

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/ws/spheres/${slug}/`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            console.log('Connected to Nebula')
            ws.send(JSON.stringify({ type: 'orb_update', orb: myOrb }))
        }

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === 'user_left') {
                setOrbs(prev => prev.filter(o => o.id !== String(data.user_id)))
            } else if (data.type === 'orb_update') {
                const remoteOrb = data.orb
                if (String(remoteOrb.id) === String(currentUser.id)) return

                setOrbs(prev => {
                    const exists = prev.find(o => o.id === remoteOrb.id)
                    if (exists) {
                        return prev.map(o => o.id === remoteOrb.id ? { ...o, ...remoteOrb, isSelf: false } : o)
                    } else {
                        return [...prev, { ...remoteOrb, isSelf: false }]
                    }
                })
            } else if (data.type === 'emote_burst') {
                spawnParticles(data.user_id, data.emote)
            }
        }

        socketRef.current = ws
        return () => ws.close()
    }, [slug, currentUser?.id])

    // Spawn Particles Function
    const spawnParticles = (userId: string, emoji: string = '❤️') => {
        setOrbs(currentOrbs => {
            const targetOrb = currentOrbs.find(o => String(o.id) === String(userId))
            if (targetOrb) {
                const newParticles: Particle[] = []
                for (let i = 0; i < 12; i++) {
                    newParticles.push({
                        id: Math.random().toString(),
                        x: targetOrb.x,
                        y: targetOrb.y,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 1) * 0.5 - 0.2,
                        emoji: emoji,
                        life: 1.0 + Math.random() * 0.5
                    })
                }
                setParticles(prev => [...prev, ...newParticles])
            }
            return currentOrbs
        })
    }

    // Trigger Emote (Self)
    const sendEmote = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'emote_burst', emote: '❤️' }))
            if (currentUser) spawnParticles(String(currentUser.id), '❤️')
        }
    }, [currentUser])

    // Audio Analysis Loop
    useEffect(() => {
        if (isMuted) return

        let animationFrame: number
        const analyzeAudio = () => {
            if (analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current as any)

                let sum = 0
                for (let i = 0; i < dataArrayRef.current.length; i++) {
                    sum += dataArrayRef.current[i]
                }
                const avg = sum / dataArrayRef.current.length

                const isNowTalking = avg > 10

                setOrbs(prev => {
                    const self = prev.find(o => o.isSelf)
                    if (self && self.isTalking !== isNowTalking) {
                        return prev.map(o => o.isSelf ? { ...o, isTalking: isNowTalking } : o)
                    }
                    return prev
                })
            }
            animationFrame = requestAnimationFrame(analyzeAudio)
        }
        analyzeAudio()
        return () => cancelAnimationFrame(animationFrame)
    }, [isMuted])

    // Mic & Deafen Toggles
    const toggleMic = useCallback(async () => {
        if (!isMuted) {
            setIsMuted(true)
            if (audioContextRef.current) await audioContextRef.current.suspend()
            setOrbs(prev => prev.map(o => o.isSelf ? { ...o, isTalking: false } : o))
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                if (!audioContextRef.current) {
                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
                    audioContextRef.current = new AudioContext()
                    analyserRef.current = audioContextRef.current.createAnalyser()
                    analyserRef.current.fftSize = 256
                    const source = audioContextRef.current.createMediaStreamSource(stream)
                    source.connect(analyserRef.current)
                    dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
                }
                if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume()
                setIsMuted(false)
            } catch (err) {
                console.error("Mic access denied", err)
                alert("Could not access microphone.")
            }
        }
    }, [isMuted])

    const toggleDeafen = useCallback(() => setIsDeafened(prev => !prev), [])

    // Physics Loop - Social Gravity
    const updatePhysics = useCallback(() => {
        setOrbs(prevOrbs => {
            const selfOrb = prevOrbs.find(o => o.isSelf)
            if (!selfOrb) return prevOrbs

            let { x, y, vx, vy, radius } = selfOrb

            // --- PHYSICS CONSTANTS ---
            const CENTER_X = 50
            const CENTER_Y = 50

            // 1. Gravity: Gentle pull towards the "Hearth" (Center)
            const GRAVITY_STRENGTH = 0.0005
            vx += (CENTER_X - x) * GRAVITY_STRENGTH
            vy += (CENTER_Y - y) * GRAVITY_STRENGTH

            // 2. Repulsion: "Personal Space"
            const REPULSION_RADIUS = 12
            const REPULSION_FORCE = 0.02

            prevOrbs.forEach(other => {
                if (other.id === selfOrb.id) return
                const dx = x - other.x
                const dy = y - other.y
                const distSq = dx * dx + dy * dy
                const dist = Math.sqrt(distSq) || 0.1

                if (dist < REPULSION_RADIUS) {
                    const force = (1 - dist / REPULSION_RADIUS) * REPULSION_FORCE
                    vx += (dx / dist) * force
                    vy += (dy / dist) * force
                }
            })

            // 3. Fluid Drag (Heavy friction)
            const FRICTION = 0.94
            vx *= FRICTION
            vy *= FRICTION

            // 4. Update
            x += vx
            y += vy

            // 5. Soft Bounds
            x = Math.max(2, Math.min(98, x))
            y = Math.max(2, Math.min(98, y))

            const updatedSelf = { ...selfOrb, x, y, vx, vy }

            const now = Date.now()
            if (now - lastUpdateRef.current > 50 && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ type: 'orb_update', orb: updatedSelf }))
                lastUpdateRef.current = now
            }

            return prevOrbs.map(o => o.isSelf ? updatedSelf : o)
        })

        setParticles(prev => prev.map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.015
        })).filter(p => p.life > 0))

        requestRef.current = requestAnimationFrame(updatePhysics)
    }, [])

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updatePhysics)
        return () => cancelAnimationFrame(requestRef.current!)
    }, [updatePhysics])

    return { orbs, particles, isMuted, toggleMic, isDeafened, toggleDeafen, sendEmote, selectedOrbId, setSelectedOrbId }
}

export default function SpheresPage() {
    const { slug } = useParams<{ slug: string }>()
    const { user } = useAuth()

    const { orbs, particles, isMuted, toggleMic, isDeafened, toggleDeafen, sendEmote, selectedOrbId, setSelectedOrbId } = useSpheresEngine(slug!, user)

    // Find the selected user object to pass to the modal
    const selectedUser = useMemo(() => orbs.find(o => o.id === selectedOrbId), [orbs, selectedOrbId])

    if (!user) return <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center space-y-4"><Link to="/login" className="px-8 py-3 bg-white text-black rounded-full font-bold">Login</Link></div>

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black font-sans selection:bg-purple-500/30">
            {/* 1. The Void Background (Interstellar Layering) */}
            <div className={`absolute inset-0 bg-[#020205] overflow-hidden transition-all duration-700 ${selectedOrbId ? 'blur-2xl scale-110 opacity-40' : ''}`}>
                {/* Deep Nebula Clouds */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }} />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[80px] animate-pulse" style={{ animationDuration: '15s', animationDelay: '2s' }} />

                {/* The "Gargantua" Glow (Subtle center warmth) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-[radial-gradient(circle,_rgba(60,20,100,0.2)_0%,_transparent_70%)] opacity-60" />

                {/* Cosmic Dust / Grain (Optional texture) */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* Stars */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                {[...Array(30)].map((_, i) => (
                    <div key={i} className="absolute rounded-full bg-white animate-pulse" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, width: `${Math.random() * 2}px`, height: `${Math.random() * 2}px`, animationDuration: `${Math.random() * 5 + 3}s` }} />
                ))}
            </div>

            {/* 2. The Spheres */}
            <div className={`relative w-full h-full transition-all duration-500 ${isDeafened ? 'opacity-50' : 'opacity-100'} ${selectedOrbId ? 'scale-95 blur-sm grayscale' : ''}`}>
                {orbs.map(orb => (
                    <div
                        key={orb.id}
                        onClick={() => setSelectedOrbId(orb.id)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform flex flex-col items-center gap-3 transition-all duration-300 ease-out cursor-pointer hover:scale-110 active:scale-95 z-10"
                        style={{
                            left: `${orb.x}%`,
                            top: `${orb.y}%`,
                            width: `${orb.radius * 2}vw`,
                            height: `${orb.radius * 2}vw`,
                            maxWidth: '120px', maxHeight: '120px', minWidth: '72px', minHeight: '72px',
                            zIndex: orb.isTalking ? 30 : (orb.isSelf ? 20 : 10),
                            transform: orb.isTalking && !isDeafened ? 'scale(1.1)' : 'scale(1)'
                        }}
                    >
                        <div
                            className="w-full h-full rounded-full relative backdrop-blur-xl transition-all duration-500 group"
                            style={{
                                background: (orb.isTalking && !isDeafened)
                                    ? 'radial-gradient(circle at 30% 30%, rgba(167, 139, 250, 0.4), rgba(139, 92, 246, 0.1))'
                                    : (orb.isSelf ? 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))'
                                        : 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))'),
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                boxShadow: (orb.isTalking && !isDeafened)
                                    ? '0 0 60px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.2)'
                                    : '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.05)'
                            }}
                        >
                            <div className="absolute inset-1.5 rounded-full overflow-hidden opacity-90 transition-opacity">
                                {orb.image ? <img src={orb.image} className={`w-full h-full object-cover transition-all ${isDeafened && !orb.isSelf ? 'grayscale opacity-50' : ''}`} /> : <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-white/40 font-bold text-lg">{orb.username[0].toUpperCase()}</div>}
                            </div>
                            <div className="absolute top-4 left-4 w-1/3 h-1/4 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-[2px] opacity-80" />
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest font-semibold transition-all duration-300 ${orb.isTalking && !isDeafened ? 'text-white translate-y-1' : 'text-white/40'}`}>{orb.username}</span>
                    </div>
                ))}

                {particles.map(p => (
                    <div key={p.id} className="absolute pointer-events-none text-2xl animate-spin-slow" style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: p.life, transform: `scale(${p.life})` }}>
                        {p.emoji}
                    </div>
                ))}
            </div>

            {/* Header Info */}
            <div className={`absolute top-10 left-10 pointer-events-none select-none transition-all duration-500 ${selectedOrbId ? 'opacity-0' : 'opacity-100'}`}>
                <h1 className="text-3xl font-thin text-white tracking-[0.3em] uppercase opacity-90 drop-shadow-lg">Nebula</h1>
                <div className="h-px w-12 bg-white/20 my-3" />
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isDeafened ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                    <p className="text-[10px] text-white/50 tracking-[0.2em]">{orbs.length} SIGNALS</p>
                </div>
            </div>

            {/* Dock */}
            <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-500 ${selectedOrbId ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
                <div className="flex items-center gap-6 px-5 py-3 rounded-[2.5rem] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all hover:bg-black/50">
                    <Link to={`/c/${slug}`} className="w-12 h-12 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/20 border border-transparent transition-all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg></Link>
                    <div className="w-px h-8 bg-white/10" />
                    <button onClick={sendEmote} className="w-12 h-12 rounded-full flex items-center justify-center text-pink-400 hover:text-pink-300 hover:bg-pink-500/20 border border-transparent transition-all active:scale-90"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-6 h-6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg></button>
                    <button onClick={toggleMic} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl relative ${isMuted ? 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10' : 'bg-[#5856D6] text-white scale-110 shadow-[0_0_40px_rgba(88,86,214,0.5)] border border-[#7A78FF]'}`}>{!isMuted && <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-50" />} {isMuted ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg> : <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>}</button>
                    <button onClick={toggleDeafen} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all border ${isDeafened ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border-transparent'}`}>{isDeafened ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><line x1="1" y1="1" x2="23" y2="23" /><path d="M11 5L6 9H2v6h4l5 4V5z" /></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>}</button>
                </div>
            </div>

            {/* 4. Glass Identity (Real Profile Data) */}
            {selectedOrbId && selectedUser && (
                <GlassProfileCard username={selectedUser.username} onClose={() => setSelectedOrbId(null)} />
            )}
        </div>
    )
}
