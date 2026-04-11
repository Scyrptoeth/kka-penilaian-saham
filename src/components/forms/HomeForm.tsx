'use client'

import { useEffect } from 'react'
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
import { Button } from '@/components/ui/Button'

const DEFAULTS: HomeInputsSchema = {
  namaPerusahaan: '',
  npwp: '',
  jenisPerusahaan: 'tertutup',
  jumlahSahamBeredar: 0,
  jumlahSahamYangDinilai: 0,
  tahunTransaksi: new Date().getFullYear(),
  objekPenilaian: 'saham',
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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isSubmitSuccessful },
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

  function onSubmit(data: HomeInputsSchema) {
    setHome(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Input Master
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          Kertas Kerja Penilaian Bisnis
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Seluruh data disimpan lokal di browser Anda. Tidak ada yang dikirim ke server. Auto-save
          aktif setiap kali form disimpan.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          id="namaPerusahaan"
          label="Nama Perusahaan"
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
          hint="Format: 15 digit (contoh: 01.234.567.8-901.000)"
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

        <Field
          id="jumlahSahamBeredar"
          label="Jumlah Saham Beredar"
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
          label="Jumlah Saham yang Dinilai"
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
              Proporsi Saham yang Dinilai
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

      <footer className="flex items-center gap-4">
        <Button type="submit" disabled={!isDirty && !!home}>
          Simpan
        </Button>
        {isSubmitSuccessful && !isDirty && (
          <span className="text-xs font-medium text-positive" role="status">
            ✓ Tersimpan ke penyimpanan lokal
          </span>
        )}
      </footer>
    </form>
  )
}
