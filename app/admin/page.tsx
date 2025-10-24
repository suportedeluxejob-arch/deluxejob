"use client"

import { useEffect, useState } from "react"
import { Users, UserCheck, DollarSign, FileText, TrendingUp, Calendar } from "lucide-react"
import { getPlatformStats, calculatePlatformRevenue, getRecentTransactions } from "@/lib/firebase/admin-functions"
import type { Transaction } from "@/lib/types"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    activeSubscriptions: 0,
    totalPosts: 0,
  })
  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, revenueData, transactionsData] = await Promise.all([
          getPlatformStats(),
          calculatePlatformRevenue(),
          getRecentTransactions(10),
        ])

        setStats(statsData)
        setRevenue(revenueData)
        setRecentTransactions(transactionsData)
      } catch (error) {
        console.error("[v0] Error loading admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalUsers}</p>
            </div>
            <Users className="h-12 w-12 text-primary/50" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Criadoras</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalCreators}</p>
            </div>
            <UserCheck className="h-12 w-12 text-primary/50" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assinaturas Ativas</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.activeSubscriptions}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-primary/50" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Posts</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalPosts}</p>
            </div>
            <FileText className="h-12 w-12 text-primary/50" />
          </div>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receita Total (30%)</p>
              <p className="mt-2 text-3xl font-bold text-green-500">{formatCurrency(revenue.totalRevenue)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-green-500/50" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receita Mensal (30%)</p>
              <p className="mt-2 text-3xl font-bold text-green-500">{formatCurrency(revenue.monthlyRevenue)}</p>
            </div>
            <Calendar className="h-12 w-12 text-green-500/50" />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/users"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <h3 className="text-lg font-semibold text-foreground">Gerenciar Usuários</h3>
          <p className="mt-2 text-sm text-muted-foreground">Visualizar e gerenciar contas de usuários</p>
        </Link>

        <Link
          href="/admin/creators"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <h3 className="text-lg font-semibold text-foreground">Gerenciar Criadoras</h3>
          <p className="mt-2 text-sm text-muted-foreground">Verificar e gerenciar contas de criadoras</p>
        </Link>

        <Link
          href="/admin/financials"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <h3 className="text-lg font-semibold text-foreground">Financeiro</h3>
          <p className="mt-2 text-sm text-muted-foreground">Visualizar receitas e transações da plataforma</p>
        </Link>

        <Link
          href="/admin/notifications"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <h3 className="text-lg font-semibold text-foreground">Notificações</h3>
          <p className="mt-2 text-sm text-muted-foreground">Enviar notificações para a plataforma</p>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Transações Recentes</h2>
        </div>
        <div className="p-4 sm:p-6">
          {recentTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma transação encontrada</p>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(transaction.amount)}</p>
                    <p className="text-sm text-muted-foreground capitalize">{transaction.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
