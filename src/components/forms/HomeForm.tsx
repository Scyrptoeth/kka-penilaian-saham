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
import { useT } from '@/lib/i18n/useT'

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
  const { t } = useT()
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
          {t('home.section')}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          {t('home.title')}
        </h1>
        {/* Sub-Revisi 1: privacy notice 1 baris */}
        <p className="mt-2 text-[13px] text-ink-muted">
          {t('home.privacyNotice')}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Row 1: Objek Pajak */}
        <Field
          id="namaPerusahaan"
          label={t('home.field.namaObjekPajak')}
          required
          error={errors.namaPerusahaan?.message}
        >
          <Input
            id="namaPerusahaan"
            placeholder={t('home.placeholder.namaPerusahaan')}
            invalid={!!errors.namaPerusahaan}
            {...register('namaPerusahaan')}
          />
        </Field>

        <Field
          id="npwp"
          label={t('home.field.npwp')}
          required
          error={errors.npwp?.message}
        >
          <Input
            id="npwp"
            placeholder={t('home.placeholder.npwp')}
            invalid={!!errors.npwp}
            mono
            {...register('npwp')}
          />
        </Field>

        {/* Row 2: Subjek Pajak */}
        <Field
          id="namaSubjekPajak"
          label={t('home.field.namaSubjekPajak')}
          required
          error={errors.namaSubjekPajak?.message}
        >
          <Input
            id="namaSubjekPajak"
            placeholder={t('home.placeholder.namaSubjekPajak')}
            invalid={!!errors.namaSubjekPajak}
            {...register('namaSubjekPajak')}
          />
        </Field>

        <Field
          id="npwpSubjekPajak"
          label={t('home.field.npwpSubjekPajak')}
          required
          error={errors.npwpSubjekPajak?.message}
        >
          <Input
            id="npwpSubjekPajak"
            placeholder={t('home.placeholder.npwp')}
            invalid={!!errors.npwpSubjekPajak}
            mono
            {...register('npwpSubjekPajak')}
          />
        </Field>

        {/* Row 3: Jenis Subjek Pajak + Jenis Informasi Peralihan */}
        <Field
          id="jenisSubjekPajak"
          label={t('home.field.jenisSubjekPajak')}
          required
          error={errors.jenisSubjekPajak?.message}
        >
          <Select
            id="jenisSubjekPajak"
            invalid={!!errors.jenisSubjekPajak}
            {...register('jenisSubjekPajak')}
          >
            <option value="orang_pribadi">{t('home.option.orangPribadi')}</option>
            <option value="badan">{t('home.option.badan')}</option>
          </Select>
        </Field>

        <Field
          id="jenisInformasiPeralihan"
          label={t('home.field.jenisInfoPeralihan')}
          required
          error={errors.jenisInformasiPeralihan?.message}
        >
          <Select
            id="jenisInformasiPeralihan"
            invalid={!!errors.jenisInformasiPeralihan}
            {...register('jenisInformasiPeralihan')}
          >
            <option value="lembar_saham">{t('home.option.lembarSaham')}</option>
            <option value="modal_disetor">{t('home.option.modalDisetor')}</option>
          </Select>
        </Field>

        {/* Row 4: Jenis Perusahaan + Objek Penilaian */}
        <Field
          id="jenisPerusahaan"
          label={t('home.field.jenisPerusahaan')}
          required
          error={errors.jenisPerusahaan?.message}
        >
          <Select
            id="jenisPerusahaan"
            invalid={!!errors.jenisPerusahaan}
            {...register('jenisPerusahaan')}
          >
            <option value="tertutup">{t('home.option.tertutup')}</option>
            <option value="terbuka">{t('home.option.terbuka')}</option>
          </Select>
        </Field>

        <Field
          id="objekPenilaian"
          label={t('home.field.objekPenilaian')}
          required
          error={errors.objekPenilaian?.message}
        >
          <Select
            id="objekPenilaian"
            invalid={!!errors.objekPenilaian}
            {...register('objekPenilaian')}
          >
            <option value="saham">{t('home.option.saham')}</option>
            <option value="bisnis">{t('home.option.bisnis')}</option>
          </Select>
        </Field>

        {/* Row 5: Jumlah — conditional labels */}
        <Field
          id="jumlahSahamBeredar"
          label={isLembarSaham ? t('home.field.jumlahBeredar') : t('home.field.jumlahModalDisetor')}
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
          label={isLembarSaham ? t('home.field.jumlahDinilai') : t('home.field.jumlahModalDinilai')}
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
          label={t('home.field.nilaiNominal')}
          hint={t('home.hint.nilaiNominal')}
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
          label={t('home.field.tahunTransaksi')}
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
        aria-label={t('home.derived.header')}
        className="rounded-sm border border-grid bg-canvas-raised"
      >
        <header className="border-b border-grid px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {t('home.derived.header')}
          </p>
        </header>
        <dl className="grid grid-cols-1 divide-y divide-grid md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-5 py-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {isLembarSaham ? t('home.derived.proporsiSaham') : t('home.derived.proporsiModal')}
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {formatPercent(proporsi)}
            </dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {t('home.derived.cutOffDate')}
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {cutOff ? formatDate(cutOff) : '—'}
            </dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {t('home.derived.akhirProyeksi')}
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {akhirProyeksi ? formatDate(akhirProyeksi) : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Footer: Reset buttons + auto-save indicator */}
      <footer className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-ink-muted">{t('common.autoSaved')}</p>

        <button
          type="button"
          onClick={() => setShowResetHome(true)}
          className="rounded-sm border border-grid px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-grid hover:text-ink"
        >
          {t('common.resetPage')}
        </button>

        <button
          type="button"
          onClick={() => setShowResetAll(true)}
          className="rounded-sm border border-negative/40 px-3 py-2 text-[13px] font-medium text-negative transition-colors hover:bg-negative/10"
        >
          {t('common.resetAll')}
        </button>
      </footer>

      {/* Reset HOME confirmation dialog */}
      {showResetHome && (
        <ConfirmDialog
          title={t('home.resetTitle')}
          message={t('home.resetMessage')}
          confirmLabel={t('home.resetConfirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleResetHome}
          onCancel={() => setShowResetHome(false)}
        />
      )}

      {/* Reset ALL confirmation dialog */}
      {showResetAll && (
        <ConfirmDialog
          title={t('common.resetAllTitle')}
          message={t('common.resetAllMessage')}
          confirmLabel={t('common.resetAllConfirm')}
          cancelLabel={t('common.cancel')}
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
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
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
            {cancelLabel}
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
