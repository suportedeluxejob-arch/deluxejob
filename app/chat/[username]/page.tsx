"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { useParams } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase/config"
import { getUserProfile, getUserByUsername, isUserCreator, type UserProfile } from "@/lib/firebase/firestore"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Lock, Crown, Trash2, MoreVertical } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { collection, addDoc, query, where, onSnapshot, deleteDoc, getDocs } from "firebase/firestore"
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

interface Message {
  id: string
  text: string
  sender: "user" | "creator"
  timestamp: Date
  userId: string
  creatorId: string
  read?: boolean
  senderName: string
  senderImage?: string
}

export default function ChatWithCreator() {
  const params = useParams()
  const username = params.username as string
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null)
  const [isCurrentUserCreator, setIsCurrentUserCreator] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [canSendMessages, setCanSendMessages] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadProfiles = async () => {
      if (!user) {
        router.push("/")
        return
      }

      try {
        // Carregar perfil do usuário atual
        const currentUserProfile = await getUserProfile(user.uid)
        setUserProfile(currentUserProfile)

        // Verificar se usuário atual é criadora
        const isCreator = await isUserCreator(user.uid)
        setIsCurrentUserCreator(isCreator)

        // Carregar perfil da criadora/usuário alvo
        const targetProfile = await getUserByUsername(username)
        setCreatorProfile(targetProfile)

        if (!targetProfile) {
          toast({
            title: "Usuário não encontrado",
            description: "O usuário que você está tentando conversar não existe.",
            variant: "destructive",
          })
          router.push("/chat")
          return
        }

        const userLevel = currentUserProfile?.level || "bronze"
        const canChat = isCreator || userLevel === "gold" || userLevel === "platinum" || userLevel === "diamante"
        setCanSendMessages(canChat)
      } catch (error) {
        console.error("Error loading profiles:", error)
        toast({
          title: "Erro",
          description: "Erro ao carregar perfis. Tente novamente.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfiles()
  }, [user, username, router, toast])

  useEffect(() => {
    if (!user || !creatorProfile) return

    const messagesRef = collection(db, "chatMessages")

    const chatId = [user.uid, creatorProfile.uid].sort().join("_")
    const q = query(messagesRef, where("chatId", "==", chatId))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()

        loadedMessages.push({
          id: doc.id,
          text: data.message || data.text,
          sender: data.senderId === user.uid ? "user" : "creator",
          timestamp: data.timestamp?.toDate() || new Date(),
          userId: data.senderId === user.uid ? user.uid : creatorProfile.uid,
          creatorId: data.senderId === user.uid ? creatorProfile.uid : user.uid,
          read: data.read || false,
          senderName: data.senderName || "Usuário",
          senderImage: data.senderImage,
        })
      })

      const sortedMessages = loadedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      setMessages(sortedMessages)
    })

    return () => unsubscribe()
  }, [user, creatorProfile])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !creatorProfile) return

    if (!canSendMessages) {
      toast({
        title: "Upgrade necessário 💎",
        description: "Faça upgrade para Gold, Platinum ou Diamante para conversar!",
        variant: "destructive",
      })
      return
    }

    try {
      await addDoc(collection(db, "chatMessages"), {
        senderId: user.uid,
        senderName: userProfile?.displayName || userProfile?.username || "Usuário",
        senderImage: userProfile?.profileImage || "",
        message: newMessage,
        participants: [user.uid, creatorProfile.uid],
        timestamp: new Date(),
        read: false,
        chatId: `${[user.uid, creatorProfile.uid].sort().join("_")}`,
      })

      setNewMessage("")

      toast({
        title: "Mensagem enviada! 💎",
        description: `Sua mensagem foi enviada para ${creatorProfile.displayName}`,
      })
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDeleteConversation = async () => {
    if (!user || !creatorProfile) return

    setIsDeleting(true)
    try {
      const messagesRef = collection(db, "chatMessages")
      const chatId = [user.uid, creatorProfile.uid].sort().join("_")
      const q = query(messagesRef, where("chatId", "==", chatId))

      const snapshot = await getDocs(q)
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      toast({
        title: "Conversa excluída",
        description: "Todas as mensagens foram removidas permanentemente.",
      })

      setShowDeleteDialog(false)
      router.push("/chat")
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Login Necessário</h2>
            <p className="text-muted-foreground">Você precisa estar logado para acessar o chat.</p>
            <Button className="w-full rounded-full glow-pink-hover" onClick={() => router.push("/")}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando chat...</p>
        </div>
      </div>
    )
  }

  if (!creatorProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold">Usuário não encontrado</h2>
            <p className="text-muted-foreground">O usuário que você está procurando não existe.</p>
            <Button className="w-full rounded-full" onClick={() => router.push("/chat")}>
              Voltar ao Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-gradient-to-r from-background via-primary/5 to-background border-b border-border/50 p-4 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 hover:bg-primary/10"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Avatar className="h-12 w-12 ring-2 ring-primary/30 shadow-lg">
            <AvatarImage src={creatorProfile.profileImage || "/placeholder.svg"} alt={creatorProfile.displayName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
              {creatorProfile.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg">{creatorProfile.displayName}</h1>
              {creatorProfile.isVerified && (
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground text-xs">✓</span>
                </div>
              )}
              {creatorProfile.userType === "creator" && (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                  <Crown className="h-3 w-3 mr-1" />
                  Criadora
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{creatorProfile.username}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full p-2 hover:bg-primary/10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20">
        {messages.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 mx-auto ring-4 ring-primary/20 shadow-xl">
                <AvatarImage src={creatorProfile.profileImage || "/placeholder.svg"} alt={creatorProfile.displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-2xl">
                  {creatorProfile.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-lg">
                <Crown className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Chat com {creatorProfile.displayName}</h3>
              <p className="text-muted-foreground">Inicie uma conversa enviando uma mensagem</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex items-end space-x-2 max-w-[80%] ${
                  message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                }`}
              >
                {message.sender === "creator" && (
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20 shadow-md">
                    <AvatarImage
                      src={creatorProfile.profileImage || "/placeholder.svg"}
                      alt={creatorProfile.displayName}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                      {creatorProfile.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`rounded-2xl px-4 py-3 shadow-md ${
                    message.sender === "user"
                      ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white"
                      : "bg-card border border-border/50 text-card-foreground"
                  }`}
                >
                  <div className="text-sm leading-relaxed break-words">{message.text}</div>
                  <p
                    className={`text-xs mt-1.5 ${message.sender === "user" ? "text-white/80" : "text-muted-foreground"}`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border/50 p-4 bg-gradient-to-r from-background via-primary/5 to-background backdrop-blur-sm">
        {!canSendMessages ? (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200/50 dark:border-rose-800/30 p-4 rounded-2xl text-center space-y-3 shadow-lg">
            <div className="flex items-center justify-center space-x-2">
              <Lock className="h-5 w-5 text-rose-500" />
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                {isCurrentUserCreator ? "Erro de permissão" : "Faça upgrade para continuar a conversa! 💎"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {isCurrentUserCreator
                ? "Criadoras devem ter acesso total ao chat"
                : "Usuários Gold, Platinum e Diamante podem conversar com criadoras"}
            </p>
            {!isCurrentUserCreator && (
              <Button
                className="w-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 hover:from-rose-600 hover:via-pink-600 hover:to-purple-600 shadow-lg"
                onClick={() => router.push(`/subscribe/${creatorProfile?.uid}`)}
              >
                Fazer Upgrade Agora
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="rounded-full pr-12 bg-card border-border/50 focus:border-primary shadow-sm h-12 text-base"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-9 w-9 p-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-md disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mensagens desta conversa serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
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
