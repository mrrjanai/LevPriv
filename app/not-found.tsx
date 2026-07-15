export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="text-center">
        <h1 className="text-xl font-medium mb-2">Nothing here</h1>
        <p className="text-base-muted text-sm mb-8">
          This page doesn't exist, or the note it pointed to is gone.
        </p>
        <a
          href="/"
          className="inline-block border border-base-border rounded-md px-5 py-2.5 text-sm hover:border-base-mid transition-colors"
        >
          Go home
        </a>
      </div>
    </main>
  )
}
