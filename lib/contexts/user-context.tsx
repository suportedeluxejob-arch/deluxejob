"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getUserProfile, isUserCreator, getCurrentUserLevel } from "@/lib/firebase/firestore"

interface UserContextType {
  isCreator: boolean
  userLevel: string
  currentUserData: any
  isLoading: boolean
  mounted: boolean
}

const UserContext = createContext<UserContextType>({
  isCreator: false,
  userLevel: "Bronze",
  currentUserData: null,
  isLoading: true,
  mounted: false,
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, authLoading] = useAuthState(auth)
  const [isCreator, setIsCreator] = useState(false)
  const [userLevel, setUserLevel] = useState("Bronze")
  const [currentUserData, setCurrentUserData] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (authLoading) {
      return
    }

    const loadUserData = async () => {
      if (!user) {
        setIsCreator(false)
        setUserLevel("Bronze")
        setCurrentUserData(null)
        setDataLoading(false)
        return
      }

      try {
        setDataLoading(true)

        const [creatorStatus, userData] = await Promise.all([isUserCreator(user.uid), getUserProfile(user.uid)])

        setIsCreator(creatorStatus)
        setCurrentUserData(userData)

        if (!creatorStatus && userData) {
          const level = await getCurrentUserLevel(user.uid)
          setUserLevel(level)
        } else {
          setUserLevel("")
        }
      } catch (error: any) {
        if (error?.code === "permission-denied") {
          console.warn("[v0] Permission denied loading user data")
        } else {
          console.error("[v0] Error loading user data:", error)
        }
        setIsCreator(false)
        setUserLevel("Bronze")
        setCurrentUserData(null)
      } finally {
        setDataLoading(false)
      }
    }

    loadUserData()
  }, [user, authLoading])

  const value: UserContextType = {
    isCreator,
    userLevel,
    currentUserData,
    isLoading: !mounted || authLoading || dataLoading,
    mounted,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUserContext must be used within UserProvider")
  }
  return context
}
