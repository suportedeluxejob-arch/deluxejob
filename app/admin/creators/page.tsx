"use client"

import { useEffect, useState } from "react"
import { Search, CheckCircle, XCircle, Trash2, User } from "lucide-react"
import { getAllCreators } from "@/lib/firebase/firestore"
import { updateCreatorVerification, deleteUserAccount } from "@/lib/firebase/admin-functions"
import type { CreatorProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function CreatorsManagement() {
  const [creators, setCreators] = useState<CreatorProfile[]>([])
  const [filteredCreators, setFilteredCreators] = useState<CreatorProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadCreators()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCreators(creators)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredCreators(
        creators.filter(
          (creator) =>
            creator.username?.toLowerCase().includes(query) || creator.displayName?.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, creators])

  async function loadCreators() {
    try {
      const creatorsData = await getAllCreators()
      setCreators(creatorsData)
      setFilteredCreators(creatorsData)
    } catch (error) {
      console.error("[v0] Error loading creators:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as criadoras",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCreator(creatorId: string, currentlyVerified: boolean) {
    try {
      await updateCreatorVerification(creatorId, !currentlyVerified)
      toast({
        title: "Sucesso",
        description: currentlyVerified ? "Verificação removida" : "Criadora verificada",
      })
      loadCreators()
    } catch (error) {
      console.error("[v0] Error verifying creator:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a verificação",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteCreator(creatorId: string, username: string) {
    if (!confirm(`Tem certeza que deseja deletar a criadora ${username}? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      await deleteUserAccount(creatorId)
      toast({
        title: "Sucesso",
        description: "Criadora deletada com sucesso",
      })
      loadCreators()
    } catch (error) {
      console.error("[v0] Error deleting creator:", error)
      toast({
        title: "Erro",
        description: "Não foi possível deletar a criadora",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Criadoras</h1>
        <div className="text-sm text-muted-foreground">Total: {filteredCreators.length} criadoras</div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Creators Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Criadora</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Seguidores</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Posts</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Cadastro</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Verificada</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCreators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhuma criadora encontrada
                  </td>
                </tr>
              ) : (
                filteredCreators.map((creator) => (
                  <tr key={creator.uid} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                          {creator.profileImage ? (
                            <img
                              src={creator.profileImage || "/placeholder.svg"}
                              alt={creator.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{creator.displayName}</p>
                          <p className="text-sm text-muted-foreground">@{creator.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{creator.followerCount || 0}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{creator.contentCount || 0}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(creator.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${creator.isVerified ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                      >
                        {creator.isVerified ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Verificada
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Não verificada
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerifyCreator(creator.uid, creator.isVerified || false)}
                          className={`rounded-lg p-2 ${creator.isVerified ? "text-muted-foreground hover:bg-muted" : "text-primary hover:bg-primary/10"}`}
                          title={creator.isVerified ? "Remover verificação" : "Verificar criadora"}
                        >
                          {creator.isVerified ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteCreator(creator.uid, creator.username)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                          title="Deletar criadora"
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
