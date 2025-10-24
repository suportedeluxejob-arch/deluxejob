export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4" />
          <div className="h-20 bg-muted rounded-lg mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}
