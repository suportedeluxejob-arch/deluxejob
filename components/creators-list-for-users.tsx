"use client"
import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase/config"
import { collection, query, where, onSnapshot, deleteDoc, getDocs } from "firebase/firestore"
import { getUserProfile, type UserProfile, getCreatorActiveStories } from "@/lib/firebase/firestore"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MessageCircle, MoreVertical, Trash2, Crown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { StoryRingAvatar } from "./story-ring-avatar"
import { StoryViewer } from "./story-viewer"

interface Conversation {
  creatorId: string
  creatorProfile: UserProfile | null
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
}

export function CreatorsListForUsers() {
  const [user] = useAuthState(auth)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const router = useRouter()
  const [creatorsWithStories, setCreatorsWithStories] = useState<Set<string>>(new Set())
  const [selectedCreatorForStory, setSelectedCreatorForStory] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!user) return

    const messagesRef = collection(db, "chatMessages")
    const q = query(messagesRef, where("participants", "array-contains", user.uid))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const conversationsMap = new Map<string, Conversation>()

      for (const doc of snapshot.docs) {
        const data = doc.data()
        const otherUserId = data.participants.find((id: string) => id !== user.uid)

        if (!otherUserId) continue

        let creatorProfile = conversationsMap.get(otherUserId)?.creatorProfile

        if (!creatorProfile) {
          try {
            creatorProfile = await getUserProfile(otherUserId)
          } catch (error) {
            console.error("Error loading creator profile:", error)
            continue
          }
        }

        if (creatorProfile?.userType !== "creator") continue

        const existingConv = conversationsMap.get(otherUserId)
        const messageTime = data.timestamp?.toDate() || new Date()

        if (!existingConv || messageTime > existingConv.lastMessageTime) {
          conversationsMap.set(otherUserId, {
            creatorId: otherUserId,
            creatorProfile,
            lastMessage: data.message || "",
            lastMessageTime: messageTime,
            unreadCount: 0,
          })
        }
      }

      const conversationsArray = Array.from(conversationsMap.values()).sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
      )

      setConversations(conversationsArray)

      const storiesPromises = conversationsArray.map(async (conv) => {
        const stories = await getCreatorActiveStories(conv.creatorId)
        return { uid: conv.creatorId, hasStories: stories.length > 0 }
      })
      const storiesResults = await Promise.all(storiesPromises)
      const creatorsWithStoriesSet = new Set(storiesResults.filter((r) => r.hasStories).map((r) => r.uid))
      setCreatorsWithStories(creatorsWithStoriesSet)

      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleDeleteConversation = async (creatorId: string) => {
    if (!user) return

    try {
      const messagesRef = collection(db, "chatMessages")
      const chatId1 = `${user.uid}_${creatorId}`
      const chatId2 = `${creatorId}_${user.uid}`

      const q1 = query(messagesRef, where("chatId", "==", chatId1))
      const q2 = query(messagesRef, where("chatId", "==", chatId2))

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)])

      const deletePromises = [...snapshot1.docs, ...snapshot2.docs].map((doc) => deleteDoc(doc.ref))

      await Promise.all(deletePromises)

      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const handleChatClick = (username: string) => {
    router.push(`/chat/${username}`)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Carregando conversas...</p>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto">
          <MessageCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Nenhuma conversa ainda</h3>
          <p className="text-muted-foreground text-sm">Suas conversas com criadoras aparecerão aqui</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {conversations.map((conversation) => {
          if (!conversation.creatorProfile) return null

          return (
            <Card
              key={conversation.creatorId}
              className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/30 bg-gradient-to-br from-background to-muted/20"
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <StoryRingAvatar
                    src={conversation.creatorProfile.profileImage || "/placeholder.svg"}
                    alt={conversation.creatorProfile.displayName}
                    fallback={conversation.creatorProfile.displayName.charAt(0).toUpperCase()}
                    hasActiveStory={creatorsWithStories.has(conversation.creatorId)}
                    size="lg"
                    onClick={() => {
                      if (creatorsWithStories.has(conversation.creatorId)) {
                        setSelectedCreatorForStory(conversation.creatorProfile)
                      } else {
                        handleChatClick(conversation.creatorProfile!.username)
                      }
                    }}
                    className="h-14 w-14"
                  />

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleChatClick(conversation.creatorProfile!.username)}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold truncate">{conversation.creatorProfile.displayName}</h3>
                      {conversation.creatorProfile.isVerified && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground text-xs">✓</span>
                        </div>
                      )}
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        <Crown className="h-3 w-3 mr-1" />
                        Criadora
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{conversation.lastMessage}</p>

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(conversation.lastMessageTime, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-full p-2 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConversationToDelete(conversation.creatorId)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedCreatorForStory && (
        <StoryViewer
          creatorId={selectedCreatorForStory.uid}
          creatorUsername={selectedCreatorForStory.username}
          creatorDisplayName={selectedCreatorForStory.displayName}
          creatorAvatar={selectedCreatorForStory.profileImage}
          onClose={() => setSelectedCreatorForStory(null)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conversa? Todas as mensagens serão removidas permanentemente. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
