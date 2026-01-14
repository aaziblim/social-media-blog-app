import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface FollowResponse {
  is_following: boolean
  followers_count: number
  detail?: string
}

async function fetchCsrf() {
  await fetch('/api/csrf/', { credentials: 'include' })
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1] || ''
}

async function followUser(username: string): Promise<FollowResponse> {
  const csrfToken = await fetchCsrf()
  const res = await fetch(`/api/users/${username}/follow/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
  })
  if (!res.ok) throw new Error('Failed to follow')
  return res.json()
}

async function unfollowUser(username: string): Promise<FollowResponse> {
  const csrfToken = await fetchCsrf()
  const res = await fetch(`/api/users/${username}/unfollow/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
  })
  if (!res.ok) throw new Error('Failed to unfollow')
  return res.json()
}

// Fetch the list of users the current user is following
async function fetchFollowingList(): Promise<string[]> {
  const res = await fetch('/api/users/following/', { credentials: 'include' })
  if (!res.ok) return []
  const data = await res.json()
  return data.map((u: { username: string }) => u.username)
}

/**
 * Hook to manage follow state globally.
 * Uses React Query to cache following state and sync across components.
 */
export function useFollow() {
  const queryClient = useQueryClient()

  // Query for the list of usernames the current user is following
  const { data: followingList = [] } = useQuery({
    queryKey: ['followingList'],
    queryFn: fetchFollowingList,
    staleTime: 30000, // 30 seconds
  })

  const followMutation = useMutation({
    mutationFn: followUser,
    onMutate: async (username) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['followingList'] })
      const previousList = queryClient.getQueryData<string[]>(['followingList']) || []
      queryClient.setQueryData<string[]>(['followingList'], [...previousList, username])
      return { previousList }
    },
    onError: (_err, _username, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(['followingList'], context.previousList)
      }
    },
    onSuccess: (_data, username) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] })
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['userStats'] })
      queryClient.invalidateQueries({ queryKey: ['exploreUsers'] })
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: unfollowUser,
    onMutate: async (username) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['followingList'] })
      const previousList = queryClient.getQueryData<string[]>(['followingList']) || []
      queryClient.setQueryData<string[]>(['followingList'], previousList.filter(u => u !== username))
      return { previousList }
    },
    onError: (_err, _username, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(['followingList'], context.previousList)
      }
    },
    onSuccess: (_data, username) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] })
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['userStats'] })
      queryClient.invalidateQueries({ queryKey: ['exploreUsers'] })
    },
  })

  const isFollowing = (username: string) => followingList.includes(username)

  const toggleFollow = (username: string) => {
    if (isFollowing(username)) {
      unfollowMutation.mutate(username)
    } else {
      followMutation.mutate(username)
    }
  }

  return {
    isFollowing,
    toggleFollow,
    follow: followMutation.mutate,
    unfollow: unfollowMutation.mutate,
    isLoading: followMutation.isPending || unfollowMutation.isPending,
    followingList,
  }
}
