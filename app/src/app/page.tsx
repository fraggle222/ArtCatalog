export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold">Art Catalog</h1>
      <p className="text-zinc-600">
        Catalog and manage artist works from desktop or mobile.
      </p>
      <div className="flex gap-3">
        <a href="/login" className="rounded bg-black px-4 py-2 text-white">
          Admin Login
        </a>
        <a href="/admin" className="rounded border px-4 py-2">
          Go to Dashboard
        </a>
      </div>
    </main>
  );
}
