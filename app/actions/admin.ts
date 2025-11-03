"use server"

import { auth } from "@/lib/firebase/auth"
import { collection, doc, updateDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export async function resetUserLevelToBronze(username: string) {
  try {
    const user = await auth.currentUser

    if (!user) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const usersRef = collection(db, "users")
    const q = query(usersRef, where("username", "==", username))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return { success: false, error: "Usuário não encontrado" }
    }

    const userDoc = querySnapshot.docs[0]
    const userRef = doc(db, "users", userDoc.id)

    // Reset level to bronze and subscription status to inactive
    await updateDoc(userRef, {
      level: "bronze",
      "subscription.status": "inactive",
      "subscription.tier": "bronze",
      updatedAt: new Date(),
    })

    console.log(`[v0] User ${username} level reset to bronze successfully`)

    return { success: true, message: "Nível resetado para bronze com sucesso!" }
  } catch (error) {
    console.error("[v0] Error resetting user level:", error)
    return { success: false, error: "Erro ao resetar nível do usuário" }
  }
}
