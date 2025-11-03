"use client"

import { useState, useEffect } from "react"
import { Bell, Send, Users, UserCheck, Loader2, Zap, Calendar, Trash2, AlertCircle } from "lucide-react"
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useToast } from "@/hooks/use-toast"
import { deleteNotificationTemplate } from "@/lib/firebase/firestore"
import type { NotificationTemplate } from "@/lib/firebase/firestore"

type NotificationTarget = "all_users" | "all_creators" | "specific_tier"
type NotificationType = "info" | "warning" | "success" | "announcement"

export default function NotificationsPage() {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [target, setTarget] = useState<NotificationTarget>("all_users")
  const [notificationType, setNotificationType] = useState<NotificationType>("info")
  const [specificTier, setSpecificTier] = useState<string>("prata")
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      const templatesRef = collection(db, "notificationTemplates")
      const q = query(templatesRef, where("isAutomatic", "==", true))
      const snapshot = await getDocs(q)
      const loadedTemplates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationTemplate[]
      setTemplates(loadedTemplates)
    } catch (error) {
      console.error("Error loading templates:", error)
    }
  }

  async function handleSendNotification() {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o título e a mensagem",
        variant: "destructive",
      })
      return
    }

    setSending(true)

    try {
      // Get target users
      let targetUserIds: string[] = []

      if (target === "all_users") {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("userType", "!=", "creator"))
        const snapshot = await getDocs(q)
        targetUserIds = snapshot.docs.map((doc) => doc.id)
      } else if (target === "all_creators") {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("userType", "==", "creator"))
        const snapshot = await getDocs(q)
        targetUserIds = snapshot.docs.map((doc) => doc.id)
      } else if (target === "specific_tier") {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("level", "==", specificTier))
        const snapshot = await getDocs(q)
        targetUserIds = snapshot.docs.map((doc) => doc.id)
      }

      // Create notifications for all target users
      const notificationsRef = collection(db, "notifications")
      const notificationPromises = targetUserIds.map((userId) =>
        addDoc(notificationsRef, {
          userId,
          title,
          message,
          type: notificationType,
          read: false,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          fromUserId: "deluxe-platform-uid",
          fromUsername: "deluxe",
          fromDisplayName: "DeLuxe",
          fromProfileImage: "/deluxe-logo.png",
        }),
      )

      await Promise.all(notificationPromises)

      toast({
        title: "Sucesso",
        description: `Notificação enviada para ${targetUserIds.length} usuários`,
      })

      setTitle("")
      setMessage("")
      setTarget("all_users")
      setNotificationType("info")
    } catch (error) {
      console.error("Error sending notification:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a notificação",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  async function toggleTemplateStatus(templateId: string, currentStatus: boolean) {
    try {
      const templateRef = doc(db, "notificationTemplates", templateId)
      await updateDoc(templateRef, {
        isActive: !currentStatus,
      })
      await loadTemplates()
      toast({
        title: "Sucesso",
        description: `Template ${!currentStatus ? "ativado" : "desativado"}`,
      })
    } catch (error) {
      console.error("Error toggling template:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o template",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm("Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.")) {
      return
    }

    setDeleting(templateId)
    try {
      await deleteNotificationTemplate(templateId)
      await loadTemplates()
      toast({
        title: "Sucesso",
        description: "Template excluído completamente",
      })
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o template",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  async function createAutomaticTemplate(type: "welcome" | "tier_upgrade" | "engagement_level_up") {
    try {
      // Check if template already exists
      const existingTemplate = templates.find((t) => t.triggerEvent === getEventType(type))
      if (existingTemplate) {
        toast({
          title: "Template já existe",
          description: "Este tipo de notificação automática já foi criado",
          variant: "destructive",
        })
        return
      }

      const templateData = getTemplateData(type)

      await addDoc(collection(db, "notificationTemplates"), {
        ...templateData,
        targetLevel: "all",
        isActive: true,
        isAutomatic: true,
        createdAt: serverTimestamp(),
        createdBy: "admin",
      })

      await loadTemplates()

      toast({
        title: "Sucesso",
        description: "Template automático criado",
      })
    } catch (error) {
      console.error("Error creating automatic template:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar o template",
        variant: "destructive",
      })
    }
  }

  function getEventType(type: "welcome" | "tier_upgrade" | "engagement_level_up") {
    const eventMap = {
      welcome: "user_registration" as const,
      tier_upgrade: "tier_upgrade" as const,
      engagement_level_up: "engagement_level_up" as const,
    }
    return eventMap[type]
  }

  function getTemplateData(type: "welcome" | "tier_upgrade" | "engagement_level_up") {
    const templates = {
      welcome: {
        title: "Bem-vindo à DeLuxe Job! 🎉",
        message: "Você começou no tier Bronze! Curta posts, comente e interaja para ganhar XP e subir de nível.",
        type: "welcome" as const,
        triggerEvent: "user_registration" as const,
      },
      tier_upgrade: {
        title: "Parabéns pelo Upgrade! 🎉",
        message: "Você subiu de tier! Agora tem acesso a mais conteúdos exclusivos.",
        type: "tier_upgrade" as const,
        triggerEvent: "tier_upgrade" as const,
      },
      engagement_level_up: {
        title: "Status de Engajamento Aumentou! ⭐",
        message: "Seu engajamento foi reconhecido! Continue interagindo para alcançar o próximo nível.",
        type: "engagement_level_up" as const,
        triggerEvent: "engagement_level_up" as const,
      },
    }
    return templates[type]
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/20 p-3">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações da Plataforma</h1>
          <p className="text-sm text-muted-foreground">Envie notificações e gerencie notificações automáticas</p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-500/20 p-3">
            <AlertCircle className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 font-semibold text-foreground">Como Funciona o Sistema de Notificações</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">📱 Notificações Automáticas</p>
                <p className="mt-1">
                  São enviadas automaticamente quando eventos específicos acontecem na plataforma. Você cria o template
                  uma vez e ele é enviado automaticamente sempre que o evento ocorrer.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">🎯 Tipos de Eventos Automáticos:</p>
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>
                    <strong>Boas-vindas:</strong> Enviada quando um novo usuário se cadastra (explica o tier Bronze)
                  </li>
                  <li>
                    <strong>Upgrade de Tier:</strong> Enviada quando usuário faz upgrade de assinatura (Bronze → Prata →
                    Gold → Platinum → Diamante)
                  </li>
                  <li>
                    <strong>Level Up XP:</strong> Enviada quando usuário sobe de nível de engajamento (sistema de XP)
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">✉️ Notificações Manuais</p>
                <p className="mt-1">
                  Você pode enviar notificações manualmente para grupos específicos (todos usuários, criadoras, ou tier
                  específico).
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">🗑️ Gerenciamento</p>
                <p className="mt-1">
                  Você pode ativar/desativar templates ou excluí-los completamente do banco de dados usando o botão de
                  lixeira.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notificações Automáticas */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-foreground">Notificações Automáticas</h2>
          </div>
          <button onClick={() => setShowTemplates(!showTemplates)} className="text-sm text-primary hover:underline">
            {showTemplates ? "Ocultar" : "Mostrar"} Templates
          </button>
        </div>

        {showTemplates && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => createAutomaticTemplate("welcome")}
                disabled={templates.some((t) => t.triggerEvent === "user_registration")}
                className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-foreground">Boas-vindas</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {templates.some((t) => t.triggerEvent === "user_registration") ? "✓ Já criado" : "Criar template"}
                </p>
              </button>

              <button
                onClick={() => createAutomaticTemplate("tier_upgrade")}
                disabled={templates.some((t) => t.triggerEvent === "tier_upgrade")}
                className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-foreground">Upgrade de Tier</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {templates.some((t) => t.triggerEvent === "tier_upgrade") ? "✓ Já criado" : "Criar template"}
                </p>
              </button>

              <button
                onClick={() => createAutomaticTemplate("engagement_level_up")}
                disabled={templates.some((t) => t.triggerEvent === "engagement_level_up")}
                className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-foreground">Level Up XP</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {templates.some((t) => t.triggerEvent === "engagement_level_up") ? "✓ Já criado" : "Criar template"}
                </p>
              </button>
            </div>

            {templates.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium text-foreground">Templates Ativos ({templates.length})</h3>
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{template.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{template.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Evento:{" "}
                        {template.triggerEvent === "user_registration"
                          ? "Cadastro de novo usuário"
                          : template.triggerEvent === "tier_upgrade"
                            ? "Upgrade de assinatura"
                            : "Level up de engajamento (XP)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTemplateStatus(template.id!, template.isActive)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                          template.isActive
                            ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                            : "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
                        }`}
                      >
                        {template.isActive ? "Ativo" : "Inativo"}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id!)}
                        disabled={deleting === template.id}
                        className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Excluir template permanentemente"
                      >
                        {deleting === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {templates.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum template criado ainda. Clique nos cards acima para criar templates automáticos.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Enviar Notificação Manual</h2>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nova atualização disponível"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-muted-foreground">{title.length}/100 caracteres</p>
          </div>

          {/* Message */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem da notificação..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-muted-foreground">{message.length}/500 caracteres</p>
          </div>

          {/* Notification Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Tipo de Notificação</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                onClick={() => setNotificationType("info")}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  notificationType === "info"
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Info
              </button>
              <button
                onClick={() => setNotificationType("success")}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  notificationType === "success"
                    ? "border-green-500 bg-green-500/10 text-green-500"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Sucesso
              </button>
              <button
                onClick={() => setNotificationType("warning")}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  notificationType === "warning"
                    ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Aviso
              </button>
              <button
                onClick={() => setNotificationType("announcement")}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  notificationType === "announcement"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Anúncio
              </button>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Público Alvo</label>
            <div className="space-y-3">
              <button
                onClick={() => setTarget("all_users")}
                className={`flex w-full items-center gap-3 rounded-lg border p-4 transition-colors ${
                  target === "all_users" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Todos os Usuários</p>
                  <p className="text-xs text-muted-foreground">Enviar para todos os usuários da plataforma</p>
                </div>
              </button>

              <button
                onClick={() => setTarget("all_creators")}
                className={`flex w-full items-center gap-3 rounded-lg border p-4 transition-colors ${
                  target === "all_creators"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <UserCheck className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Todas as Criadoras</p>
                  <p className="text-xs text-muted-foreground">Enviar apenas para criadoras</p>
                </div>
              </button>

              <button
                onClick={() => setTarget("specific_tier")}
                className={`flex w-full items-center gap-3 rounded-lg border p-4 transition-colors ${
                  target === "specific_tier"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Bell className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Tier Específico</p>
                  <p className="text-xs text-muted-foreground">Enviar para usuários de um tier específico</p>
                </div>
              </button>

              {target === "specific_tier" && (
                <div className="ml-8 space-y-2">
                  <label className="text-sm font-medium text-foreground">Selecione o Tier</label>
                  <select
                    value={specificTier}
                    onChange={(e) => setSpecificTier(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Prata">Prata</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Diamante">Diamante</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendNotification}
            disabled={sending || !title.trim() || !message.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Enviar Notificação
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
