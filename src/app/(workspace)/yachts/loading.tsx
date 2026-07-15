export default function YachtsLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading yachts">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div className="h-24 animate-pulse rounded-xl bg-muted" key={item} />)}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
