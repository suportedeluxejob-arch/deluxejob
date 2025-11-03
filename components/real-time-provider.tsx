"use client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type React from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase/config"
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore"
import { updateUserLastSeen } from "@/lib/firebase/firestore"

interface RealTimeContextType {
  newPostsCount: number
  hasNewNotifications: boolean
  markPostsAsRead: () => void
  markNotificationsAsRead: () => void
}

const RealTimeContext = createContext<RealTimeContextType>({
  newPostsCount: 0,
  hasNewNotifications: false,
  markPostsAsRead: () => {},
  markNotificationsAsRead: () => {},
})

const getLastSeenPostTime = (): Date => {
  if (typeof window === "undefined") return new Date()
  const stored = localStorage.getItem("lastSeenPostTime")
  return stored ? new Date(stored) : new Date()
}

const setLastSeenPostTimeStorage = (date: Date) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("lastSeenPostTime", date.toISOString())
  }
}

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [hasNewNotifications, setHasNewNotifications] = useState(false)

  useEffect(() => {
    if (!user || !db || loading) return

    const postsRef = collection(db, "posts")
    const q = query(postsRef, orderBy("createdAt", "desc"), limit(5))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentLastSeen = getLastSeenPostTime()
      let newCount = 0

      snapshot.docs.forEach((doc) => {
        const post = doc.data()
        if (post.createdAt && post.createdAt.toDate() > currentLastSeen) {
          newCount++
        }
      })

      setNewPostsCount(newCount)
    })

    return () => unsubscribe()
  }, [user, loading])

  useEffect(() => {
    if (!user || !db || loading) return

    const likesRef = collection(db, "likes")
    const unsubscribe = onSnapshot(query(likesRef, orderBy("createdAt", "desc"), limit(3)), (snapshot) => {
      if (snapshot.docs.length > 0) {
        setHasNewNotifications(true)
      }
    })

    return unsubscribe
  }, [user, loading])

  useEffect(() => {
    if (!user || loading) return

    const updateLastSeen = () => updateUserLastSeen(user.uid)
    const interval = setInterval(updateLastSeen, 30000)
    updateLastSeen()

    return () => clearInterval(interval)
  }, [user, loading])

  const markPostsAsRead = useCallback(() => {
    const now = new Date()
    setNewPostsCount(0)
    setLastSeenPostTimeStorage(now)
  }, [])

  const markNotificationsAsRead = useCallback(() => {
    setHasNewNotifications(false)
  }, [])

  return (
    <RealTimeContext.Provider
      value={{
        newPostsCount,
        hasNewNotifications,
        markPostsAsRead,
        markNotificationsAsRead,
      }}
    >
      {children}
    </RealTimeContext.Provider>
  )
}

export const useRealTime = () => useContext(RealTimeContext)
