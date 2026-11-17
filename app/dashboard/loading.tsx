// Shown the moment a dashboard link is clicked (it ships in the prefetched App Shell),
// while the page's data streams in from Supabase.
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="motion-safe:animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-56 bg-rule sm:h-10" />
        <div className="mt-3 h-4 w-full max-w-lg bg-rule/70" />
      </div>
      <div className="border border-rule bg-paper">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4 border-t border-rule px-5 py-4 first:border-t-0">
            <div className="h-4 w-12 bg-rule" />
            <div className="h-4 flex-1 bg-rule/70" />
            <div className="h-6 w-24 bg-rule" />
          </div>
        ))}
      </div>
    </div>
  );
}
