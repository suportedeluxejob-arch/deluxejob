"use client"
import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase/config"
import { isUserCreator, getUserProfile } from "@/lib/firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Search, Crown, Trash2 } from "lucide-react"
import { collection, query, where, onSnapshot, deleteDoc, getDocs } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
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

interface UserConversation {
  uid: string
  username: string
  displayName: string
  profileImage: string
  level: string
  lastMessageText: string
  lastMessageTime: Date
  unreadCount: number
}

export function UsersListForCreators() {
  const [user] = useAuthState(auth)
  const [isCreator, setIsCreator] = useState(false)
  const [conversations, setConversations] = useState<UserConversation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<UserConversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkCreatorStatusAndLoadConversations = async () => {
      if (!user) return

      try {
        const creatorStatus = await isUserCreator(user.uid)
        setIsCreator(creatorStatus)

        if (creatorStatus) {
          const messagesRef = collection(db, "chatMessages")
          const q = query(messagesRef, where("participants", "array-contains", user.uid))

          const unsubscribe = onSnapshot(q, async (snapshot) => {
            const conversationsMap = new Map<string, UserConversation>()

            for (const docSnap of snapshot.docs) {
              const data = docSnap.data()
              const participants = data.participants || []

              const otherUserId = participants.find((id: string) => id !== user.uid)

              if (otherUserId) {
                const existing = conversationsMap.get(otherUserId)
                const messageTime = data.timestamp?.toDate() || new Date()

                if (!existing || messageTime > existing.lastMessageTime) {
                  let userData = existing
                  if (!existing) {
                    try {
                      const userProfile = await getUserProfile(otherUserId)
                      if (userProfile) {
                        userData = {
                          uid: otherUserId,
                          username: userProfile.username || "usuario",
                          displayName: userProfile.displayName || "Usuário",
                          profileImage: userProfile.profileImage || "",
                          level: userProfile.level?.toLowerCase() || "platinum",
                          lastMessageText: data.message || data.text || "",
                          lastMessageTime: messageTime,
                          unreadCount: 0,
                        }
                      }
                    } catch (error) {
                      console.error("Error loading user profile:", error)
                      userData = {
                        uid: otherUserId,
                        username: data.senderId === otherUserId ? data.senderName || "usuario" : "usuario",
                        displayName: data.senderId === otherUserId ? data.senderName || "Usuário" : "Usuário",
                        profileImage: data.senderId === otherUserId ? data.senderImage || "" : "",
                        level: "platinum",
                        lastMessageText: data.message || data.text || "",
                        lastMessageTime: messageTime,
                        unreadCount: 0,
                      }
                    }
                  } else {
                    userData = {
                      ...existing,
                      lastMessageText: data.message || data.text || "",
                      lastMessageTime: messageTime,
                    }
                  }

                  if (userData) {
                    conversationsMap.set(otherUserId, userData)
                  }
                }
              }
            }

            const conversationsList = Array.from(conversationsMap.values())
            conversationsList.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime())

            setConversations(conversationsList)
            setLoading(false)
          })

          return () => unsubscribe()
        }
      } catch (error) {
        console.error("Error loading conversations:", error)
        setLoading(false)
      }
    }

    checkCreatorStatusAndLoadConversations()
  }, [user])

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.username.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleChatClick = (username: string) => {
    router.push(`/chat/${username}`)
  }

  const formatLastMessageTime = (date: Date) => {
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) {
      return "Agora"
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`
    }
  }

  const getLevelColor = (level: string) => {
    const normalizedLevel = level.toLowerCase()
    switch (normalizedLevel) {
      case "diamante":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      case "platinum":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-secondary text-secondary-foreground"
    }
  }

  const getLevelLabel = (level: string) => {
    const normalizedLevel = level.toLowerCase()
    switch (normalizedLevel) {
      case "diamante":
        return "Diamante"
      case "platinum":
        return "Platinum"
      default:
        return level
    }
  }

  const handleDeleteConversation = async (conversation: UserConversation) => {
    if (!user) return

    setIsDeleting(true)
    try {
      const messagesRef = collection(db, "chatMessages")
      const chatId = [user.uid, conversation.uid].sort().join("_")
      const q = query(messagesRef, where("chatId", "==", chatId))

      const snapshot = await getDocs(q)
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      toast({
        title: "Conversa excluída",
        description: `Conversa com ${conversation.displayName} foi removida permanentemente.`,
      })

      setDeleteTarget(null)
    } catch (error) {
      console.error("Error deleting conversation:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conversa. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isCreator || loading) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Conversas Ativas
          </h2>
          <p className="text-sm text-muted-foreground">
            {conversations.length} {conversations.length === 1 ? "conversa" : "conversas"}
          </p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          <Crown className="h-3 w-3 mr-1" />
          Área da Criadora
        </Badge>
      </div>

      {conversations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
      )}

      {filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold">{searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "Tente buscar por outro nome"
                  : "Quando usuários Platinum ou Diamante enviarem mensagens, elas aparecerão aqui"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation) => (
            <Card key={conversation.uid} className="hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar
                    className="h-12 w-12 ring-2 ring-primary/20 cursor-pointer"
                    onClick={() => handleChatClick(conversation.username)}
                  >
                    <AvatarImage src={conversation.profileImage || "/placeholder.svg"} alt={conversation.displayName} />
                    <AvatarFallback>{conversation.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleChatClick(conversation.username)}>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold truncate">{conversation.displayName}</h3>
                      <Badge className={`text-xs border ${getLevelColor(conversation.level)}`}>
                        {getLevelLabel(conversation.level)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conversation.lastMessageText}</p>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <span className="text-xs text-muted-foreground">
                      {formatLastMessageTime(conversation.lastMessageTime)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(conversation)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conversa com {deleteTarget?.displayName}? Esta ação não pode ser desfeita
              e todas as mensagens serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteConversation(deleteTarget)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
