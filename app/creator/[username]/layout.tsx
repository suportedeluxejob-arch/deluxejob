import type React from "react"
import { getUserByUsername, type CreatorProfile } from "@/lib/firebase/firestore"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: { username: string }
}): Promise<Metadata> {
  try {
    const username = params.username
    const creator = (await getUserByUsername(username)) as CreatorProfile | null

    if (!creator || creator.userType !== "creator") {
      return {
        title: "Perfil não encontrado - DeLuxe Job",
        description: "Esta criadora não existe ou foi removida.",
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://deluxejob.com.br"
    const profileUrl = `${baseUrl}/creator/${creator.username}`

    const ogImageUrl = creator.profileImage || `${baseUrl}/placeholder.svg?height=630&width=1200`

    const title = `${creator.displayName} (@${creator.username}) - DeLuxe Job`
    const description =
      creator.bio ||
      `Confira o perfil de ${creator.displayName} na DeLuxe Job! ⭐ Todos os meus conteúdos disponível aqui!`

    return {
      title,
      description,
      openGraph: {
        title: `Confira o perfil de ${creator.displayName} na DeLuxe Job! ⭐`,
        description: description,
        type: "profile",
        url: profileUrl,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Perfil de ${creator.displayName} no DeLuxe Job`,
          },
        ],
        siteName: "DeLuxe Job",
        locale: "pt_BR",
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description,
        images: [ogImageUrl],
        creator: `@${creator.username}`,
        site: "@deluxejob",
      },
      other: {
        "fb:app_id": "your-facebook-app-id",
        "og:image:width": "1200",
        "og:image:height": "630",
        "og:image:type": "image/jpeg",
      },
      alternates: {
        canonical: profileUrl,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    }
  } catch (error) {
    console.error("[v0] Error generating metadata:", error)
    return {
      title: "DeLuxe Job - Plataforma Premium",
      description: "Plataforma premium de conteúdo exclusivo",
    }
  }
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
