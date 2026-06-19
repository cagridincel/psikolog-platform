# CLAUDE.md — Psikolog Platform

Son güncelleme: 18 Haziran 2026  
Stack: Next.js 15 (App Router) · Supabase · Daily.co · İyzico (test modu) · Tailwind CSS v4 · TypeScript · Vercel

---

## Proje Özeti

Online psikoloji seans platformu. Müşteriler psikolog seçer, slot rezerve eder, paket satın alır. Psikologlar takvim yönetir, randevu onaylar/reddeder. Video seans Daily.co üzerinden gerçekleşir.

---

## Dosya Yapısı

```
app/
├── page.tsx                          # Ana sayfa — psikolog listesi + AssessmentWizard
├── layout.tsx                        # Root layout
├── globals.css                       # Tailwind v4
│
├── (dashboard)/
│   ├── client/
│   │   ├── page.tsx                  # Müşteri dashboard — data fetch
│   │   ├── ClientDashboard.tsx       # Müşteri dashboard UI (sidebar + tabs)
│   │   ├── book/[psychologistId]/
│   │   │   ├── page.tsx              # Slot seçim sayfası — data fetch
│   │   │   └── BookingPage.tsx       # Slot seçim UI
│   │   └── checkout/
│   │       ├── page.tsx              # Checkout — data fetch
│   │       └── CheckoutPage.tsx      # Checkout UI (paket + ödeme)
│   │
│   └── psychologist/
│       ├── page.tsx                  # Psikolog dashboard — data fetch + istatistikler
│       └── PsychologistDashboard.tsx # Psikolog dashboard UI (sidebar + takvim)
│
├── api/
│   ├── me/route.ts                   # GET — oturum kullanıcısı + role
│   ├── psychologists/route.ts        # GET — onaylı psikolog listesi
│   ├── psychologist/
│   │   ├── route.ts                  # GET — onaylı psikolog listesi (duplicate, silinecek)
│   │   ├── slots/route.ts            # GET (haftalık) + POST (slot ekle)
│   │   ├── slots/[slotId]/route.ts   # DELETE (slot sil)
│   │   └── finalize/route.ts         # POST — psikolog başvuru profil güncelle
│   ├── appointments/
│   │   ├── create/route.ts           # POST — paketten randevu oluştur
│   │   ├── [id]/accept/route.ts      # POST — randevu onayla + Daily.co oda oluştur
│   │   └── [id]/reject/route.ts      # POST — randevu reddet + alternatif öner
│   ├── payments/
│   │   └── initiate/route.ts         # POST — TEST MODU: payment + appointment oluştur
│   ├── assessment/route.ts           # POST — soru cevaplarını al, psikolog eşleştir
│   ├── questions/route.ts            # GET — soru ağacı
│   ├── auth/
│   │   └── register/route.ts         # POST — kayıt sonrası users+profiles oluştur
│   └── cron/
│       └── check-notifications/route.ts  # GET — zamanlanmış bildirimleri işle (her 5dk)
│
├── auth/
│   ├── login/page.tsx                # Email/şifre + Google login
│   ├── kaydol/page.tsx               # Email/şifre + Google kayıt
│   ├── callback/route.ts             # OAuth callback — role'e göre yönlendir
│   ├── callback/psikolog/route.ts    # Psikolog OAuth callback
│   └── psikolog-tamamla/page.tsx     # Psikolog başvuru finalize (sessionStorage → API)
│
└── psikolog-ol/
    ├── page.tsx
    └── PsychologistApplyForm.tsx     # Psikolog başvuru formu

components/
├── assessment/AssessmentWizard.tsx   # Soru ağacı wizard (ana sayfada modal)
└── calendar/
    ├── WeeklyCalendar.tsx            # Haftalık takvim grid
    └── SlotModal.tsx                 # Slot işlem modalı (add/delete/approve/detail)

hooks/
├── useNotifications.ts              # Realtime bildirim hook
└── useCountdown.ts                  # Geri sayım hook

lib/
├── supabase/
│   ├── client.ts                    # Browser client
│   └── server.ts                    # Server client + createServiceRoleClient
├── matching/index.ts                # Psikolog eşleştirme algoritması
├── notifications.ts                 # Bildirim gönderme + zamanlama
├── daily/index.ts                   # Daily.co oda oluşturma
└── index.ts                         # Re-exports

types/
└── database.types.ts                # Tüm DB type'ları + Database shape

middleware.ts                        # Auth — /client, /psychologist, /admin korur
vercel.json                          # Cron: /api/cron/check-notifications her 5dk
```

