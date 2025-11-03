"use client"
import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase/config"
import { isUserCreator } from "@/lib/firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Clock } from "lucide-react"
import { collection, query, where, onSnapshot, limit } from "firebase/firestore"
import Link from "next/link"

interface ChatPreview {
  id: string
  otherUserId: string
  otherUserName: string
  otherUserImage: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
}

export function CreatorChatList() {
  const [user] = useAuthState(auth)
  const [isCreator, setIsCreator] = useState(false)
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkCreatorStatus = async () => {
      if (!user) return

      const creatorStatus = await isUserCreator(user.uid)
      setIsCreator(creatorStatus)
      setLoading(false)
    }

    checkCreatorStatus()
  }, [user])

  useEffect(() => {
    if (!user || !isCreator) return

    const messagesRef = collection(db, "chatMessages")
    const q = query(
      messagesRef,
      where("participants", "array-contains", user.uid),
      limit(100), // Aumentamos o limite para compensar a falta de ordenação
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatMap = new Map<string, ChatPreview>()

      const docs = snapshot.docs.sort((a, b) => {
        const aTime = a.data().timestamp?.toDate() || new Date(0)
        const bTime = b.data().timestamp?.toDate() || new Date(0)
        return bTime.getTime() - aTime.getTime()
      })

      docs.forEach((doc) => {
        const data = doc.data()
        const participants = data.participants || []
        const otherUserId = participants.find((id: string) => id !== user.uid)

        if (otherUserId) {
          const chatId = [user.uid, otherUserId].sort().join("_")

          if (
            !chatMap.has(chatId) ||
            chatMap.get(chatId)!.lastMessageTime < (data.timestamp?.toDate() || new Date(0))
          ) {
            chatMap.set(chatId, {
              id: chatId,
              otherUserId,
              otherUserName: data.senderName || "Usuário",
              otherUserImage: data.senderImage || "",
              lastMessage: data.message || "",
              lastMessageTime: data.timestamp?.toDate() || new Date(),
              unreadCount: data.senderId !== user.uid && !data.read ? 1 : 0,
            })
          }
        }
      })

      const sortedChats = Array.from(chatMap.values()).sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
      )

      setChats(sortedChats.slice(0, 10)) // Limitamos a 10 conversas mais recentes
    })

    return () => unsubscribe()
  }, [user, isCreator])

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Agora"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversas Recentes</h2>
        <Badge variant="secondary" className="text-xs">
          {chats.length} conversas
        </Badge>
      </div>

      {chats.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold">Nenhuma conversa ainda</h3>
              <p className="text-sm text-muted-foreground">Suas conversas com usuários aparecerão aqui</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link key={chat.id} href={`/chat/${chat.otherUserId}`}>
              <Card className="hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage src={chat.otherUserImage || "/placeholder.svg"} alt={chat.otherUserName} />
                      <AvatarFallback>{chat.otherUserName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{chat.otherUserName}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(chat.lastMessageTime)}
                          </span>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{chat.lastMessage}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
