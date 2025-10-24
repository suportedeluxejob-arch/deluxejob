"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, TrendingUp, Users, DollarSign, Network, AlertCircle, CheckCircle } from "lucide-react"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

interface MLMStats {
  totalCommissionsPaid: number
  platformProfit: number
  totalRevenue: number
  commissionPercentage: number
  level1Total: number
  level2Total: number
  level3Total: number
  level4Total: number
  totalCreatorsInNetwork: number
  activeReferralChains: number
}

interface CommissionTransaction {
  id: string
  creatorId: string
  amount: number
  description: string
  type: string
  createdAt: Date
  fromUserId: string
  relatedCreatorUsername?: string
}

interface NetworkCreator {
  id: string
  creatorUsername: string
  referredBy: string
  level: number
  totalEarnings: number
  subscriberCount: number
  joinedAt: Date
}

export default function MLMManagementPage() {
  const [stats, setStats] = useState<MLMStats | null>(null)
  const [commissions, setCommissions] = useState<CommissionTransaction[]>([])
  const [networkCreators, setNetworkCreators] = useState<NetworkCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadMLMData()
  }, [])

  const loadMLMData = async () => {
    try {
      setLoading(true)

      const commissionsRef = collection(db, "transactions")
      const commissionsQuery = query(
        commissionsRef,
        where("type", "in", ["commission_level_1", "commission_level_2", "commission_level_3", "commission_level_4"]),
        limit(500),
      )
      const commissionsSnapshot = await getDocs(commissionsQuery)
      const commissionsData = commissionsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 100) as CommissionTransaction[]

      setCommissions(commissionsData)

      // Load platform revenue transactions
      const platformRef = collection(db, "transactions")
      const platformQuery = query(platformRef, where("creatorId", "==", "PLATFORM"))
      const platformSnapshot = await getDocs(platformQuery)
      const platformTransactions = platformSnapshot.docs.map((doc) => doc.data())

      // Calculate stats
      const totalCommissionsPaid = commissionsData.reduce((sum, t) => sum + t.amount, 0)
      const totalPlatformProfit = platformTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      const totalRevenue = totalCommissionsPaid + totalPlatformProfit

      const level1Total = commissionsData
        .filter((t) => t.type === "commission_level_1")
        .reduce((sum, t) => sum + t.amount, 0)
      const level2Total = commissionsData
        .filter((t) => t.type === "commission_level_2")
        .reduce((sum, t) => sum + t.amount, 0)
      const level3Total = commissionsData
        .filter((t) => t.type === "commission_level_3")
        .reduce((sum, t) => sum + t.amount, 0)
      const level4Total = commissionsData
        .filter((t) => t.type === "commission_level_4")
        .reduce((sum, t) => sum + t.amount, 0)

      const commissionPercentage = totalRevenue > 0 ? (totalCommissionsPaid / totalRevenue) * 100 : 0

      // Load network creators
      const networkRef = collection(db, "creator_network")
      const networkSnapshot = await getDocs(networkRef)
      const networkData = networkSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        joinedAt: doc.data().joinedAt?.toDate() || new Date(),
      })) as NetworkCreator[]

      setNetworkCreators(networkData)

      // Count active referral chains (creators who have referred others)
      const referrers = new Set(networkData.map((c) => c.referredBy))
      const activeReferralChains = referrers.size

      setStats({
        totalCommissionsPaid,
        platformProfit: totalPlatformProfit,
        totalRevenue,
        commissionPercentage,
        level1Total,
        level2Total,
        level3Total,
        level4Total,
        totalCreatorsInNetwork: networkData.length,
        activeReferralChains,
      })
    } catch (error) {
      console.error("[v0] Error loading MLM data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100)
  }

  const filteredCommissions = commissions.filter(
    (c) =>
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.relatedCreatorUsername?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredNetworkCreators = networkCreators.filter(
    (c) =>
      c.creatorUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referredBy.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados MLM...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento MLM</h1>
          <p className="text-muted-foreground">Sistema de comissões multinível da plataforma</p>
        </div>
      </div>

      {/* Commission Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Estrutura de Comissões</CardTitle>
          <CardDescription>Distribuição de 30% da receita da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Nível 1</div>
              <div className="text-2xl font-bold text-primary">10%</div>
              <div className="text-xs text-muted-foreground mt-1">Indicação direta</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Nível 2</div>
              <div className="text-2xl font-bold text-primary">5%</div>
              <div className="text-xs text-muted-foreground mt-1">2º nível</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Nível 3</div>
              <div className="text-2xl font-bold text-primary">3%</div>
              <div className="text-xs text-muted-foreground mt-1">3º nível</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Nível 4</div>
              <div className="text-2xl font-bold text-primary">2%</div>
              <div className="text-xs text-muted-foreground mt-1">4º nível</div>
            </div>
            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="text-sm text-muted-foreground mb-1">Plataforma</div>
              <div className="text-2xl font-bold text-primary">≥10%</div>
              <div className="text-xs text-muted-foreground mt-1">Lucro mínimo</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg flex items-start gap-3">
            {stats && stats.commissionPercentage <= 20 ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {stats && stats.commissionPercentage <= 20
                  ? "Sistema operando dentro dos limites"
                  : "Atenção: Comissões acima do limite"}
              </p>
              <p className="text-sm text-muted-foreground">
                Comissões pagas: {stats?.commissionPercentage.toFixed(2)}% da receita total (máximo: 20%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalCommissionsPaid || 0)}</div>
            <p className="text-xs text-muted-foreground">Total distribuído em comissões</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro da Plataforma</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.platformProfit || 0)}</div>
            <p className="text-xs text-muted-foreground">Após comissões MLM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criadoras na Rede</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCreatorsInNetwork || 0}</div>
            <p className="text-xs text-muted-foreground">Total de criadoras com indicação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadeias Ativas</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeReferralChains || 0}</div>
            <p className="text-xs text-muted-foreground">Criadoras que indicaram outras</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown by Level */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Nível</CardTitle>
          <CardDescription>Total pago em cada nível de comissão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Nível 1 (10%)</Badge>
                <span className="text-sm text-muted-foreground">Indicação direta</span>
              </div>
              <span className="font-semibold">{formatCurrency(stats?.level1Total || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Nível 2 (5%)</Badge>
                <span className="text-sm text-muted-foreground">Segundo nível</span>
              </div>
              <span className="font-semibold">{formatCurrency(stats?.level2Total || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Nível 3 (3%)</Badge>
                <span className="text-sm text-muted-foreground">Terceiro nível</span>
              </div>
              <span className="font-semibold">{formatCurrency(stats?.level3Total || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Nível 4 (2%)</Badge>
                <span className="text-sm text-muted-foreground">Quarto nível</span>
              </div>
              <span className="font-semibold">{formatCurrency(stats?.level4Total || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Commissions and Network */}
      <Tabs defaultValue="commissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commissions">Histórico de Comissões</TabsTrigger>
          <TabsTrigger value="network">Rede de Criadoras</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transações de Comissão</CardTitle>
                  <CardDescription>Últimas 100 comissões pagas</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar comissões..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma comissão encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>{commission.createdAt.toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {commission.type === "commission_level_1" && "Nível 1"}
                            {commission.type === "commission_level_2" && "Nível 2"}
                            {commission.type === "commission_level_3" && "Nível 3"}
                            {commission.type === "commission_level_4" && "Nível 4"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{commission.description}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(commission.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rede de Criadoras</CardTitle>
                  <CardDescription>Criadoras conectadas por indicação</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar criadoras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criadora</TableHead>
                    <TableHead>Indicada por</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Ganhos Totais</TableHead>
                    <TableHead>Assinantes</TableHead>
                    <TableHead>Data de Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNetworkCreators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma criadora encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNetworkCreators.map((creator) => (
                      <TableRow key={creator.id}>
                        <TableCell className="font-medium">@{creator.creatorUsername}</TableCell>
                        <TableCell>@{creator.referredBy}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Nível {creator.level}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(creator.totalEarnings || 0)}</TableCell>
                        <TableCell>{creator.subscriberCount || 0}</TableCell>
                        <TableCell>{creator.joinedAt.toLocaleDateString("pt-BR")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
