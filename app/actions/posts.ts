"use server"

import { revalidatePath } from "next/cache"
import { createPostSchema } from "@/lib/validations"
import { createPost as createPostFirestore } from "@/lib/firebase/firestore"

interface CreatePostActionInput {
  userId: string
  username: string
  displayName: string
  profileImage: string
  content: string
  mediaUrls?: string[]
  mediaTypes?: string[]
  visibility?: "public" | "subscribers" | "premium"
  tags?: string[]
}

export async function createPostAction(input: CreatePostActionInput) {
  try {
    if (!input.userId) {
      return {
        success: false,
        error: "Você precisa estar logado para criar um post",
      }
    }

    // Validate content and media
    const validatedData = createPostSchema.parse({
      content: input.content,
      mediaUrls: input.mediaUrls,
      mediaTypes: input.mediaTypes,
      visibility: input.visibility || "public",
      tags: input.tags || [],
    })

    // Process media URLs
    const images: string[] = []
    const videos: string[] = []

    validatedData.mediaUrls?.forEach((url, index) => {
      const type = validatedData.mediaTypes?.[index]
      if (type === "image") {
        images.push(url)
      } else if (type === "video") {
        videos.push(url)
      }
    })

    // Create post with data from client
    const postId = await createPostFirestore({
      authorId: input.userId,
      authorUsername: input.username,
      authorDisplayName: input.displayName,
      authorProfileImage: input.profileImage,
      authorUserType: "creator",
      content: validatedData.content,
      images,
      videos,
      likes: 0,
      comments: 0,
      retweets: 0,
    })

    // Revalidate relevant paths
    revalidatePath("/feed")
    revalidatePath(`/creator/${input.username}`)

    return {
      success: true,
      postId,
    }
  } catch (error) {
    console.error("[v0] Error in createPostAction:", error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: "Erro ao criar post. Tente novamente.",
    }
  }
}
