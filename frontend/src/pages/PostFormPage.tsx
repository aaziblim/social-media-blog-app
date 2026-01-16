import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPost, createPost, updatePost } from '../api'
import { useAuth } from '../AuthContext'

export default function PostFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const isEdit = !!slug
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [error, setError] = useState('')

  const postQuery = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPost(slug!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (postQuery.data) {
      setTitle(postQuery.data.title)
      setContent(postQuery.data.content)
      if (postQuery.data.post_image_url) {
        setImagePreview(postQuery.data.post_image_url)
        setMediaType('image')
      }
      if (postQuery.data.post_video_url) {
        setVideoPreview(postQuery.data.post_video_url)
        setMediaType('video')
      }
    }
  }, [postQuery.data])

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image)
      setImagePreview(url)
      setMediaType('image')
      // Clear video when image is selected
      setVideo(null)
      setVideoPreview(null)
      return () => URL.revokeObjectURL(url)
    }
  }, [image])

  useEffect(() => {
    if (video) {
      const url = URL.createObjectURL(video)
      setVideoPreview(url)
      setMediaType('video')
      // Clear image when video is selected
      setImage(null)
      setImagePreview(null)
      return () => URL.revokeObjectURL(url)
    }
  }, [video])

  const [searchParams] = useSearchParams()
  const communitySlug = searchParams.get('community')

  const createMutation = useMutation({
    mutationFn: () => createPost({
      title,
      content,
      post_image: image,
      post_video: video,
      community_slug: communitySlug
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      if (communitySlug) {
        queryClient.invalidateQueries({ queryKey: ['communityPosts', communitySlug] })
      }
      navigate(`/posts/${data.slug || data.public_id}`)
    },
    onError: () => setError('Failed to create post. Please try again.'),
  })

  const updateMutation = useMutation({
    mutationFn: () => updatePost(slug!, { title, content, post_image: image, post_video: video }),
    onSuccess: (data) => {
      queryClient.setQueryData(['post', slug], data)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate(`/posts/${data.slug || data.public_id}`)
    },
    onError: () => setError('Failed to update post. Please try again.'),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.')
      return
    }
    if (isEdit) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}>
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7" style={{ color: 'var(--danger)' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sign in required</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You must be signed in to {isEdit ? 'edit' : 'create'} posts
          </p>
        </div>
      </div>
    )
  }

  if (isEdit && postQuery.isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <div className="rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}>
          <div className="h-6 w-32 skeleton rounded" />
          <div className="h-12 w-full skeleton rounded-xl" />
          <div className="h-28 w-full skeleton rounded-xl" />
          <div className="h-10 w-24 skeleton rounded-xl" />
        </div>
      </div>
    )
  }

  if (isEdit && postQuery.data && user.id !== postQuery.data.author.id) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}>
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7" style={{ color: 'var(--danger)' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Access Denied</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>You can only edit your own posts</p>
        </div>
      </div>
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-lg mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {isEdit ? 'Edit Post' : 'Create Post'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {isEdit ? 'Update your post' : 'Share something with the world'}
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}>
        {error && (
          <div
            className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
            style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--danger)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a title"
              disabled={isPending}
              className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)'
              }}
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              disabled={isPending}
              className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 transition-all resize-y min-h-28"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)'
              }}
            />
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Media (optional)
            </label>

            {(imagePreview || videoPreview) ? (
              <div className="relative rounded-xl overflow-hidden mb-3">
                {mediaType === 'video' && videoPreview ? (
                  <video
                    src={videoPreview}
                    controls
                    className="w-full max-h-64 object-contain bg-black rounded-xl"
                  />
                ) : imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setImage(null)
                    setImagePreview(null)
                    setVideo(null)
                    setVideoPreview(null)
                    setMediaType(null)
                  }}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Image Upload */}
                <label
                  className="flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                      <span style={{ color: 'var(--accent)' }}>Image</span>
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImage(file)
                      }
                    }}
                    disabled={isPending}
                    className="hidden"
                  />
                </label>

                {/* Video Upload */}
                <label
                  className="flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                      <span style={{ color: 'var(--accent)' }}>Video</span>
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setVideo(file)
                      }
                    }}
                    disabled={isPending}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {isPending ? (
                <>
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  {isEdit ? 'Saving...' : 'Publishing...'}
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Publish'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isPending}
              className="px-5 py-3 font-medium rounded-xl border transition-colors"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                backgroundColor: 'transparent'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
