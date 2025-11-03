import { del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Deleta o arquivo do Vercel Blob
    await del(url)

    return NextResponse.json({ success: true, message: "File deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting from Blob:", error)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
