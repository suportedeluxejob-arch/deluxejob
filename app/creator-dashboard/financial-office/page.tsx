"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { useRouter } from "next/navigation"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Wallet,
  DollarSign,
  Network,
  User,
  Download,
  Copy,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Receipt,
} from "lucide-react"
import {
  getUserProfile,
  isUserCreator,
  getCreatorReferralCode,
  createReferralCode,
  getCreatorNetwork,
  getCreatorNetworkTree,
  getCreatorTransactions,
  getCreatorFinancials,
  type CreatorNetwork,
  type Transaction,
  type CreatorFinancials,
} from "@/lib/firebase/firestore"

export default function FinancialOfficePage() {
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [referralCode, setReferralCode] = useState<string>("")
  const [referralLink, setReferralLink] = useState<string>("")
  const [network, setNetwork] = useState<CreatorNetwork[]>([])
  const [networkTree, setNetworkTree] = useState<any[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [financials, setFinancials] = useState<CreatorFinancials | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [copiedItem, setCopiedItem] = useState<string>("")
  const router = useRouter()

  const loadFinancialData = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const isCreator = await isUserCreator(user.uid)
      if (!isCreator) {
        router.push("/feed")
        return
      }

      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)

      // Get or create referral code
      let code = await getCreatorReferralCode(user.uid)
      if (!code) {
        code = await createReferralCode(user.uid, profile.username)
      }
      setReferralCode(code)
      setReferralLink(`${process.env.NEXT_PUBLIC_APP_URL || "https://deluxejob.netlify.app"}/convite/${code}`)

      const financialData = await getCreatorFinancials(user.uid)
      setFinancials(financialData)

      // Load network data
      const networkData = await getCreatorNetwork(profile.username)
      setNetwork(networkData)

      // Load network tree
      const treeData = await getCreatorNetworkTree(profile.username, 4)
      setNetworkTree(treeData)

      // Load transactions
      const transactionData = await getCreatorTransactions(user.uid, 100)
      setTransactions(transactionData)
    } catch (error) {
      console.error("[v0] Error loading financial data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialData()
  }, [user, router])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(label)
    setTimeout(() => setCopiedItem(""), 2000)
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNetworkTree = (nodes: any[], depth = 0) => {
    const levelColors = [
      "border-emerald-500 bg-emerald-500/5",
      "border-blue-500 bg-blue-500/5",
      "border-purple-500 bg-purple-500/5",
      "border-orange-500 bg-orange-500/5",
    ]

    const levelBadges = [
      "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
      "bg-blue-500/20 text-blue-600 border-blue-500/30",
      "bg-purple-500/20 text-purple-600 border-purple-500/30",
      "bg-orange-500/20 text-orange-600 border-orange-500/30",
    ]

    return nodes.map((node) => (
      <div key={node.id} className={depth > 0 ? "ml-2 sm:ml-4 mt-2" : "mt-2"}>
        <div
          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border-l-4 transition-all hover:shadow-md cursor-pointer ${
            levelColors[Math.min(depth, 3)]
          }`}
          onClick={() => node.children?.length > 0 && toggleNode(node.id)}
        >
          {node.children?.length > 0 && (
            <div className="flex-shrink-0">
              {expandedNodes.has(node.id) ? (
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              )}
            </div>
          )}
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 border-2 border-background shadow-sm">
            <AvatarFallback className="text-xs sm:text-sm font-semibold">
              {node.creatorUsername?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-semibold truncate">@{node.creatorUsername}</p>
            <div className="flex items-center gap-1 sm:gap-2 mt-1">
              <Badge
                variant="outline"
                className={`text-[10px] sm:text-xs px-1 sm:px-2 ${levelBadges[Math.min(depth, 3)]}`}
              >
                Nv {depth + 1}
              </Badge>
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {node.subscriberCount || 0} assin.
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs sm:text-sm font-bold text-green-600">
              R$ {((node.monthlyEarnings || 0) / 100).toFixed(2)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">faturamento</p>
          </div>
        </div>
        {expandedNodes.has(node.id) && node.children?.length > 0 && (
          <div className="ml-2 sm:ml-4 mt-1 border-l-2 border-muted pl-1 sm:pl-2">
            {renderNetworkTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getTransactionBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string; icon?: any }> = {
      subscription: {
        label: "Assinatura Direta",
        className: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      },
      commission_level_1: {
        label: "Comissão Nível 1 (10%)",
        className: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
      },
      commission_level_2: {
        label: "Comissão Nível 2 (5%)",
        className: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      },
      commission_level_3: {
        label: "Comissão Nível 3 (3%)",
        className: "bg-purple-500/20 text-purple-600 border-purple-500/30",
      },
      commission_level_4: {
        label: "Comissão Nível 4 (2%)",
        className: "bg-orange-500/20 text-orange-600 border-orange-500/30",
      },
      withdrawal: {
        label: "Saque Realizado",
        className: "bg-red-500/20 text-red-600 border-red-500/30",
      },
    }

    const badge = badges[type] || { label: type, className: "bg-muted" }
    return <Badge className={badge.className}>{badge.label}</Badge>
  }

  // Calculate network statistics
  const networkStats = {
    level1: network.filter((c) => c.level === 1).length,
    level2: network.filter((c) => c.level === 2).length,
    level3: network.filter((c) => c.level === 3).length,
    level4: network.filter((c) => c.level === 4).length,
    totalCreators: network.length,
    activeCreators: network.filter((c) => c.isActive).length,
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <Wallet className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você precisa estar logada como criadora para acessar o Escritório Financeiro.
            </p>
            <Button onClick={() => router.push("/creator-login")} className="w-full">
              Fazer Login como Criadora
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Escritório Financeiro" showBackButton backHref="/creator-dashboard" />
        <div className="max-w-7xl mx-auto p-4 space-y-4 sm:space-y-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation title="Escritório Financeiro" showBackButton backHref="/creator-dashboard" />

      <main className="max-w-7xl mx-auto pb-24 px-3 sm:px-4 lg:px-8">
        <div className="py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Escritório Financeiro</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Central de controle financeiro, faturamento e gestão da sua rede MMN
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto lg:w-auto bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exportar Relatório</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Saldo Disponível */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                  Saldo Disponível
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                  {formatCurrency(financials?.availableBalance || 0)}
                </div>
                <Button size="sm" className="w-full text-xs sm:text-sm">
                  <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Sacar Agora
                </Button>
              </CardContent>
            </Card>

            {/* Faturamento Mensal */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Faturamento (Out/2025)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 sm:space-y-2">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                  {formatCurrency(financials?.monthlyRevenue || 0)}
                </div>
                <div className="flex items-center text-xs sm:text-sm text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span className="truncate">Tempo real</span>
                </div>
              </CardContent>
            </Card>

            {/* Ganhos da Rede MMN */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Network className="h-3 w-3 sm:h-4 sm:w-4" />
                  Ganhos da Rede MMN
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 sm:space-y-2">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                  {formatCurrency(financials?.networkEarnings || 0)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {networkStats.totalCreators} criadoras ativas
                </p>
              </CardContent>
            </Card>

            {/* Ganhos Diretos */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Ganhos Diretos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 sm:space-y-2">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                  {formatCurrency(financials?.directEarnings || 0)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Suas assinaturas exclusivas</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Network className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Ferramentas de Indicação MMN
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Compartilhe seu código e construa sua rede de criadoras em 4 níveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Seu Link de Convite</label>
                  <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="flex-1 bg-muted/50 text-xs sm:text-sm" />
                    <Button
                      variant={copiedItem === "link" ? "default" : "outline"}
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => copyToClipboard(referralLink, "link")}
                    >
                      {copiedItem === "link" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Seu Código Único</label>
                  <div className="flex gap-2">
                    <Input
                      value={referralCode}
                      readOnly
                      className="flex-1 bg-muted/50 font-mono text-sm sm:text-lg font-bold"
                    />
                    <Button
                      variant={copiedItem === "code" ? "default" : "outline"}
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => copyToClipboard(referralCode, "code")}
                    >
                      {copiedItem === "code" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-lg bg-background border">
                <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                  <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
                  Estrutura de Comissões (4 Níveis)
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">10%</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Nível 1</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">5%</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Nível 2</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">3%</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Nível 3</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">2%</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Nível 4</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3">
                  Você ganha comissões sobre os ganhos das criadoras que você indicar, e também sobre as indicações
                  delas até o 4º nível!
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm"
              >
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Geral</span>
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm"
              >
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Extrato</span>
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Rede</span>
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <Network className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Árvore</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="space-y-4 mt-4 sm:mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Network Statistics */}
                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                      Estatísticas da Rede
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-base sm:text-lg font-bold text-emerald-600">1</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">Nível 1 (10%)</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Indicações diretas</p>
                          </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600 flex-shrink-0">
                          {networkStats.level1}
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-base sm:text-lg font-bold text-blue-600">2</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">Nível 2 (5%)</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              Indicações de 2º nível
                            </p>
                          </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 flex-shrink-0">
                          {networkStats.level2}
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-base sm:text-lg font-bold text-purple-600">3</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">Nível 3 (3%)</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              Indicações de 3º nível
                            </p>
                          </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600 flex-shrink-0">
                          {networkStats.level3}
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-base sm:text-lg font-bold text-orange-600">4</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">Nível 4 (2%)</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              Indicações de 4º nível
                            </p>
                          </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600 flex-shrink-0">
                          {networkStats.level4}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 sm:pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium">Total de Criadoras</p>
                        <p className="text-xl sm:text-2xl font-bold">{networkStats.totalCreators}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                      Transações Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px] sm:h-[400px] pr-2 sm:pr-4">
                      <div className="space-y-2 sm:space-y-3">
                        {transactions.slice(0, 10).map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">{transaction.description}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                {formatDate(transaction.createdAt)}
                              </p>
                              <div className="mt-1 sm:mt-2">{getTransactionBadge(transaction.type)}</div>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                              <p
                                className={`text-sm sm:text-base font-bold ${
                                  transaction.type === "withdrawal" ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {transaction.type === "withdrawal" ? "-" : "+"}
                                {formatCurrency(transaction.amount)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Histórico Completo de Transações</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Todas as suas transações financeiras, incluindo ganhos diretos e comissões da rede
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mobile: Card layout */}
                  <div className="block lg:hidden space-y-3">
                    {transactions.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Nenhuma transação encontrada</p>
                      </div>
                    ) : (
                      transactions.map((transaction) => (
                        <div key={transaction.id} className="p-3 rounded-lg border space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{transaction.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">{formatDate(transaction.createdAt)}</p>
                            </div>
                            <p
                              className={`text-base font-bold flex-shrink-0 ${
                                transaction.type === "withdrawal" ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {transaction.type === "withdrawal" ? "-" : "+"}
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                          <div>{getTransactionBadge(transaction.type)}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>Nenhuma transação encontrada</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          transactions.map((transaction) => (
                            <TableRow key={transaction.id} className="hover:bg-muted/50">
                              <TableCell className="text-sm">{formatDate(transaction.createdAt)}</TableCell>
                              <TableCell>{getTransactionBadge(transaction.type)}</TableCell>
                              <TableCell className="text-sm">{transaction.description}</TableCell>
                              <TableCell
                                className={`text-right font-bold ${
                                  transaction.type === "withdrawal" ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {transaction.type === "withdrawal" ? (
                                  <span className="flex items-center justify-end gap-1">
                                    <ArrowDownRight className="h-4 w-4" />
                                    {formatCurrency(transaction.amount)}
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-end gap-1">
                                    <ArrowUpRight className="h-4 w-4" />
                                    {formatCurrency(transaction.amount)}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Criadoras na Minha Rede MMN</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Visualize todas as criadoras que fazem parte da sua rede de indicações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mobile: Card layout */}
                  <div className="block lg:hidden space-y-3">
                    {network.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-1 text-sm">Sua rede ainda está vazia</p>
                        <p className="text-xs">Compartilhe seu código de indicação para começar!</p>
                      </div>
                    ) : (
                      network.map((creator) => {
                        const commissionRates = [0.1, 0.05, 0.03, 0.02]
                        const commissionRate = commissionRates[Math.min(creator.level - 1, 3)] || 0
                        const commission = (creator.monthlyEarnings || 0) * commissionRate

                        return (
                          <div key={creator.id} className="p-3 rounded-lg border space-y-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-background shadow-sm flex-shrink-0">
                                <AvatarFallback className="text-sm font-semibold">
                                  {creator.creatorUsername?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">@{creator.creatorUsername}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      creator.level === 1
                                        ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                                        : creator.level === 2
                                          ? "bg-blue-500/20 text-blue-600 border-blue-500/30"
                                          : creator.level === 3
                                            ? "bg-purple-500/20 text-purple-600 border-purple-500/30"
                                            : "bg-orange-500/20 text-orange-600 border-orange-500/30"
                                    }`}
                                  >
                                    Nível {creator.level}
                                  </Badge>
                                  {creator.isActive ? (
                                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Ativa
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground text-xs">
                                      Inativa
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-xs text-muted-foreground">Assinantes</p>
                                <p className="text-sm font-bold">{creator.subscriberCount || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Faturamento</p>
                                <p className="text-sm font-bold">{formatCurrency(creator.monthlyEarnings || 0)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Sua Comissão</p>
                                <p className="text-sm font-bold text-green-600">
                                  {formatCurrency(commission)}
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    ({(commissionRate * 100).toFixed(0)}%)
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Criadora</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Assinantes</TableHead>
                          <TableHead className="text-right">Faturamento</TableHead>
                          <TableHead className="text-right">Sua Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {network.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="font-medium mb-1">Sua rede ainda está vazia</p>
                              <p className="text-sm">Compartilhe seu código de indicação para começar!</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          network.map((creator) => {
                            const commissionRates = [0.1, 0.05, 0.03, 0.02]
                            const commissionRate = commissionRates[Math.min(creator.level - 1, 3)] || 0
                            const commission = (creator.monthlyEarnings || 0) * commissionRate

                            return (
                              <TableRow key={creator.id} className="hover:bg-muted/50">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                      <AvatarFallback className="text-sm font-semibold">
                                        {creator.creatorUsername?.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">@{creator.creatorUsername}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      creator.level === 1
                                        ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                                        : creator.level === 2
                                          ? "bg-blue-500/20 text-blue-600 border-blue-500/30"
                                          : creator.level === 3
                                            ? "bg-purple-500/20 text-purple-600 border-purple-500/30"
                                            : "bg-orange-500/20 text-orange-600 border-orange-500/30"
                                    }
                                  >
                                    Nível {creator.level}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {creator.isActive ? (
                                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Ativa
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      Inativa
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">{creator.subscriberCount || 0}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(creator.monthlyEarnings || 0)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-green-600">
                                  {formatCurrency(commission)}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({(commissionRate * 100).toFixed(0)}%)
                                  </span>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Network Tree */}
            <TabsContent value="tree" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Árvore Hierárquica da Rede MMN</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Visualização completa da estrutura da sua rede em até 4 níveis de profundidade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {networkTree.length === 0 ? (
                    <div className="text-center py-12 sm:py-16">
                      <Network className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-base sm:text-lg font-medium text-muted-foreground mb-2">
                        Sua rede ainda está vazia
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto px-4">
                        Comece a construir sua rede compartilhando seu código de indicação com outras criadoras. Você
                        ganhará comissões em até 4 níveis!
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px] sm:h-[600px] pr-2 sm:pr-4">
                      <div className="space-y-2 sm:space-y-3">
                        {/* Root Node (You) */}
                        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary shadow-lg">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary shadow-md flex-shrink-0">
                            <AvatarImage src={userProfile?.profileImage || "/placeholder.svg"} />
                            <AvatarFallback className="text-base sm:text-lg font-bold">
                              {userProfile?.displayName?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-base sm:text-lg truncate">Você</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              @{userProfile?.username}
                            </p>
                          </div>
                          <Badge className="bg-primary text-primary-foreground shadow-sm text-xs flex-shrink-0">
                            Topo da Rede
                          </Badge>
                        </div>

                        {/* Network Tree */}
                        <div className="pl-2 sm:pl-4 border-l-2 border-muted">{renderNetworkTree(networkTree)}</div>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation userProfile={userProfile} />
    </div>
  )
}
