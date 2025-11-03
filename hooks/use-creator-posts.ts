import useSWR from "swr"
import { getPostsByAuthor } from "@/lib/firebase/firestore"

export function useCreatorPosts(username: string) {
  const { data, error, isLoading, mutate } = useSWR(
    username ? `creator-posts-${username}` : null,
    () => getPostsByAuthor(username),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    },
  )

  return {
    posts: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
