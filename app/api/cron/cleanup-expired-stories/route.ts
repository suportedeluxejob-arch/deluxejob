import { NextResponse } from "next/server"
import { deleteExpiredStories } from "@/lib/firebase/firestore"

// Esta rota será chamada automaticamente pelo Vercel Cron Jobs
// Configure no vercel.json: { "crons": [{ "path": "/api/cron/cleanup-expired-stories", "schedule": "0 * * * *" }] }
export async function GET() {
  try {
    console.log("[v0] Starting cleanup of expired stories...")
    const deletedCount = await deleteExpiredStories()

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired stories`,
      deletedCount,
    })
  } catch (error) {
    console.error("[v0] Error in cleanup cron job:", error)
    return NextResponse.json({ error: "Failed to cleanup expired stories" }, { status: 500 })
  }
}
