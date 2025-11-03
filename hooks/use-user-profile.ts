import useSWR from "swr"
import { getUserByUsername, getUserProfile } from "@/lib/firebase/firestore"

export function useUserProfile(username: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    username ? `user-profile-${username}` : null,
    () => (username ? getUserByUsername(username) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
    },
  )

  return {
    user: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useUserProfileByUid(uid: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    uid ? `user-profile-uid-${uid}` : null,
    () => (uid ? getUserProfile(uid) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    },
  )

  return {
    user: data,
    isLoading,
    isError: error,
    mutate,
  }
}
