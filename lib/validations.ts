import { z } from "zod"

// Post validation schema
export const createPostSchema = z.object({
  content: z.string().min(1, "Conteúdo não pode estar vazio").max(5000, "Conteúdo muito longo"),
  mediaUrls: z.array(z.string().url()).max(10, "Máximo de 10 mídias por post").optional(),
  mediaTypes: z.array(z.enum(["image", "video"])).optional(),
  visibility: z.enum(["public", "subscribers", "premium"]).default("public"),
  tags: z.array(z.string()).max(10, "Máximo de 10 tags").optional(),
})

// Comment validation schema
export const createCommentSchema = z.object({
  postId: z.string().min(1, "ID do post é obrigatório"),
  content: z.string().min(1, "Comentário não pode estar vazio").max(1000, "Comentário muito longo"),
})

// Like validation schema
export const toggleLikeSchema = z.object({
  postId: z.string().min(1, "ID do post é obrigatório"),
})

// Subscription validation schema
export const createSubscriptionSchema = z.object({
  creatorId: z.string().min(1, "ID da criadora é obrigatório"),
  planId: z.string().min(1, "ID do plano é obrigatório"),
  duration: z.enum(["monthly", "quarterly", "biannual"]),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type ToggleLikeInput = z.infer<typeof toggleLikeSchema>
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