---

## Önemli Mimari Kararlar

### Supabase Type Sorunu
Supabase client `Database` generic'ini doğru resolve etmiyor — `update()` ve `insert()` parametreleri `never` dönüyor. **Geçici çözüm:** `AnyClient` pattern kullanılıyor:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }
const service = createServiceRoleClient() as unknown as AnyClient
```

Bu pattern şu dosyalarda kullanılıyor: `accept/route.ts`, `reject/route.ts`, `create/route.ts`, `callback/route.ts`, `notifications.ts`, `psychologist/page.tsx`, `client/page.tsx`, `api/me/route.ts`

**Kalıcı çözüm:** `npm run db:types` ile Supabase'in kendi type'larını generate et:
```bash
supabase gen types typescript --project-id <project-id> > types/database.types.ts
```

### Service Role Client
RLS bypass gereken işlemlerde `createServiceRoleClient()` kullanılır. Sadece server-side API route'larında çağrılır, asla client'ta expose edilmez.

### Middleware
Sadece dashboard path'lerini korur — API route'larına dokunmaz:
```typescript
matcher: ['/client/:path*', '/psychologist/:path*', '/admin/:path*']
```

### Role Bazlı Yönlendirme
`auth/callback/route.ts` — OAuth login sonrası `users.role`'e göre:
- `client` → `/client`
- `psychologist` → `/psychologist`  
- `admin` → `/admin`
- `next` query param varsa öncelikli kullanılır

---

## Auth Akışı

### Müşteri Kaydı (Email)
1. `/auth/kaydol` → `supabase.auth.signUp()`
2. Session açılırsa → `POST /api/auth/register` → `users` + `profiles` insert
3. `/client`'a yönlendir

### Müşteri Kaydı (Google)
1. `/auth/kaydol` veya `/auth/login` → `signInWithOAuth(google)`
2. `/auth/callback` → yeni kullanıcıysa `users(role:client)` + `profiles` insert
3. Role'e göre yönlendir

### Psikolog Başvurusu
1. `/psikolog-ol` → form doldur → sessionStorage'a kaydet
2. Google ile giriş → `/auth/callback/psikolog`
3. `users(role:psychologist)` + temel `profiles` insert
4. `/auth/psikolog-tamamla` → sessionStorage'dan form verisi → `POST /api/psychologist/finalize`
5. `/psychologist` → "Hesabınız inceleniyor" (is_approved: false)
6. Admin Supabase'de `is_approved: true` yapar → tam erişim

---

## Randevu Akışı

### Yeni Randevu (Test Modu)
1. Ana sayfa → psikolog seç → `/client/book/[id]`
2. Slot seç → aktif paket yoksa `/client/checkout`
3. Checkout → `POST /api/payments/initiate` (TEST_MODE=true)
4. `payments(status:paid)` + `appointments(status:pending_approval)` oluştur
5. Slot → `requested`
6. `scheduleApprovalNotifications()` çağrılır (0/12/20. saat hatırlatması)
7. Psikolog panelinde sarı slot görünür

### Aktif Paketten Randevu
1. `/client/book/[id]` → aktif paket varsa "Randevu Talebi Gönder"
2. `POST /api/appointments/create` → paket kontrol + appointment + slot güncelle

### Psikolog Onaylama
1. Sarı slot'a tıkla → `approve` modalı
2. "Onayla" → `POST /api/appointments/[id]/accept`
3. Daily.co oda oluştur (DAILY_API_KEY yoksa dummy URL)
4. `appointments(status:scheduled)`, `slots(status:booked)`
5. İki tarafa bildirim

### Psikolog Reddetme
1. `POST /api/appointments/[id]/reject`
2. `appointments(status:cancelled)`, `slots(status:available)`, `payments(status:cancelled)`
3. Alternatif psikolog önerileri DB'ye kayıt
4. Müşteriye bildirim

---

## Psikolog Dashboard

### Takvim
- `WeeklyCalendar` — 08:00-21:00 arası, Pzt-Paz
- Boş hücreye tıkla → `add` modalı → slot ekle
- Mavi slot (available) → `delete` modalı
- Sarı slot (requested) → `approve` modalı — danışan adı + onayla/reddet
- Yeşil slot (booked) → `detail` modalı

### Slot Status Mapping
| Slot Status | Appointment Status | Renk   | Modal   |
|-------------|-------------------|--------|---------|
| available   | —                 | Mavi   | delete  |
| requested   | pending_approval  | Sarı   | approve |
| booked      | scheduled         | Yeşil  | detail  |
| completed   | completed         | Gri    | —       |

### Hafta Navigasyonu
Hafta değiştirilince `/api/psychologist/slots?start=...&end=...` fetch edilir. Appointments state'i sayfa yüklendiğinde gelir, hafta değişince güncellenmez — sadece o haftanın slotları güncellenir.

---

## Bildirim Sistemi

### Zamanlanmış Bildirimler (`notification_schedules` tablosu)
Randevu oluşturunca `scheduleApprovalNotifications()` çağrılır:
- `immediate` — hemen
- `reminder_12h` — 12 saat sonra
- `reminder_4h` — 20 saat sonra ("4 saat kaldı")

Vercel cron her 5 dakikada `/api/cron/check-notifications` çağırır. Bu endpoint zamanı gelmiş bildirimleri işler. Authorization: `Bearer ${CRON_SECRET}` header gerekir.

### Realtime Bildirimler
`useNotifications` hook — Supabase Realtime ile `notifications` tablosunu dinler. Yeni kayıt gelince anında badge güncellenir.

---

## İyzico Entegrasyonu (TEST MODU)

`api/payments/initiate/route.ts` dosyasında:
```typescript
const TEST_MODE = true  // ← İyzico aktif olunca false yap
```

Test modunda gerçek ödeme alınmaz, direkt `payments(status:paid)` kaydı oluşturulur.

**İyzico aktif olunca yapılacaklar:**
1. `TEST_MODE = false`
2. `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` env'e ekle
3. Route'taki `// TODO: İyzico` bloğunu doldur
4. İyzico webhook'u için `/api/webhooks/iyzico` route'u yaz
5. Checkout sayfasındaki test modu banner'ı kaldır

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Daily.co (opsiyonel — yoksa dummy URL kullanılır)
DAILY_API_KEY=

