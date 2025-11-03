import { db } from "./config"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export interface NotificationData {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  read?: boolean
}

export const sendNotification = async (notificationData: NotificationData): Promise<void> => {
  try {
    await addDoc(collection(db, "notifications"), {
      ...notificationData,
      read: notificationData.read || false,
      createdAt: serverTimestamp(),
    })
    console.log(`[v0] Notification sent to user ${notificationData.userId}`)
  } catch (error) {
    console.error("[v0] Error sending notification:", error)
    throw error
  }
}
