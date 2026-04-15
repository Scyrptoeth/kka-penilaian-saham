'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AksesForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [nip, setNip] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const trimmed = nip.trim()
    if (!trimmed) {
      setError('NIP Pendek Wajib Diisi')
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/akses', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nip: trimmed }),
        })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (res.ok && data.ok) {
          const from = searchParams.get('from')
          const target = from && from.startsWith('/') ? from : '/'
          router.replace(target)
          router.refresh()
          return
        }
        setError(data.error ?? 'Gagal Memverifikasi NIP Pendek. Coba Lagi')
      } catch {
        setError('Terjadi Kesalahan Jaringan. Coba Lagi')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-canvas-raised border border-grid px-6 py-7"
      noValidate
    >
      <div>
        <label htmlFor="nip" className="block text-xs font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">
          NIP Pendek Penilai
        </label>
        <input
          id="nip"
          name="nip"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          pattern="\d*"
          maxLength={12}
          value={nip}
          onChange={(e) => setNip(e.target.value.replace(/[^\d]/g, ''))}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'nip-error' : undefined}
          className="w-full bg-canvas border border-grid-strong px-4 py-3 font-mono text-lg tracking-wider tabular-nums text-ink outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-focus/30 disabled:opacity-50"
          placeholder="Masukkan NIP Pendek Anda"
        />
        {error && (
          <p id="nip-error" role="alert" className="mt-2 text-sm text-negative">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || nip.trim().length === 0}
        className="w-full bg-ink text-canvas font-mono uppercase tracking-[0.2em] text-xs py-3.5 border-2 border-ink hover:bg-transparent hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:text-canvas"
      >
        {pending ? 'Memverifikasi…' : 'Masuk'}
      </button>
    </form>
  )
}
