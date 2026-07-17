type RegisterLoadingProps = {
  label: string
  metrics?: number
}

/** A stable skeleton for data-heavy operational registers. */
export function RegisterLoading({ label, metrics = 0 }: RegisterLoadingProps) {
  return (
    <div aria-busy="true" aria-label={label} className="mx-auto max-w-7xl space-y-5" role="status">
      <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
      {metrics ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: metrics }, (_, index) => (
            <div className="h-20 animate-pulse rounded-xl bg-muted" key={index} />
          ))}
        </div>
      ) : null}
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
