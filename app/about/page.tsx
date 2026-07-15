export default function AboutPage() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="w-full max-w-2xl mx-auto animate-fadeIn">
        <h1 className="font-display text-3xl tracking-tight mb-3">About LevPriv</h1>
        <p className="text-base-muted text-sm mb-10">
          A small tool built around one idea: some things aren't meant to stick around.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-base-white font-medium mb-2">Why this exists</h2>
            <p className="text-base-muted">
              Most messaging tools are built to remember everything forever. LevPriv does the
              opposite. You write a note, decide how long it should live — or whether it should
              vanish the instant someone reads it — and share a link. After that, it's gone.
              No archive, no account holding onto it, nothing to accidentally leak later.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">What we believe</h2>
            <p className="text-base-muted">
              Privacy shouldn't require a sign-up form. Every note on LevPriv is reachable only
              by whoever holds its link, encrypted before it ever touches a database, and
              destroyed automatically — whether that's in three minutes or seven days. There's
              no dashboard of your personal history sitting on a server somewhere. Just the
              note, its lifespan, and then nothing.
            </p>
          </section>

          <section>
            <h2 className="text-base-white font-medium mb-2">Who it's for</h2>
            <p className="text-base-muted">
              Sharing a password with a colleague. Sending a sensitive thought to a friend.
              Passing along something you'd rather not have sitting in a chat history six months
              from now. LevPriv is built for the small, private moments that don't need to be
              permanent.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
