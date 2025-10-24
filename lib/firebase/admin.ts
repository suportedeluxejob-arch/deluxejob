import { getFirebaseAuth } from "./config"

export const getAuth = () => {
  try {
    return getFirebaseAuth()
  } catch (error) {
    console.error("[v0] Error getting Firebase auth:", error)
    throw error
  }
}
