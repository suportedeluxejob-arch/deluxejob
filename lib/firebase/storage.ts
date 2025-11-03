export const deleteImageFromBlob = async (imageUrl: string): Promise<void> => {
  try {
    // Extrai o nome do arquivo da URL do Blob
    const urlParts = imageUrl.split("/")
    const fileName = urlParts[urlParts.length - 1]

    // Remove da Vercel Blob Storage
    await fetch(`/api/blob/delete?url=${encodeURIComponent(imageUrl)}`, {
      method: "DELETE",
    })

    console.log("[v0] Image deleted from Blob:", fileName)
  } catch (error) {
    console.error("[v0] Error deleting image from Blob:", error)
  }
}
