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
            background: "radial-gradient(circle, rgba(139, 0, 93, 0.2) 0%, transparent 70%)",
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
              border: "4px solid #8b005d",
              flexShrink: 0,
              boxShadow: "0 0 40px rgba(139, 0, 93, 0.4)",
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
                  fontSize: "56px",
                  fontWeight: "bold",
                  color: "#f8e1f4",
                  marginBottom: "8px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
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
                  fontSize: "24px",
                  color: "#f8e1f4",
                  maxWidth: "500px",
                  lineHeight: "1.4",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {creator.bio.substring(0, 100)}
                {creator.bio.length > 100 ? "..." : ""}
              </div>
            )}

            {/* Stats */}
            <div
              style={{
                display: "flex",
                gap: "40px",
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
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#8b005d",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {creator.followerCount || 0}
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    color: "#c0c0c0",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  Seguidores
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DeLuxe Job Branding */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            right: "40px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#8b005d",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            DeLuxe Job
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#c0c0c0",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Plataforma Premium
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
    console.error("Error generating OG image:", error)
    return new Response("Failed to generate image", { status: 500 })
  }
}
