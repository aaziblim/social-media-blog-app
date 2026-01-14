export interface Author {
  id: number
  username: string
  first_name?: string
  last_name?: string
  profile_image?: string | null
}

export interface Post {
  id: number
  public_id: string
  slug: string
  title: string
  content: string
  post_image_url?: string | null
  post_video_url?: string | null
  date_posted: string
  author: Author
  likes_count: number
  dislikes_count: number
  comments_count: number
  user_has_liked: boolean
  user_has_disliked: boolean
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface User {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  profile?: {
    image?: string | null
    bio?: string
  }
}

export interface PostFormData {
  title: string
  content: string
  post_image?: File | null
  post_video?: File | null
}

export interface Comment {
  id: number
  post: number
  author: Author
  parent: number | null
  content: string
  created_at: string
  updated_at: string
  likes_count: number
  dislikes_count: number
  user_has_liked: boolean
  user_has_disliked: boolean
  replies_count: number
  replies?: Comment[]
}

export interface CommentFormData {
  post: number
  content: string
  parent?: number | null
}

export interface UserProfile {
  id: number
  username: string
  first_name?: string
  last_name?: string
  profile_image?: string | null
  bio?: string
  posts_count: number
  followers_count: number
  following_count: number
  is_following?: boolean
  posts?: Post[]
}
