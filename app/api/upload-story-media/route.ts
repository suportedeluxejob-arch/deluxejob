import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo fornecido" }, { status: 400 })
    }

    // Validate file type (images and videos only)
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo inválido. Use imagens (JPG, PNG, GIF, WebP) ou vídeos (MP4, WebM, MOV)" },
        { status: 400 },
      )
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith("video/") ? "50MB" : "10MB"
      return NextResponse.json({ error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}` }, { status: 400 })
    }

    // Upload to Vercel Blob with unique filename
    const timestamp = Date.now()
    const filename = `stories/${timestamp}-${file.name}`

    const blob = await put(filename, file, {
      access: "public",
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      isVideo: file.type.startsWith("video/"),
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }
}
