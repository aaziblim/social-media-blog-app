import axios from 'axios'
import type { Paginated, Post, User, PostFormData, Comment, CommentFormData } from './types'

// Use relative URL so requests go through Vite proxy in dev
const apiBase = import.meta.env.VITE_API_BASE ?? '/api'

const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
})

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : null
}

api.interceptors.request.use((config) => {
  const token = getCsrfToken()
  if (token) {
    config.headers = config.headers ?? {}
    if (!('X-CSRFToken' in config.headers)) {
      config.headers['X-CSRFToken'] = token
    }
  }
  return config
})

// Ensure CSRF cookie is set
export async function fetchCsrf(): Promise<void> {
  await api.get('/csrf/')
}

// Posts
export async function fetchPosts(page = 1): Promise<Paginated<Post>> {
  const { data } = await api.get<Paginated<Post>>('/posts/', { params: { page } })
  return data
}

export async function fetchPost(identifier: string): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${identifier}/`)
  return data
}

export async function createPost(postData: PostFormData): Promise<Post> {
  const formData = new FormData()
  formData.append('title', postData.title)
  formData.append('content', postData.content)
  if (postData.post_image) {
    formData.append('post_image', postData.post_image)
  }
  if (postData.post_video) {
    formData.append('post_video', postData.post_video)
  }
  const { data } = await api.post<Post>('/posts/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updatePost(identifier: string, postData: PostFormData): Promise<Post> {
  const formData = new FormData()
  formData.append('title', postData.title)
  formData.append('content', postData.content)
  if (postData.post_image) {
    formData.append('post_image', postData.post_image)
  }
  if (postData.post_video) {
    formData.append('post_video', postData.post_video)
  }
  const { data } = await api.patch<Post>(`/posts/${identifier}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deletePost(identifier: string): Promise<void> {
  await api.delete(`/posts/${identifier}/`)
}

export async function likePost(identifier: string): Promise<Post> {
  const { data } = await api.post<Post>(`/posts/${identifier}/like/`)
  return data
}

export async function dislikePost(identifier: string): Promise<Post> {
  const { data } = await api.post<Post>(`/posts/${identifier}/dislike/`)
  return data
}

// Auth
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<User>('/auth/user/')
    return data
  } catch {
    return null
  }
}

export async function login(username: string, password: string): Promise<User> {
  const { data } = await api.post<User>('/auth/login/', { username, password })
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout/')
}

export async function register(username: string, email: string, password: string): Promise<User> {
  const { data } = await api.post<User>('/auth/register/', { username, email, password })
  return data
}

// Profile
export async function updateProfile(profileData: { bio?: string; image?: File }): Promise<User> {
  const formData = new FormData()
  if (profileData.bio !== undefined) formData.append('bio', profileData.bio)
  if (profileData.image) formData.append('image', profileData.image)
  const { data } = await api.patch<User>('/auth/user/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export interface UserProfile {
  id?: number
  username: string
  first_name?: string
  email?: string
  bio?: string
  profile_image?: string
  posts_count?: number
  followers_count?: number
  following_count?: number
  is_following?: boolean
  posts?: Post[]
}

export async function fetchUserProfile(username: string): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(`/users/${username}/`)
  return data
}

// Comments
export async function fetchComments(postId: number): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>('/comments/', { params: { post: postId } })
  return data
}

export async function createComment(commentData: CommentFormData): Promise<Comment> {
  const { data } = await api.post<Comment>('/comments/', commentData)
  return data
}

export async function deleteComment(id: number): Promise<void> {
  await api.delete(`/comments/${id}/`)
}

export async function likeComment(id: number): Promise<Comment> {
  const { data } = await api.post<Comment>(`/comments/${id}/like/`)
  return data
}

export async function dislikeComment(id: number): Promise<Comment> {
  const { data } = await api.post<Comment>(`/comments/${id}/dislike/`)
  return data
}

// ============ LIVESTREAM API ============

export interface Livestream {
  id: string
  host: {
    id: number
    username: string
    first_name: string
    last_name: string
    profile_image: string | null
    followers_count: number
  }
  title: string
  description: string
  thumbnail_url: string | null
  status: 'scheduled' | 'live' | 'ended'
  viewer_count: number
  peak_viewers: number
  total_likes: number
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  is_private: boolean
  duration: number
  is_live: boolean
}

export interface LivestreamMessage {
  id: number
  author: {
    id: number
    username: string
    profile_image: string | null
  }
  content: string
  created_at: string
  is_pinned: boolean
}

export async function fetchLivestreams(status?: 'live' | 'scheduled' | 'all'): Promise<Livestream[]> {
  const params = status ? { status } : {}
  const { data } = await api.get('/streams/', { params })
  // Some deployments might paginate streams; normalize to a plain array
  if (Array.isArray(data)) return data as Livestream[]
  if (Array.isArray((data as any)?.results)) return (data as any).results as Livestream[]
  return []
}

export async function fetchLivestream(id: string): Promise<Livestream> {
  const { data } = await api.get<Livestream>(`/streams/${id}/`)
  return data
}

export async function createLivestream(streamData: { title: string; description?: string }): Promise<Livestream> {
  const { data } = await api.post<Livestream>('/streams/', streamData)
  return data
}

export async function goLive(id: string): Promise<Livestream> {
  const { data } = await api.post<Livestream>(`/streams/${id}/go_live/`)
  return data
}

export async function endStream(id: string): Promise<Livestream> {
  const { data } = await api.post<Livestream>(`/streams/${id}/end_stream/`)
  return data
}

export async function joinStream(id: string): Promise<Livestream> {
  const { data } = await api.post<Livestream>(`/streams/${id}/join/`)
  return data
}

export async function leaveStream(id: string): Promise<Livestream> {
  const { data } = await api.post<Livestream>(`/streams/${id}/leave/`)
  return data
}

export async function likeStream(id: string): Promise<{ total_likes: number }> {
  const { data } = await api.post<{ total_likes: number }>(`/streams/${id}/like/`)
  return data
}

export async function fetchStreamMessages(id: string): Promise<LivestreamMessage[]> {
  const { data } = await api.get<LivestreamMessage[]>(`/streams/${id}/messages/`)
  return data
}

export async function sendStreamMessage(id: string, content: string): Promise<LivestreamMessage> {
  const { data } = await api.post<LivestreamMessage>(`/streams/${id}/messages/`, { content })
  return data
}

// WebRTC signaling (simple polling)
export interface StreamSignal {
  id: number
  role: 'host' | 'viewer'
  kind: 'offer' | 'answer' | 'candidate'
  payload: any
  created_at: string
}

export async function fetchStreamSignals(id: string, since?: number): Promise<StreamSignal[]> {
  const params = since ? { since } : {}
  const { data } = await api.get<StreamSignal[]>(`/streams/${id}/signals/`, { params })
  return data
}

export async function sendStreamSignal(id: string, signal: { role: 'host' | 'viewer'; kind: 'offer' | 'answer' | 'candidate'; payload: any }): Promise<StreamSignal> {
  const { data } = await api.post<StreamSignal>(`/streams/${id}/signals/`, signal)
  return data
}
