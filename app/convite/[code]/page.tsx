import type { Metadata } from "next"
import { validateReferralCode, getUserProfile } from "@/lib/firebase/firestore"
import InvitePageClient from "./invite-client"

type Props = {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params

  try {
    // Validate referral code and get creator info
    const codeData = await validateReferralCode(code.toUpperCase())

    if (!codeData) {
      return {
        title: "Convite Inválido - Deluxe Job",
        description: "Este código de convite não é válido ou está inativo.",
      }
    }

    // Get creator profile for more details
    const creatorProfile = await getUserProfile(codeData.creatorId)

    const creatorName = creatorProfile?.displayName || `@${codeData.creatorUsername}`
    const creatorBio = creatorProfile?.bio || "Criadora de conteúdo exclusivo"
    const creatorImage = creatorProfile?.profileImage || "/placeholder.svg"

    return {
      title: `${creatorName} te convidou para a Deluxe Job`,
      description: `${creatorName} está convidando você para se juntar à rede de criadoras da Deluxe Job. ${creatorBio}`,
      openGraph: {
        title: `${creatorName} te convidou para a Deluxe Job`,
        description: `Junte-se à rede de criadoras e comece a monetizar seu conteúdo. ${creatorName} será sua mentora!`,
        images: [
          {
            url: creatorImage,
            width: 1200,
            height: 630,
            alt: `Foto de perfil de ${creatorName}`,
          },
        ],
        type: "website",
        siteName: "Deluxe Job",
      },
      twitter: {
        card: "summary_large_image",
        title: `${creatorName} te convidou para a Deluxe Job`,
        description: `Junte-se à rede de criadoras e comece a monetizar seu conteúdo. ${creatorName} será sua mentora!`,
        images: [creatorImage],
      },
    }
  } catch (error) {
    console.error("[v0] Error generating metadata:", error)
    return {
      title: "Convite - Deluxe Job",
      description: "Junte-se à rede de criadoras da Deluxe Job",
    }
  }
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params
  return <InvitePageClient code={code} />
}
