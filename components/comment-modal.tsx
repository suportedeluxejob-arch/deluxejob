"use client"
import { useState, useEffect, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, Send } from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { getPostComments, getUserProfile, type Comment } from "@/lib/firebase/firestore"
import { createCommentAction } from "@/app/actions/comments"

interface CommentModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string | null
  onCommentAdded?: (postId: string) => void
}

export const CommentModal = memo(function CommentModal({ isOpen, onClose, postId, onCommentAdded }: CommentModalProps) {
  const [user] = useAuthState(auth)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
      }
    }
    loadUserProfile()
  }, [user])

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && postId) {
      const unsubscribe = getPostComments(postId, setComments)
      return unsubscribe
    }
  }, [isOpen, postId])

  const handleSubmitComment = async () => {
    if (!user || !postId || !newComment.trim() || !userProfile) return

    setLoading(true)
    try {
      const result = await createCommentAction({
        postId,
        content: newComment.trim(),
      })

      if (!result.success) {
        alert(result.error)
        return
      }

      setNewComment("")

      if (onCommentAdded && postId) {
        onCommentAdded(postId)
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      alert("Erro ao adicionar comentário. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "agora"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) return "agora"
      if (diffInMinutes < 60) return `${diffInMinutes}m`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
      return `${Math.floor(diffInMinutes / 1440)}d`
    } catch (error) {
      return "agora"
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-card w-full max-w-md h-[80vh] rounded-t-xl border-t border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Comentários</h2>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(80vh-140px)]">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum comentário ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profileImage || "/placeholder.svg"} alt={comment.displayName} />
                      <AvatarFallback className="text-xs">{comment.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-sm">{comment.displayName}</h4>
                        <span className="text-muted-foreground text-xs">
                          @{comment.username} • {formatTimestamp(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Comment Input */}
        {user && userProfile && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile.profileImage || "/placeholder.svg"} alt={userProfile.displayName} />
                <AvatarFallback className="text-xs">{userProfile.displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center space-x-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicione um comentário..."
                  className="bg-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitComment()
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || loading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
