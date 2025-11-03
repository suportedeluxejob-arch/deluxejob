"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/firebase/config"
import { addComment, getUserProfile } from "@/lib/firebase/firestore"
import { createCommentSchema, type CreateCommentInput } from "@/lib/validations"

export async function createCommentAction(input: CreateCommentInput) {
  try {
    // Validate input
    const validatedData = createCommentSchema.parse(input)

    // Get current user
    const currentUser = auth.currentUser
    if (!currentUser) {
      return {
        success: false,
        error: "Você precisa estar logado para comentar",
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

    // Add comment
    const result = await addComment({
      userId: currentUser.uid,
      postId: validatedData.postId,
      username: userProfile.username,
      displayName: userProfile.displayName,
      profileImage: userProfile.profileImage || "",
      content: validatedData.content,
    })

    // Revalidate feed
    revalidatePath("/feed")

    return {
      success: true,
      xpGained: result.xpGained,
      message: result.xpGained > 0 ? `Você ganhou ${result.xpGained} XP!` : undefined,
    }
  } catch (error) {
    console.error("[Server Action] Error creating comment:", error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: "Erro ao adicionar comentário. Tente novamente.",
    }
  }
}
