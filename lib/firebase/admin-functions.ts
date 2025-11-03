import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "./config"
import type { User, Transaction } from "@/lib/types"

/**
 * Get all users (both regular users and creators)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })) as User[]
  } catch (error) {
    console.error("Error getting all users:", error)
    return []
  }
}

/**
 * Get platform statistics
 */
export async function getPlatformStats() {
  try {
    const usersRef = collection(db, "users")
    const usersSnapshot = await getDocs(usersRef)

    let totalUsers = 0
    let totalCreators = 0
    let activeSubscriptions = 0

    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.userType === "creator") {
        totalCreators++
      } else {
        totalUsers++
      }
      if (data.subscription?.status === "active") {
        activeSubscriptions++
      }
    })

    // Get total posts
    const postsRef = collection(db, "posts")
    const postsSnapshot = await getDocs(postsRef)
    const totalPosts = postsSnapshot.size

    return {
      totalUsers,
      totalCreators,
      activeSubscriptions,
      totalPosts,
    }
  } catch (error) {
    console.error("Error getting platform stats:", error)
    return {
      totalUsers: 0,
      totalCreators: 0,
      activeSubscriptions: 0,
      totalPosts: 0,
    }
  }
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limitCount = 50): Promise<Transaction[]> {
  try {
    const transactionsRef = collection(db, "transactions")
    const q = query(transactionsRef, orderBy("createdAt", "desc"), limit(limitCount))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[]
  } catch (error) {
    console.error("Error getting recent transactions:", error)
    return []
  }
}

/**
 * Calculate platform revenue (30% commission from all subscriptions)
 */
export async function calculatePlatformRevenue() {
  try {
    const transactionsRef = collection(db, "transactions")
    const q = query(transactionsRef, where("type", "==", "subscription"), where("status", "==", "completed"))
    const querySnapshot = await getDocs(q)

    let totalRevenue = 0
    let monthlyRevenue = 0
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const platformCommission = data.amount * 0.3 // 30% commission
      totalRevenue += platformCommission

      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      if (createdAt >= firstDayOfMonth) {
        monthlyRevenue += platformCommission
      }
    })

    return {
      totalRevenue,
      monthlyRevenue,
    }
  } catch (error) {
    console.error("Error calculating platform revenue:", error)
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
    }
  }
}

/**
 * Delete user account (admin only)
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", userId))
  } catch (error) {
    console.error("Error deleting user account:", error)
    throw error
  }
}

/**
 * Update user status (ban/unban)
 */
export async function updateUserStatus(userId: string, isBanned: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, "users", userId), {
      isBanned,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating user status:", error)
    throw error
  }
}

/**
 * Verify/unverify creator
 */
export async function updateCreatorVerification(creatorId: string, isVerified: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, "users", creatorId), {
      isVerified,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating creator verification:", error)
    throw error
  }
}
