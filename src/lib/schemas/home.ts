import { z } from 'zod'

export const homeInputsSchema = z.object({
  // Objek Pajak
  namaPerusahaan: z
    .string()
    .min(1, 'Nama objek pajak wajib diisi')
    .max(200, 'Nama terlalu panjang'),
  npwp: z
    .string()
    .min(1, 'NPWP wajib diisi')
    .regex(/^[\d.\-]+$/, 'Format NPWP tidak valid'),
  // Subjek Pajak
  namaSubjekPajak: z
    .string()
    .min(1, 'Nama subjek pajak wajib diisi')
    .max(200, 'Nama terlalu panjang'),
  npwpSubjekPajak: z
    .string()
    .min(1, 'NPWP subjek pajak wajib diisi')
    .regex(/^[\d.\-]+$/, 'Format NPWP tidak valid'),
  jenisSubjekPajak: z.enum(['orang_pribadi', 'badan']),
  // Informasi perusahaan
  jenisPerusahaan: z.enum(['tertutup', 'terbuka']),
  objekPenilaian: z.enum(['saham', 'bisnis']),
  jenisInformasiPeralihan: z.enum(['lembar_saham', 'modal_disetor']),
  // Data kuantitatif
  jumlahSahamBeredar: z
    .number({ error: 'Wajib diisi' })
    .int('Harus bilangan bulat')
    .positive('Harus lebih besar dari nol'),
  jumlahSahamYangDinilai: z
    .number({ error: 'Wajib diisi' })
    .int('Harus bilangan bulat')
    .positive('Harus lebih besar dari nol'),
  nilaiNominalPerSaham: z
    .number()
    .positive('Harus lebih besar dari nol'),
  tahunTransaksi: z
    .number({ error: 'Tahun transaksi wajib diisi' })
    .int()
    .min(2000, 'Tahun minimal 2000')
    .max(2100, 'Tahun maksimal 2100'),
  dlomPercent: z.number().min(0).max(1),
  dlocPercent: z.number().min(-1).max(1),
})
  .refine(
    (data) => data.jumlahSahamYangDinilai <= data.jumlahSahamBeredar,
    {
      message: 'Jumlah yang dinilai tidak boleh melebihi total',
      path: ['jumlahSahamYangDinilai'],
    }
  )

export type HomeInputsSchema = z.infer<typeof homeInputsSchema>
