"use client"

import { useEffect, useState } from "react"
import { DollarSign, TrendingUp, Calendar, Download, ArrowUpRight } from "lucide-react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Transaction } from "@/lib/types"

export default function FinancialsPage() {
  const [platformTransactions, setPlatformTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    todayRevenue: 0,
    transactionCount: 0,
  })

  useEffect(() => {
    loadPlatformFinancials()
  }, [])

  async function loadPlatformFinancials() {
    try {
      // Query transactions where creatorId is "PLATFORM" only
      const transactionsRef = collection(db, "transactions")
      const q = query(transactionsRef, where("creatorId", "==", "PLATFORM"))

      const querySnapshot = await getDocs(q)
      const allTransactions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[]

      // Filter by status and sort in memory
      const transactions = allTransactions
        .filter((t) => t.status === "completed")
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })

      setPlatformTransactions(transactions)

      // Calculate stats
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      let totalRevenue = 0
      let monthlyRevenue = 0
      let weeklyRevenue = 0
      let todayRevenue = 0

      transactions.forEach((transaction) => {
        const amount = transaction.amount / 100 // Convert cents to reais
        totalRevenue += amount

        const createdAt = transaction.createdAt?.toDate
          ? transaction.createdAt.toDate()
          : new Date(transaction.createdAt)

        if (createdAt >= startOfMonth) {
          monthlyRevenue += amount
        }
        if (createdAt >= startOfWeek) {
          weeklyRevenue += amount
        }
        if (createdAt >= startOfDay) {
          todayRevenue += amount
        }
      })

      setStats({
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        todayRevenue,
        transactionCount: transactions.length,
      })
    } catch (error) {
      console.error("[v0] Error loading platform financials:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount)
  }

  const formatDate = (date: any) => {
    if (!date) return "N/A"
    const d = date.toDate ? date.toDate() : new Date(date)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  }

  const exportToCSV = () => {
    const headers = ["Data", "Descrição", "Valor", "Status"]
    const rows = platformTransactions.map((t) => [
      formatDate(t.createdAt),
      t.description,
      formatCurrency(t.amount / 100),
      t.status,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `platform-financials-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financeiro da Plataforma</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
              <p className="mt-2 text-2xl font-bold text-green-500">{formatCurrency(stats.totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stats.transactionCount} transações</p>
            </div>
            <DollarSign className="h-12 w-12 text-green-500/50" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Este Mês</p>
              <p className="mt-2 text-2xl font-bold text-green-500">{formatCurrency(stats.monthlyRevenue)}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="h-3 w-3" />
                <span>{((stats.monthlyRevenue / stats.totalRevenue) * 100).toFixed(1)}% do total</span>
              </div>
            </div>
            <Calendar className="h-12 w-12 text-green-500/50" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
              <p className="mt-2 text-2xl font-bold text-green-500">{formatCurrency(stats.weeklyRevenue)}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="h-3 w-3" />
                <span>{((stats.weeklyRevenue / stats.monthlyRevenue) * 100).toFixed(1)}% do mês</span>
              </div>
            </div>
            <TrendingUp className="h-12 w-12 text-green-500/50" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hoje</p>
              <p className="mt-2 text-2xl font-bold text-green-500">{formatCurrency(stats.todayRevenue)}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="h-3 w-3" />
                <span>{((stats.todayRevenue / stats.weeklyRevenue) * 100).toFixed(1)}% da semana</span>
              </div>
            </div>
            <DollarSign className="h-12 w-12 text-green-500/50" />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="rounded-full bg-primary/20 p-3 flex-shrink-0">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Comissão da Plataforma</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A plataforma recebe 30% de todas as assinaturas. Os valores exibidos aqui já descontam as comissões MLM
              pagas aos referenciadores.
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Histórico de Transações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">
                  Data
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">
                  Descrição
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-foreground">
                  Valor
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold text-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {platformTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-sm text-muted-foreground">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                platformTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-muted/50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <p className="font-medium text-foreground text-sm sm:text-base">{transaction.description}</p>
                      {transaction.fromUserId && (
                        <p className="text-xs text-muted-foreground truncate">Usuário: {transaction.fromUserId}</p>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <span className="font-semibold text-green-500 text-sm sm:text-base whitespace-nowrap">
                        {formatCurrency(transaction.amount / 100)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      <span className="inline-flex rounded-full bg-green-500/20 px-2 sm:px-3 py-1 text-xs font-medium text-green-500 whitespace-nowrap">
                        {transaction.status === "completed" ? "Concluído" : transaction.status}
                      </span>
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
