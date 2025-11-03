"use client"

// Admin session management - completely independent from user authentication
const ADMIN_SESSION_KEY = "admin_session"
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface AdminSession {
  authenticated: boolean
  timestamp: number
}

export function setAdminSession() {
  const session: AdminSession = {
    authenticated: true,
    timestamp: Date.now(),
  }
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
}

export function getAdminSession(): boolean {
  if (typeof window === "undefined") return false

  const sessionStr = localStorage.getItem(ADMIN_SESSION_KEY)
  if (!sessionStr) return false

  try {
    const session: AdminSession = JSON.parse(sessionStr)
    const isExpired = Date.now() - session.timestamp > SESSION_DURATION

    if (isExpired) {
      clearAdminSession()
      return false
    }

    return session.authenticated
  } catch {
    return false
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}
