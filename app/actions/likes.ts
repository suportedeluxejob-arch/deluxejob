"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/firebase/config"
import { toggleLike, getUserProfile } from "@/lib/firebase/firestore"
import { toggleLikeSchema, type ToggleLikeInput } from "@/lib/validations"

export async function toggleLikeAction(input: ToggleLikeInput) {
  try {
    // Validate input
    const validatedData = toggleLikeSchema.parse(input)

    // Get current user
    const currentUser = auth.currentUser
    if (!currentUser) {
      return {
        success: false,
        error: "Você precisa estar logado para curtir",
      }
    }

    // Get user profile
    const userProfile = await getUserProfile(currentUser.uid)
    if (!userProfile) {
      return {
        success: false,
        error: "Perfil de usuário não encontrado",
      }
    }

    // Toggle like
    const result = await toggleLike(currentUser.uid, validatedData.postId)

    // Revalidate feed
    revalidatePath("/feed")

    return {
      success: true,
      liked: result.liked,
      likeCount: result.likeCount,
      xpGained: result.xpGained,
      message: result.xpGained > 0 ? `Você ganhou ${result.xpGained} XP!` : undefined,
    }
  } catch (error) {
    console.error("[Server Action] Error toggling like:", error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: "Erro ao curtir post. Tente novamente.",
    }
  }
}