# Vercel Cron güvenliği
CRON_SECRET=

# İyzico (henüz aktif değil)
# IYZICO_API_KEY=
# IYZICO_SECRET_KEY=
```

---

## Veritabanı Tabloları

| Tablo | Açıklama |
|-------|----------|
| `users` | Auth kullanıcıları — id, email, role |
| `profiles` | Profil bilgileri — full_name, avatar_url, bio, specialties, price_per_session, is_approved, gender |
| `slots` | Psikolog müsaitlik slotları — start_time, end_time, status |
| `payments` | Ödeme paketleri — amount_paid, total_sessions_credited, sessions_used, status |
| `appointments` | Randevular — payment_id, client_id, psychologist_id, slot_id, status, meeting_room_url |
| `notifications` | Anlık bildirimler — user_id, title, description, is_read |
| `notification_schedules` | Zamanlanmış bildirimler — scheduled_at, is_sent, notification_type |
| `psychologist_recommendations` | Red sonrası alternatif öneriler |
| `packages` | Seans paket tanımları (henüz doldurulmadı) |
| `questions` | Assessment soru ağacı |
| `question_options` | Soru seçenekleri — next_question_id, meta_value |
| `option_specialties` | Seçenek → uzmanlık ağırlığı |
| `client_assessments` | Müşteri assessment sonuçları |

---

## Yapılacaklar (Öncelik Sırasına Göre)

### 🔴 Kritik — Sıradaki
1. **Admin paneli** (`/admin`) — yeni design system ile sıfırdan yaz
2. **Soru ağacı yönetimi** — admin paneli içinde
3. **UI yenileme — tüm sayfalar** — violet → klinik mavi, aşağıda sayfa listesi var
4. **Daily.co video modülü** — modal, Cambly tarzı UI, 2dk kala link aktif
5. **İyzico entegrasyonu** — hesap aktif olunca `TEST_MODE = false`, webhook yaz
6. **Paket birleştirme** — aynı psikolog için aktif paket varken yeni satın alımda `total_sessions_credited` mevcut pakete eklenir
7. **Müşteri dashboard — Ödemelerim sekmesi** — satın alınan paketler, kalan/kullanılan seans, durum

---

## UI Yenileme — Etkilenen Sayfalar

Tüm violet (#7C3AED, bg-violet-*, text-violet-*, border-violet-*) referansları klinik mavi design system token'larıyla değiştirilecek.

### Sayfa Listesi

| Dosya | Değişiklik |
|-------|-----------|
| `app/page.tsx` | Header renkleri, butonlar, psikolog kartları |
| `app/auth/login/page.tsx` | Buton, focus ring, logo |
| `app/auth/kaydol/page.tsx` | Buton, focus ring, logo |
| `app/psikolog-ol/PsychologistApplyForm.tsx` | Buton, seçenek pill'leri, adım ekranları |
| `app/(dashboard)/client/ClientDashboard.tsx` | Sidebar, nav aktif rengi, tüm butonlar, badge'ler, kartlar |
| `app/(dashboard)/client/book/[psychologistId]/BookingPage.tsx` | Slot seçim renkleri, butonlar |
| `app/(dashboard)/client/checkout/CheckoutPage.tsx` | Paket kartları, ödeme butonu, test banner |
| `app/(dashboard)/psychologist/PsychologistDashboard.tsx` | Sidebar, nav, istatistik kartları, uyarı banner |
| `components/calendar/WeeklyCalendar.tsx` | Slot renkleri (available/requested/booked), takvim grid |
| `components/calendar/SlotModal.tsx` | Modal butonlar, başlıklar |
| `components/assessment/AssessmentWizard.tsx` | Soru kartları, seçenekler, ilerleme göstergesi |

### Renk Değişim Tablosu

| Eski (Violet) | Yeni (Klinik Mavi) |
|---------------|-------------------|
| `bg-violet-600` | `bg-[#1A6BB5]` |
| `bg-violet-50` | `bg-[#EBF3FC]` |
| `text-violet-600` | `text-[#1A6BB5]` |
| `text-violet-700` | `text-[#1D3557]` |
| `border-violet-*` | `border-[#E4EAF2]` |
| `focus:ring-violet-500` | `focus:ring-[#1A6BB5]` |
| `hover:bg-violet-700` | `hover:bg-[#155a9a]` |
| Zemin `#F5F5F7` | `#F2F5F9` |
| Sidebar beyaz | `#FFFFFF` border `#E4EAF2` |

### 🟡 Önemli
5. **Psikolog profil düzenleme** — bio, fiyat, uzmanlık, avatar (`/psychologist/profile`)
6. **Klinik not sayfası** — seans sonrası psikolog notları (`/psychologist/notes/[appointmentId]`)
7. **Şifre sıfırlama** — `/auth/sifre-sifirla`

### 🟢 Nice to Have
8. **`supabase gen types`** — `AnyClient` hack'ini kaldır
9. **`packages` tablosunu doldur** — 1/3/6 seanslık paket tanımları
10. **Duplicate dosyalar silinmeli:**
    - `app/api/psychologists - Kopya/` (manuel sil)
    - `app/api/psychologist/route.ts` (duplicate)
    - `app/api/cron/check-notifications/cron_route.ts` (eski isim)
    - `app/api/psychologists/slots/` (eski route'lar)
11. **Console.log temizliği** — `payments/initiate/route.ts`'te debug log kaldı

---

## Admin Paneli Detayı

### Giriş
- `/admin/login` — ayrı sayfa, sadece email/şifre (Google yok)
- `users.role = 'admin'` olan hesaplar girebilir
- Yanlış role → `/admin/login?error=unauthorized`
- Middleware zaten `/admin/*` koruyor, her API'de `role === 'admin'` kontrolü

### Bölümler

**1. Genel Bakış**
- Toplam kullanıcı, aktif psikolog, bu ay seans, bu ay gelir (istatistik kartları)
- Son 30 günlük seans + gelir grafiği
- Onay bekleyen psikolog sayısı (badge uyarısı)

**2. Psikolog Yönetimi**
- Bekleyen başvurular — profil detayı, onayla/reddet
- Aktif psikologlar — askıya al, profil düzenle
- Reddedilenler — tekrar aktifleştir
- **Yeni Psikolog Ekle** — admin formu (ad, email, şifre, bio, uzmanlık, fiyat, cinsiyet) → direkt `is_approved: true` olarak oluşturulur

**3. Kullanıcı Yönetimi**
- Müşteri listesi — kayıt tarihi, toplam seans, aktif paket
- Arama + filtreleme
- Kullanıcı detay sayfası — randevu geçmişi, ödemeler

**4. Ödeme Geçmişi**
- Tüm payment kayıtları — tarih, miktar, durum, müşteri, psikolog
- Filtreleme (tarih, durum, psikolog)
- Toplam gelir özeti

**5. Seans Geçmişi**
- Tüm appointment'lar — durum, taraflar, tarih
- Tamamlanan/iptal/bekleyen filtreleri

**6. Soru Ağacı Yönetimi** — aşağıda detay

---

## Soru Ağacı Yönetimi Detayı

### DB Yapısı
```
questions
  id, text, order_index, meta_key

question_options
  id, question_id, text, next_question_id, meta_value

option_specialties
  option_id, specialty_tag, weight
```

### Admin UI Özellikleri
- **Soru listesi** — sıra numarasıyla, düzenle/sil
- **Soru ekle/düzenle** — metin, meta_key (cinsiyet/yaş filtresi için)
- **Seçenek yönetimi** — her sorunun altında seçenekler, ekle/düzenle/sil
- **Dallanma ayarı** — seçeneğin hangi soruya gittiği (next_question_id) dropdown
- **Uzmanlık puanı** — seçeneğin hangi uzmanlığa kaç puan verdiği (option_specialties)
- **Meta değer** — cinsiyet tercihi, yaş grubu vb. filtreler için
- **Görsel ağaç önizleme** — hangi sorudan hangisine dallandığını akış diyagramı olarak göster
- **Sıra değiştirme** — drag & drop veya ok butonları ile

### API Route'ları (yazılacak)
```
GET  /api/admin/questions          — tüm sorular + seçenekler + uzmanlıklar
POST /api/admin/questions          — soru ekle
PUT  /api/admin/questions/[id]     — soru güncelle
DEL  /api/admin/questions/[id]     — soru sil
POST /api/admin/questions/[id]/options        — seçenek ekle
PUT  /api/admin/questions/[id]/options/[oid]  — seçenek güncelle
DEL  /api/admin/questions/[id]/options/[oid]  — seçenek sil
```

---

## Video Modülü Detayı

### Sayfa
`/seans/[appointmentId]` — dashboard üzerinde modal olarak açılır

### Özellikler
- `@daily-co/daily-js` SDK (iframe değil, tam kontrol)
- Karşı taraf büyük ortada, kendi görüntü sağ alt PiP
- Psikolog: sağda not alma paneli (danışan görmez)
- Müşteri: sade görünüm
- Alt kontrol bar: mikrofon, kamera, ekran paylaşımı, ayarlar, bitir
- Üst bar: seans adı, süre sayacı, bağlantı durumu
- Seans bitince: psikolog → not kaydet ekranı, müşteri → değerlendirme ekranı

### 2 Dakika Kuralı
"Seansa Katıl" butonuna basılınca:
1. API'ye sor — `slot_start_time` kontrolü
2. 2 dakikadan fazla varsa → geri sayım göster, otomatik aktifleşince modal aç
3. 2 dakika veya daha az kaldıysa → direkt modal aç
4. Seans saati geçmişse → "Seans süresi doldu" göster

---

## Bilinen Sorunlar

- **Psikolog başvuru formu** — sessionStorage kullanıyor çünkü OAuth callback server-side. Alternatif: form verisini URL param veya DB draft olarak sakla.
- **Hafta değişince appointments güncellenmez** — `PsychologistDashboard`'da `appointments` prop olarak geliyor, hafta değişince yeniden fetch edilmiyor. Geçici çözüm: sayfa refresh. Düzeltmek için `fetchWeekSlots` içinde appointments da fetch edilmeli.
- **`packages` tablosu boş** — Checkout'ta paket kartları gösterilmiyor, varsayılan "1 Seans" kullanılıyor.
- **Google OAuth + Psikolog başvurusu** — Daha önce Google ile giriş yapmış biri `/psikolog-ol`'dan başvurursa `existing` kullanıcı sayılıp rolü değişmez. Düzeltmek için callback'te rol update logic eklenmeli.

---

## Komutlar

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run db:types     # Supabase type generate (bağlı proje gerekir)
```

---

## Design System — Klinik Mavi

Tasarım dili: Apple minimal + klinik premium. Violet kaldırıldı, tüm platform bu token'larla yeniden yazılacak.

### Renk Paleti

```css
/* Ana renkler */
--color-primary:        #1A6BB5;  /* Klinik mavi — CTA, link, aksan */
--color-primary-hover:  #5B9BD5;  /* Hover */
--color-primary-tint:   #EBF3FC;  /* Badge, aktif nav, highlight */
--color-navy:           #1D3557;  /* Başlıklar, ana metin */
--color-muted:          #8FA3BF;  /* Alt başlık, placeholder, muted */

/* Yüzeyler */
--color-page-bg:        #F2F5F9;  /* Dashboard zemin */
--color-surface:        #FFFFFF;  /* Kart, sidebar, header */
--color-border:         #E4EAF2;  /* Kart kenarı, ayırıcı */

/* Semantik */
--color-success:        #1A7A4A;
--color-success-tint:   #E8F5EE;
--color-warning:        #92600A;
--color-warning-tint:   #FEF3E2;
--color-danger:         #B91C1C;
--color-danger-tint:    #FDECEA;
```

### Tipografi

```
Display / H1  → 22px, weight 500, color navy, letter-spacing -0.02em
H2            → 17px, weight 500, color navy, letter-spacing -0.01em
H3 / Kart     → 14px, weight 500, color navy
Body          → 13px, weight 400, color navy, line-height 1.6
Caption       → 11px, weight 400, color muted
Label / Tag   → 10px, weight 500, color muted, letter-spacing 0.08em, uppercase
```

### Spacing Skalası
4 · 8 · 12 · 16 · 24 · 32 · 48px

### Border Radius
- Kart, modal: 10-12px
- Buton, input: 7px
- Badge, pill: 20px
- Avatar: 50%

### Butonlar
```
Primary:    bg #1A6BB5, color white, radius 7px, padding 7px 16px
Secondary:  bg #EBF3FC, color #1A6BB5, radius 7px
Ghost:      bg transparent, border #E4EAF2, color navy, radius 7px
Danger:     bg #B91C1C, color white (sadece sil/reddet/çıkış)
```

### Badge'ler
```
Onaylı / Tamamlandı:  bg #E8F5EE, color #1A7A4A
Onay Bekliyor:         bg #FEF3E2, color #92600A
İptal / Red:           bg #FDECEA, color #B91C1C
Bilgi / Aktif:         bg #EBF3FC, color #1A6BB5
```

### Layout
```
Sidebar genişliği: 220px (w-55 veya sabit 220px)
Header yüksekliği: 48px
Kart padding: 16px 20px
Page padding: 24px
```

### Tüm Platform Yeniden Yazılacak
Mevcut violet (#7C3AED) referansları kaldırılacak. Etkilenen dosyalar:
- `ClientDashboard.tsx`
- `PsychologistDashboard.tsx`
- `app/auth/login/page.tsx`
- `app/auth/kaydol/page.tsx`
- `app/psikolog-ol/PsychologistApplyForm.tsx`
- `app/page.tsx`
- Tüm yeni yazılacak sayfalar bu token'larla başlangıçtan yazılacak
