import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchLivestream, 
  fetchStreamMessages, 
  sendStreamMessage, 
  joinStream, 
  leaveStream, 
  likeStream, 
  endStream,
  fetchStreamSignals,
  sendStreamSignal,
  type LivestreamMessage 
} from '../api'
import { useAuth } from '../AuthContext'

function formatViewers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function HeartAnimation({ id: _id }: { id: number }) {
  return (
    <div 
      className="absolute pointer-events-none animate-float-up"
      style={{ 
        right: `${Math.random() * 60 + 20}px`,
        bottom: '100px',
        animation: 'floatUp 2s ease-out forwards',
        opacity: 0
      }}
    >
      <span className="text-2xl">❤️</span>
    </div>
  )
}

function ChatMessage({ message }: { message: LivestreamMessage }) {
  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
      <div 
        className="w-7 h-7 rounded-full overflow-hidden shrink-0"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {message.author.profile_image ? (
          <img src={message.author.profile_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-semibold text-xs"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {message.author.username.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-sm mr-2" style={{ color: 'var(--accent)' }}>
          {message.author.username}
        </span>
        <span className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
          {message.content}
        </span>
      </div>
    </div>
  )
}

export default function StreamViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [message, setMessage] = useState('')
  const [hearts, setHearts] = useState<number[]>([])
  const [duration, setDuration] = useState(0)
  const heartIdRef = useRef(0)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const processedSignalIdsRef = useRef<Set<number>>(new Set())
  const lastSignalTsRef = useRef<number | null>(null)
  const pendingHostCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const pendingViewerCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const offerSentRef = useRef(false)
  const answerSetRef = useRef(false)
  const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ]

  const ensurePeerConnection = (role: 'host' | 'viewer') => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendStreamSignal(id!, { role, kind: 'candidate', payload: event.candidate }).catch(() => {})
      }
    }
    if (role === 'viewer') {
      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream()
        }
        event.streams[0]?.getTracks().forEach(track => {
          remoteStreamRef.current!.addTrack(track)
        })
        if (videoRef.current && remoteStreamRef.current) {
          const el = videoRef.current
          el.muted = true // allow autoplay without user gesture
          el.srcObject = remoteStreamRef.current
          el.play().catch(() => {})
        }
      }
    }
    pcRef.current = pc
    return pc
  }
  
  // Fetch stream data
  const { data: stream, isLoading, error } = useQuery({
    queryKey: ['stream', id],
    queryFn: () => fetchLivestream(id!),
    enabled: !!id,
    refetchInterval: 5000 // Update viewer count etc
  })
  
  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['stream-messages', id],
    queryFn: () => fetchStreamMessages(id!),
    enabled: !!id && stream?.is_live,
    refetchInterval: 2000 // Poll for new messages
  })
  
  // Join/leave stream
  useEffect(() => {
    if (!id || !stream?.is_live) return
    
    joinStream(id)
    
    return () => {
      leaveStream(id)
    }
  }, [id, stream?.is_live])
  
  // Duration timer
  useEffect(() => {
    if (!stream?.started_at || !stream.is_live) return
    
    const startTime = new Date(stream.started_at).getTime()
    const updateDuration = () => {
      setDuration(Math.floor((Date.now() - startTime) / 1000))
    }
    
    updateDuration()
    const interval = setInterval(updateDuration, 1000)
    return () => clearInterval(interval)
  }, [stream?.started_at, stream?.is_live])

  // Host: create and send offer when camera ready
  useEffect(() => {
    if (!stream?.is_live || stream.host.id !== user?.id) return
    const media = videoRef.current?.srcObject as MediaStream | null
    if (!media) return
    const pc = ensurePeerConnection('host')
    if (offerSentRef.current) return
    const makeOffer = async () => {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: true })
        await pc.setLocalDescription(offer)
        await sendStreamSignal(id!, { role: 'host', kind: 'offer', payload: offer })
        offerSentRef.current = true
      } catch (err) {
        console.error('Offer failed', err)
      }
    }
    makeOffer()
  }, [stream?.is_live, stream?.host.id, user?.id, id])

  // Host camera preview (local only)
  useEffect(() => {
    if (!stream?.is_live || stream.host.id !== user?.id) return
    let localStream: MediaStream | null = null
    const start = async () => {
      setCameraError(null)
      try {
        const constraints: MediaStreamConstraints = { video: { facingMode }, audio: false }
        const media = await navigator.mediaDevices.getUserMedia(constraints)
        localStream = media
        if (videoRef.current) {
          videoRef.current.srcObject = media
          await videoRef.current.play().catch(() => {})
        }
        if (stream?.is_live && stream.host.id === user?.id) {
          const pc = ensurePeerConnection('host')
          const existingTracks = new Set(pc.getSenders().map(s => s.track))
          media.getTracks().forEach(track => {
            if (!existingTracks.has(track)) {
              pc.addTrack(track, media)
            }
          })
        }
      } catch (err: any) {
        setCameraError(err?.message || 'Camera unavailable')
      }
    }
    start()
    return () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop())
    }
  }, [stream?.is_live, stream?.host.id, user?.id, facingMode])

  // Poll signaling channel
  useEffect(() => {
    if (!stream?.is_live) return
    let isActive = true

    const tick = async () => {
      if (!id) return
      try {
        const signals = await fetchStreamSignals(id, lastSignalTsRef.current ?? undefined)
        for (const sig of signals) {
          if (processedSignalIdsRef.current.has(sig.id)) continue
          processedSignalIdsRef.current.add(sig.id)
          const ts = Date.parse(sig.created_at) / 1000
          if (!Number.isNaN(ts)) {
            lastSignalTsRef.current = Math.max(lastSignalTsRef.current ?? 0, ts)
          }

          if (stream.host.id === user?.id) {
            // Host handles viewer answers/candidates
            if (sig.role === 'viewer' && sig.kind === 'answer') {
              const pc = pcRef.current
              if (pc && !pc.currentRemoteDescription) {
                pc.setRemoteDescription(new RTCSessionDescription(sig.payload)).then(() => {
                  answerSetRef.current = true
                  const queued = pendingViewerCandidatesRef.current.splice(0)
                  queued.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}))
                }).catch(() => {})
              }
            }
            if (sig.role === 'viewer' && sig.kind === 'candidate') {
              const candidate = new RTCIceCandidate(sig.payload)
              const pc = pcRef.current
              if (pc?.currentRemoteDescription) {
                pc.addIceCandidate(candidate).catch(() => {})
              } else {
                pendingViewerCandidatesRef.current.push(sig.payload)
              }
            }
          } else {
            // Viewer handles host offer/candidates
            if (sig.role === 'host' && sig.kind === 'offer') {
              const handleOffer = async () => {
                const pc = ensurePeerConnection('viewer')
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.payload))
                  const answer = await pc.createAnswer()
                  await pc.setLocalDescription(answer)
                  await sendStreamSignal(id, { role: 'viewer', kind: 'answer', payload: answer })
                  const queued = pendingHostCandidatesRef.current.splice(0)
                  queued.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}))
                } catch (err) {
                  console.error('Handle offer failed', err)
                }
              }
              handleOffer()
            }
            if (sig.role === 'host' && sig.kind === 'candidate') {
              const candidate = new RTCIceCandidate(sig.payload)
              const pc = pcRef.current
              if (pc?.remoteDescription) {
                pc.addIceCandidate(candidate).catch(() => {})
              } else {
                pendingHostCandidatesRef.current.push(sig.payload)
              }
            }
          }
        }
      } catch (err) {
        // swallow
      }
    }

    tick()
    const interval = setInterval(() => { if (isActive) tick() }, 2000)
    return () => { isActive = false; clearInterval(interval) }
  }, [stream?.is_live, stream?.host.id, user?.id, id])
  
  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])
  
  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: () => sendStreamMessage(id!, message),
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['stream-messages', id] })
    }
  })
  
  // Like mutation
  const likeMutation = useMutation({
    mutationFn: () => likeStream(id!),
    onSuccess: () => {
      // Add floating heart
      const heartId = heartIdRef.current++
      setHearts(prev => [...prev, heartId])
      setTimeout(() => {
        setHearts(prev => prev.filter(h => h !== heartId))
      }, 2000)
      queryClient.invalidateQueries({ queryKey: ['stream', id] })
    }
  })
  
  // End stream mutation (for host)
  const endMutation = useMutation({
    mutationFn: () => endStream(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream', id] })
    }
  })
  
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sendMutation.isPending) return
    sendMutation.mutate()
  }
  
  const isHost = user?.id === stream?.host.id
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div 
          className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }
  
  if (error || !stream) {
    return (
      <div className="text-center py-20">
        <div 
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10" style={{ color: 'var(--text-tertiary)' }}>
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Stream not found</h3>
        <button
          type="button"
          onClick={() => navigate('/live')}
          className="mt-4 px-5 py-2.5 rounded-full font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Browse Streams
        </button>
      </div>
    )
  }
  
  return (
    <div className="w-full">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/live')}
        className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
        style={{ color: 'var(--accent)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Live
      </button>
      
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main video area */}
        <div className="flex-1">
          <div 
            className="relative aspect-video rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#000' }}
          >
            {/* Video area */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isHost || true /* start muted to satisfy autoplay; unmute later if needed */}
              className="w-full h-full object-cover bg-black"
              style={{ opacity: stream.is_live ? 1 : 0.2 }}
              poster={stream.thumbnail_url || undefined}
            />

            {/* Fallback overlay */}
            {(!stream.is_live || cameraError || (!isHost && !stream.thumbnail_url)) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div 
                    className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  >
                    {stream.host.profile_image ? (
                      <img src={stream.host.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white/80">
                        {stream.host.username.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-white/75 text-sm">
                    {stream.is_live
                      ? (cameraError ? cameraError : 'Waiting for video feed (allow camera + stay on page)')
                      : 'Stream has ended'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Floating hearts */}
            {hearts.map(heartId => (
              <HeartAnimation key={heartId} id={heartId} />
            ))}
            
            {/* Top overlay - Live badge & viewers */}
            {stream.is_live && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    LIVE
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-black/50 text-white text-xs font-medium">
                    {formatDuration(duration)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg bg-black/50 text-white text-xs font-medium flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"/>
                    </svg>
                    {formatViewers(stream.viewer_count)}
                  </div>
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      {facingMode === 'user' ? 'Back camera' : 'Front camera'}
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Bottom overlay - Host info & actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/30"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    {stream.host.profile_image ? (
                      <img src={stream.host.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: 'var(--accent)' }}
                      >
                        {stream.host.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg">{stream.title}</h2>
                    <p className="text-white/70 text-sm">{stream.host.username}</p>
                  </div>
                </div>
                
                {stream.is_live && (
                  <div className="flex items-center gap-2">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => user && likeMutation.mutate()}
                      disabled={!user || likeMutation.isPending}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <span className="text-xl">❤️</span>
                    </button>
                    
                    {/* End stream button (host only) */}
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('End this livestream?')) {
                            endMutation.mutate()
                          }
                        }}
                        disabled={endMutation.isPending}
                        className="px-4 py-2 rounded-full bg-red-500 text-white text-sm font-medium transition-all hover:bg-red-600 disabled:opacity-50"
                      >
                        {endMutation.isPending ? 'Ending...' : 'End Stream'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Stream stats */}
          <div 
            className="flex items-center gap-6 mt-4 p-4 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatViewers(stream.viewer_count)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>watching</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatViewers(stream.peak_viewers)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>peak</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatViewers(stream.total_likes)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>likes</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatDuration(stream.duration || duration)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>duration</p>
            </div>
          </div>
          
          {/* Description */}
          {stream.description && (
            <div 
              className="mt-4 p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                {stream.description}
              </p>
            </div>
          )}
        </div>
        
        {/* Chat sidebar */}
        {stream.is_live && (
          <div 
            className="w-full lg:w-80 rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-primary)', height: 'min(600px, 70vh)' }}
          >
            {/* Chat header */}
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-light)' }}
            >
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Live Chat</h3>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                {messages.length} messages
              </span>
            </div>
            
            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-2"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No messages yet. Say hi! 👋
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <ChatMessage key={msg.id} message={msg} />
                ))
              )}
            </div>
            
            {/* Message input */}
            {user ? (
              <form onSubmit={handleSend} className="p-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Send a message..."
                    maxLength={500}
                    className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || sendMutation.isPending}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t text-center" style={{ borderColor: 'var(--border-light)' }}>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Sign in to chat
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* CSS for heart animation */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-150px) scale(1.5);
          }
        }
      `}</style>
    </div>
  )
}
