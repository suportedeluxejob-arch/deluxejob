import { getUserByUsername, type CreatorProfile } from "@/lib/firebase/firestore"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: { username: string }
}): Promise<Metadata> {
  try {
    const username = params.username as string
    const creator = (await getUserByUsername(username)) as CreatorProfile | null

    if (!creator || creator.userType !== "creator") {
      return {
        title: "Perfil não encontrado",
        description: "Esta criadora não existe ou foi removida.",
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://deluxejob.com"
    const profileUrl = `${baseUrl}/creator/${creator.username}`
    const ogImageUrl = `${baseUrl}/api/og/creator/${creator.username}`

    return {
      title: `${creator.displayName} - DeLuxe Job`,
      description:
        creator.bio ||
        `Confira o perfil de ${creator.displayName} na DeLuxe Job, a plataforma premium de conteúdo exclusivo.`,
      openGraph: {
        title: `${creator.displayName} - DeLuxe Job`,
        description:
          creator.bio ||
          `Confira o perfil de ${creator.displayName} na DeLuxe Job, a plataforma premium de conteúdo exclusivo.`,
        type: "profile",
        url: profileUrl,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${creator.displayName} no DeLuxe Job`,
            type: "image/png",
          },
          {
            url: creator.profileImage || `${baseUrl}/placeholder.svg`,
            width: 400,
            height: 400,
            alt: `${creator.displayName}`,
            type: "image/jpeg",
          },
        ],
        siteName: "DeLuxe Job",
        locale: "pt_BR",
      },
      twitter: {
        card: "summary_large_image",
        title: `${creator.displayName} - DeLuxe Job`,
        description: creator.bio || `Confira o perfil de ${creator.displayName} na DeLuxe Job`,
        images: [ogImageUrl],
      },
      alternates: {
        canonical: profileUrl,
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "DeLuxe Job",
      description: "Plataforma premium de conteúdo exclusivo",
    }
  }
}

export default function Head() {
  return null
}
