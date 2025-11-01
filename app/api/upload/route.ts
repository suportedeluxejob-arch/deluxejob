import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo fornecido" }, { status: 400 })
    }

    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Apenas imagens e vídeos são permitidos" }, { status: 400 })
    }

    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return NextResponse.json(
        {
          error: `Arquivo muito grande (${sizeMB}MB). Máximo 4MB. Por favor, comprima o ${isVideo ? "vídeo" : "arquivo"} antes de enviar.`,
        },
        { status: 413 },
      )
    }

    try {
      const blob = await put(file.name, file, {
        access: "public",
      })

      return NextResponse.json({
        url: blob.url,
        filename: file.name,
        size: file.size,
        type: file.type,
      })
    } catch (blobError: any) {
      console.error("Vercel Blob error:", blobError)
      return NextResponse.json(
        {
          error: "Erro ao fazer upload para o armazenamento. Tente novamente ou use um arquivo menor.",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Falha no upload. Tente novamente." }, { status: 500 })
  }
}
