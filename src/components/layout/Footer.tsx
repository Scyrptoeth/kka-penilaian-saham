export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-grid bg-canvas-raised px-4 py-10 md:px-8 md:py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-8">
          <div aria-hidden className="hidden md:block" />
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/Scyrptoeth/kka-penilaian-saham"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Repository GitHub KKA Penilaian Saham"
              className="text-ink-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <GithubIcon />
            </a>
            <a
              href="tel:+6282294116001"
              className="flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <PhoneIcon />
              <span>Saran &amp; Kendala: 0822-9411-6001 (Dedek)</span>
            </a>
          </div>
        </div>
        <div className="border-t border-grid pt-6">
          <p className="text-center text-sm text-ink-muted">
            &copy; {currentYear} . Dibuat dengan{' '}
            <HeartIcon />
            {' '}untuk Kamu.
          </p>
        </div>
      </div>
    </footer>
  )
}

function GithubIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.94c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.92-.39 2.9-.39.98 0 1.98.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.77 1.06.77 2.13v3.16c0 .31.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="#ef4444"
      stroke="#ef4444"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-label="hati"
      className="inline-block -translate-y-0.5"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  )
}
