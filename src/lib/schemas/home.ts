import { z } from 'zod'

export const homeInputsSchema = z.object({
  namaPerusahaan: z
    .string()
    .min(1, 'Nama perusahaan wajib diisi')
    .max(200, 'Nama terlalu panjang'),
  npwp: z
    .string()
    .min(1, 'NPWP wajib diisi')
    .regex(/^[\d.\-]+$/, 'Format NPWP tidak valid'),
  jenisPerusahaan: z.enum(['tertutup', 'terbuka']),
  jumlahSahamBeredar: z
    .number({ error: 'Jumlah saham beredar wajib diisi' })
    .int('Harus bilangan bulat')
    .positive('Harus lebih besar dari nol'),
  jumlahSahamYangDinilai: z
    .number({ error: 'Jumlah saham yang dinilai wajib diisi' })
    .int('Harus bilangan bulat')
    .positive('Harus lebih besar dari nol'),
  tahunTransaksi: z
    .number({ error: 'Tahun transaksi wajib diisi' })
    .int()
    .min(2000, 'Tahun minimal 2000')
    .max(2100, 'Tahun maksimal 2100'),
  objekPenilaian: z.enum(['saham', 'bisnis']),
  dlomPercent: z.number().min(0).max(1),
  dlocPercent: z.number().min(-1).max(1),
})
  .refine(
    (data) => data.jumlahSahamYangDinilai <= data.jumlahSahamBeredar,
    {
      message: 'Saham yang dinilai tidak boleh melebihi saham beredar',
      path: ['jumlahSahamYangDinilai'],
    }
  )

export type HomeInputsSchema = z.infer<typeof homeInputsSchema>
