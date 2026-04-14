'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { homeInputsSchema, type HomeInputsSchema } from '@/lib/schemas/home'
import {
  useKkaStore,
  computeProporsiSaham,
  computeCutOffDate,
  computeAkhirPeriodeProyeksiPertama,
} from '@/lib/store/useKkaStore'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const DEFAULTS: HomeInputsSchema = {
  namaPerusahaan: '',
  npwp: '',
  namaSubjekPajak: '',
  npwpSubjekPajak: '',
  jenisSubjekPajak: 'orang_pribadi',
  jenisPerusahaan: 'tertutup',
  objekPenilaian: 'saham',
  jenisInformasiPeralihan: 'lembar_saham',
  jumlahSahamBeredar: 0,
  jumlahSahamYangDinilai: 0,
  nilaiNominalPerSaham: 1,
  tahunTransaksi: new Date().getFullYear(),
  dlomPercent: 0,
  dlocPercent: 0,
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function HomeForm() {
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const setHome = useKkaStore((s) => s.setHome)
  const resetHome = useKkaStore((s) => s.resetHome)
  const resetAll = useKkaStore((s) => s.resetAll)

  const {
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<HomeInputsSchema>({
    resolver: zodResolver(homeInputsSchema),
    defaultValues: DEFAULTS,
    mode: 'onBlur',
  })

  useEffect(() => {
    if (hasHydrated && home) {
      reset(home)
    }
  }, [hasHydrated, home, reset])

  // Auto-save: watch all form values and debounce persist
  const watchedValues = useWatch({ control })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  const flushSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const result = homeInputsSchema.safeParse(watchedValues)
    if (result.success) {
      setHome(result.data)
    }
  }, [watchedValues, setHome])

  useEffect(() => {
    // Skip auto-save on initial mount (data loaded from store)
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const result = homeInputsSchema.safeParse(watchedValues)
      if (result.success) {
        setHome(result.data)
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [watchedValues, setHome])

  // Flush pending save on page unload
  useEffect(() => {
    const handler = () => flushSave()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [flushSave])

  // Derived state — conditional labels (LESSON-016: derive, don't setState)
  const jenisInfo = useWatch({ control, name: 'jenisInformasiPeralihan' })
  const isLembarSaham = jenisInfo === 'lembar_saham'

  const jumlahBeredar = useWatch({ control, name: 'jumlahSahamBeredar' })
  const jumlahDinilai = useWatch({ control, name: 'jumlahSahamYangDinilai' })
  const tahunTransaksi = useWatch({ control, name: 'tahunTransaksi' })

  const proporsi =
    jumlahBeredar > 0
      ? computeProporsiSaham({
          jumlahSahamBeredar: jumlahBeredar,
          jumlahSahamYangDinilai: jumlahDinilai,
        })
      : 0
  const cutOff = tahunTransaksi ? computeCutOffDate({ tahunTransaksi }) : null
  const akhirProyeksi = tahunTransaksi
    ? computeAkhirPeriodeProyeksiPertama({ tahunTransaksi })
    : null

  // Reset confirmation dialogs
  const [showResetHome, setShowResetHome] = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)

  function handleResetHome() {
    resetHome()
    reset(DEFAULTS)
    setShowResetHome(false)
  }

  function handleResetAll() {
    resetAll()
    reset(DEFAULTS)
    setShowResetAll(false)
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Input Master
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          Kertas Kerja Penilaian Bisnis
        </h1>
        {/* Sub-Revisi 1: privacy notice 1 baris */}
        <p className="mt-2 text-[13px] text-ink-muted">
          Seluruh data disimpan lokal di browser Anda. Tidak ada yang dikirim ke server. Auto-save aktif setiap kali form disimpan.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Row 1: Objek Pajak */}
        <Field
          id="namaPerusahaan"
          label="Nama Objek Pajak"
          required
          error={errors.namaPerusahaan?.message}
        >
          <Input
            id="namaPerusahaan"
            placeholder="PT Contoh Sejahtera"
            invalid={!!errors.namaPerusahaan}
            {...register('namaPerusahaan')}
          />
        </Field>

        <Field
          id="npwp"
          label="NPWP"
          required
          error={errors.npwp?.message}
        >
          <Input
            id="npwp"
            placeholder="01.234.567.8-901.000"
            invalid={!!errors.npwp}
            mono
            {...register('npwp')}
          />
        </Field>

        {/* Row 2: Subjek Pajak */}
        <Field
          id="namaSubjekPajak"
          label="Nama Subjek Pajak"
          required
          error={errors.namaSubjekPajak?.message}
        >
          <Input
            id="namaSubjekPajak"
            placeholder="Nama pihak yang mengalihkan"
            invalid={!!errors.namaSubjekPajak}
            {...register('namaSubjekPajak')}
          />
        </Field>

        <Field
          id="npwpSubjekPajak"
          label="NPWP Subjek Pajak"
          required
          error={errors.npwpSubjekPajak?.message}
        >
          <Input
            id="npwpSubjekPajak"
            placeholder="01.234.567.8-901.000"
            invalid={!!errors.npwpSubjekPajak}
            mono
            {...register('npwpSubjekPajak')}
          />
        </Field>

        {/* Row 3: Jenis Subjek Pajak + Jenis Informasi Peralihan */}
        <Field
          id="jenisSubjekPajak"
          label="Jenis Subjek Pajak"
          required
          error={errors.jenisSubjekPajak?.message}
        >
          <Select
            id="jenisSubjekPajak"
            invalid={!!errors.jenisSubjekPajak}
            {...register('jenisSubjekPajak')}
          >
            <option value="orang_pribadi">Orang Pribadi</option>
            <option value="badan">Badan</option>
          </Select>
        </Field>

        <Field
          id="jenisInformasiPeralihan"
          label="Jenis Informasi Peralihan"
          required
          error={errors.jenisInformasiPeralihan?.message}
        >
          <Select
            id="jenisInformasiPeralihan"
            invalid={!!errors.jenisInformasiPeralihan}
            {...register('jenisInformasiPeralihan')}
          >
            <option value="lembar_saham">Lembar Saham</option>
            <option value="modal_disetor">Modal Disetor</option>
          </Select>
        </Field>

        {/* Row 4: Jenis Perusahaan + Objek Penilaian */}
        <Field
          id="jenisPerusahaan"
          label="Jenis Perusahaan"
          required
          error={errors.jenisPerusahaan?.message}
        >
          <Select
            id="jenisPerusahaan"
            invalid={!!errors.jenisPerusahaan}
            {...register('jenisPerusahaan')}
          >
            <option value="tertutup">Tertutup (Private)</option>
            <option value="terbuka">Terbuka (Public)</option>
          </Select>
        </Field>

        <Field
          id="objekPenilaian"
          label="Objek Penilaian"
          required
          error={errors.objekPenilaian?.message}
        >
          <Select
            id="objekPenilaian"
            invalid={!!errors.objekPenilaian}
            {...register('objekPenilaian')}
          >
            <option value="saham">Saham</option>
            <option value="bisnis">Bisnis (Seluruh)</option>
          </Select>
        </Field>

        {/* Row 5: Jumlah — conditional labels */}
        <Field
          id="jumlahSahamBeredar"
          label={isLembarSaham ? 'Jumlah Saham Beredar' : 'Jumlah Modal Disetor 100%'}
          required
          error={errors.jumlahSahamBeredar?.message}
        >
          <Input
            id="jumlahSahamBeredar"
            type="number"
            min={0}
            step={1}
            mono
            invalid={!!errors.jumlahSahamBeredar}
            {...register('jumlahSahamBeredar', { valueAsNumber: true })}
          />
        </Field>

        <Field
          id="jumlahSahamYangDinilai"
          label={isLembarSaham ? 'Jumlah Saham yang Dinilai' : 'Jumlah Modal Disetor yang Dinilai'}
          required
          error={errors.jumlahSahamYangDinilai?.message}
        >
          <Input
            id="jumlahSahamYangDinilai"
            type="number"
            min={0}
            step={1}
            mono
            invalid={!!errors.jumlahSahamYangDinilai}
            {...register('jumlahSahamYangDinilai', { valueAsNumber: true })}
          />
        </Field>

        {/* Row 6: Nilai Nominal + Tahun Transaksi */}
        <Field
          id="nilaiNominalPerSaham"
          label="Nilai Nominal Per Saham (Rp)"
          hint="Diperlukan untuk metode AAM. Default Rp 1 jika tidak diketahui."
          error={errors.nilaiNominalPerSaham?.message}
        >
          <Input
            id="nilaiNominalPerSaham"
            type="number"
            min={1}
            step={1}
            mono
            invalid={!!errors.nilaiNominalPerSaham}
            {...register('nilaiNominalPerSaham', { valueAsNumber: true })}
          />
        </Field>

        <Field
          id="tahunTransaksi"
          label="Tahun Transaksi Pengalihan Saham"
          required
          error={errors.tahunTransaksi?.message}
        >
          <Input
            id="tahunTransaksi"
            type="number"
            min={2000}
            max={2100}
            step={1}
            mono
            invalid={!!errors.tahunTransaksi}
            {...register('tahunTransaksi', { valueAsNumber: true })}
          />
        </Field>
      </section>

      {/* Derived values — Sub-Revisi 6: conditional proporsi label */}
      <section
        aria-label="Nilai Turunan"
        className="rounded-sm border border-grid bg-canvas-raised"
      >
        <header className="border-b border-grid px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Nilai Turunan (Otomatis)
          </p>
        </header>
        <dl className="grid grid-cols-1 divide-y divide-grid md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-5 py-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {isLembarSaham ? 'Proporsi Saham yang Dinilai' : 'Proporsi Modal Disetor yang Dinilai'}
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {formatPercent(proporsi)}
            </dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Cut-off Date
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {cutOff ? formatDate(cutOff) : '—'}
            </dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Akhir Periode Proyeksi 1
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {akhirProyeksi ? formatDate(akhirProyeksi) : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Footer: Reset buttons + auto-save indicator */}
      <footer className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-ink-muted">Otomatis tersimpan</p>

        <button
          type="button"
          onClick={() => setShowResetHome(true)}
          className="rounded-sm border border-grid px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-grid hover:text-ink"
        >
          Reset Halaman Ini
        </button>

        <button
          type="button"
          onClick={() => setShowResetAll(true)}
          className="rounded-sm border border-negative/40 px-3 py-2 text-[13px] font-medium text-negative transition-colors hover:bg-negative/10"
        >
          Reset Seluruh Data
        </button>
      </footer>

      {/* Reset HOME confirmation dialog */}
      {showResetHome && (
        <ConfirmDialog
          title="Reset Data HOME"
          message="Yakin ingin mereset data HOME? Data di halaman lain tidak terpengaruh."
          confirmLabel="Reset HOME"
          onConfirm={handleResetHome}
          onCancel={() => setShowResetHome(false)}
        />
      )}

      {/* Reset ALL confirmation dialog */}
      {showResetAll && (
        <ConfirmDialog
          title="Reset Seluruh Data"
          message="Yakin ingin mereset SELURUH data? Semua input di semua halaman akan dihapus. Tindakan ini tidak bisa dibatalkan."
          confirmLabel="Reset Semua"
          destructive
          onConfirm={handleResetAll}
          onCancel={() => setShowResetAll(false)}
        />
      )}
    </div>
  )
}

// Inline confirmation dialog — no external dependency needed
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-sm border border-grid bg-canvas-raised p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-grid px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-grid"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? 'rounded-sm bg-negative px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-negative/90'
                : 'rounded-sm bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
