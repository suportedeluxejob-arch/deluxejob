"use client"

import { useEffect, useState } from "react"
import { Search, Ban, Trash2, Shield } from "lucide-react"
import { getAllUsers } from "@/lib/firebase/admin-functions"
import { updateUserStatus, deleteUserAccount } from "@/lib/firebase/admin-functions"
import type { FirebaseUser } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function UsersManagement() {
  const [users, setUsers] = useState<FirebaseUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<FirebaseUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          (user) =>
            user.username?.toLowerCase().includes(query) ||
            user.displayName?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, users])

  async function loadUsers() {
    try {
      const usersData = await getAllUsers()
      // Filter out creators - they have their own management page
      const regularUsers = usersData.filter((u) => u.userType !== "creator")
      setUsers(regularUsers)
      setFilteredUsers(regularUsers)
    } catch (error) {
      console.error("[v0] Error loading users:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleBanUser(userId: string, currentlyBanned: boolean) {
    try {
      await updateUserStatus(userId, !currentlyBanned)
      toast({
        title: "Sucesso",
        description: currentlyBanned ? "Usuário desbloqueado" : "Usuário bloqueado",
      })
      loadUsers()
    } catch (error) {
      console.error("[v0] Error banning user:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do usuário",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteUser(userId: string, username: string) {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${username}? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      await deleteUserAccount(userId)
      toast({
        title: "Sucesso",
        description: "Usuário deletado com sucesso",
      })
      loadUsers()
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      toast({
        title: "Erro",
        description: "Não foi possível deletar o usuário",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: any) => {
    if (!date) return "N/A"
    const d = date.toDate ? date.toDate() : new Date(date)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d)
  }

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: "bg-orange-500/20 text-orange-500",
      prata: "bg-gray-400/20 text-gray-400",
      gold: "bg-yellow-500/20 text-yellow-500",
      platinum: "bg-purple-500/20 text-purple-500",
      diamante: "bg-cyan-500/20 text-cyan-500",
    }
    return colors[tier?.toLowerCase()] || "bg-gray-500/20 text-gray-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
        <div className="text-sm text-muted-foreground">Total: {filteredUsers.length} usuários</div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, username ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">
                  Usuário
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">
                  Email
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">
                  Tier
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">
                  Cadastro
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-muted/50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full bg-muted flex-shrink-0">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage || "/placeholder.svg"}
                              alt={user.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm sm:text-base truncate">
                            {user.displayName}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-flex rounded-full px-2 sm:px-3 py-1 text-xs font-medium ${getTierBadgeColor(user.level || "bronze")}`}
                      >
                        {user.level || "Bronze"}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 sm:px-3 py-1 text-xs font-medium ${(user as any).isBanned ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"}`}
                      >
                        {(user as any).isBanned ? "Bloqueado" : "Ativo"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleBanUser(user.uid, (user as any).isBanned || false)}
                          className="rounded-lg p-1.5 sm:p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={(user as any).isBanned ? "Desbloquear usuário" : "Bloquear usuário"}
                        >
                          {(user as any).isBanned ? <Shield className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uid, user.username)}
                          className="rounded-lg p-1.5 sm:p-2 text-red-500 hover:bg-red-500/10"
                          title="Deletar usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
