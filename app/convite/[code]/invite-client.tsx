"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react"
import { validateReferralCode } from "@/lib/firebase/firestore"

export default function InvitePageClient({ code }: { code: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<"validating" | "valid" | "invalid">("validating")
  const [referrerUsername, setReferrerUsername] = useState<string>("")

  useEffect(() => {
    const validateAndRedirect = async () => {
      if (!code) {
        setStatus("invalid")
        return
      }

      try {
        const codeData = await validateReferralCode(code.toUpperCase())

        if (codeData) {
          setStatus("valid")
          setReferrerUsername(codeData.creatorUsername)

          // Redirect to creator signup with the referral code as query parameter
          setTimeout(() => {
            router.push(`/creator-signup?referralCode=${code.toUpperCase()}`)
          }, 1500)
        } else {
          setStatus("invalid")

          // Redirect to signup without code after 3 seconds
          setTimeout(() => {
            router.push("/creator-signup")
          }, 3000)
        }
      } catch (error) {
        console.error("[v0] Error validating referral code:", error)
        setStatus("invalid")

        setTimeout(() => {
          router.push("/creator-signup")
        }, 3000)
      }
    }

    validateAndRedirect()
  }, [code, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          {status === "validating" && (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Validando Convite</h2>
                <p className="text-muted-foreground">
                  Verificando o código de indicação <span className="font-mono font-bold">{code}</span>
                </p>
              </div>
            </>
          )}

          {status === "valid" && (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-600">Convite Válido!</h2>
                <p className="text-muted-foreground">
                  Você foi convidada por <span className="font-bold">@{referrerUsername}</span>
                </p>
                <p className="text-sm text-muted-foreground">Redirecionando para o cadastro...</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Junte-se à rede de criadoras</span>
              </div>
            </>
          )}

          {status === "invalid" && (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-red-600">Código Inválido</h2>
                <p className="text-muted-foreground">
                  O código de indicação <span className="font-mono font-bold">{code}</span> não é válido ou está
                  inativo.
                </p>
                <p className="text-sm text-muted-foreground">Redirecionando para o cadastro...</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
