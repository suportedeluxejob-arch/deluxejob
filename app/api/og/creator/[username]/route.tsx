import { getUserByUsername } from "@/lib/firebase/firestore"
import { ImageResponse } from "next/og"

// export const runtime = "edge"

export async function GET(request: Request, { params }: { params: { username: string } }) {
  try {
    const username = params.username as string

    const creator = await getUserByUsername(username)

    if (!creator || creator.userType !== "creator") {
      return new Response("Creator not found", { status: 404 })
    }

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0b0b0b 0%, #1a0a14 100%)",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient effect */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(139, 0, 93, 0.3) 0%, transparent 70%)",
            borderRadius: "50%",
            top: "-200px",
            right: "-200px",
          }}
        />

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "40px",
            zIndex: 1,
            width: "100%",
          }}
        >
          {/* Creator Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "280px",
              height: "280px",
              borderRadius: "50%",
              border: "5px solid #8b005d",
              flexShrink: 0,
              boxShadow: "0 0 50px rgba(139, 0, 93, 0.5)",
              background: "#1a0a14",
              overflow: "hidden",
            }}
          >
            {creator.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.profileImage || "/placeholder.svg"}
                alt={creator.displayName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: "120px",
                  fontWeight: "bold",
                  color: "#8b005d",
                }}
              >
                {creator.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Creator Info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              flex: 1,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "60px",
                  fontWeight: "bold",
                  color: "#f8e1f4",
                  marginBottom: "8px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  lineHeight: 1.1,
                }}
              >
                {creator.displayName}
              </div>
              <div
                style={{
                  fontSize: "32px",
                  color: "#c0c0c0",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                @{creator.username}
              </div>
            </div>

            {creator.bio && (
              <div
                style={{
                  fontSize: "26px",
                  color: "#f8e1f4",
                  maxWidth: "550px",
                  lineHeight: "1.4",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {creator.bio.substring(0, 120)}
                {creator.bio.length > 120 ? "..." : ""}
              </div>
            )}

            {/* Stats */}
            <div
              style={{
                display: "flex",
                gap: "50px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#8b005d",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {creator.followerCount
                    ? creator.followerCount >= 1000000
                      ? `${(creator.followerCount / 1000000).toFixed(1)}M`
                      : creator.followerCount >= 1000
                        ? `${(creator.followerCount / 1000).toFixed(1)}K`
                        : creator.followerCount
                    : "0"}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    color: "#c0c0c0",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  Seguidores
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#8b005d",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {creator.satisfaction || 98}%
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    color: "#c0c0c0",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  Satisfação
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DeLuxe Job Branding */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "40px",
            right: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#8b005d",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              DeLuxe Job
            </div>
            <div
              style={{
                fontSize: "18px",
                color: "#c0c0c0",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Plataforma Premium de Conteúdo Exclusivo
            </div>
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#8b005d",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            ⭐
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error generating OG image:", error)
    return new Response("Failed to generate image", { status: 500 })
  }
}
