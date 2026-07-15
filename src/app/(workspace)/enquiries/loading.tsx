export default function EnquiriesLoading() {
  return (
    <div aria-live="polite" className="space-y-5" role="status">
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-24 animate-pulse rounded-xl bg-muted" key={index} />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Loading enquiry pipeline</span>
    </div>
  )
}
