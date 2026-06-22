# CLAUDE.md — Psikolog Platform

Son güncelleme: 23 Haziran 2026  
Stack: Next.js 15 (App Router) · Supabase · Daily.co · İyzico (test modu) · Tailwind CSS v4 · TypeScript · Vercel

---

## Proje Özeti

Online psikoloji seans platformu. Müşteriler psikolog seçer, slot rezerve eder, paket satın alır. Psikologlar takvim yönetir, randevu onaylar/reddeder. Video seans Daily.co üzerinden gerçekleşir.

---

## Dosya Yapısı

```
app/
├── page.tsx                              # Ana sayfa — psikolog listesi + AssessmentWizard
├── layout.tsx                            # Root layout
├── globals.css                           # Tailwind v4 + CSS değişkenleri
│
├── (dashboard)/
│   ├── client/
│   │   ├── page.tsx                      # Müşteri dashboard — data fetch
│   │   ├── ClientDashboard.tsx           # Müşteri dashboard UI (sidebar + 5 sekme)
│   │   ├── book/[psychologistId]/
│   │   │   ├── page.tsx
│   │   │   └── BookingPage.tsx
│   │   └── checkout/
│   │       ├── page.tsx
│   │       └── CheckoutPage.tsx
│   │
│   └── psychologist/
│       ├── page.tsx                      # Psikolog dashboard — data fetch + istatistikler
│       ├── PsychologistDashboard.tsx     # Psikolog dashboard UI
│       └── profile/
│           └── page.tsx                  # Psikolog profil düzenleme
│
├── admin/
│   ├── page.tsx                          # Admin dashboard
│   ├── AdminDashboard.tsx                # Admin UI (6 sekme)
│   └── login/page.tsx                    # Admin login
│
├── api/
│   ├── me/route.ts                       # GET — oturum kullanıcısı + role
│   ├── psychologists/route.ts            # GET — onaylı psikolog listesi
│   ├── questions/route.ts                # GET — soru ağacı
│   ├── assessment/route.ts               # POST — psikolog eşleştirme
│   ├── psychologist/
│   │   ├── slots/route.ts                # GET (haftalık) + POST (slot ekle)
│   │   ├── slots/[slotId]/route.ts       # DELETE (slot sil)
│   │   ├── profile/route.ts              # GET + PUT — psikolog profili
│   │   ├── upload/route.ts               # POST — avatar + belge yükleme
│   │   ├── clients/route.ts              # GET — psikologun danışanları
│   │   ├── appointments/route.ts         # GET — psikologun randevuları (profil ile)
│   │   └── finalize/route.ts             # POST — psikolog başvuru profil güncelle
│   ├── appointments/
│   │   ├── create/route.ts               # POST — paketten randevu oluştur
│   │   ├── manual/route.ts               # POST — manuel randevu (psikolog tarafından)
│   │   ├── [id]/accept/route.ts          # POST — onayla + Daily.co oda oluştur
│   │   ├── [id]/reject/route.ts          # POST — reddet + alternatif öner
│   │   ├── [id]/complete/route.ts        # POST — seansı tamamla
│   │   └── [id]/token/route.ts           # GET — Daily.co token + 5dk kuralı
│   ├── payments/
│   │   └── initiate/route.ts             # POST — TEST MODU (İyzico placeholder)
│   ├── auth/
│   │   ├── register/route.ts             # POST — müşteri kayıt
│   │   └── register-psychologist/route.ts # POST — psikolog kayıt
│   ├── admin/
│   │   ├── stats/route.ts
│   │   ├── psychologists/route.ts        # GET + POST + PATCH
│   │   ├── users/route.ts
│   │   ├── payments/route.ts
│   │   ├── appointments/route.ts
│   │   └── questions/
│   │       ├── route.ts                  # GET + POST
│   │       ├── [id]/route.ts             # PUT + DELETE
│   │       ├── [id]/options/route.ts     # POST
│   │       └── [id]/options/[oid]/route.ts # PUT + DELETE
│   └── cron/
│       └── check-notifications/route.ts  # GET — zamanlanmış bildirimler (her 5dk)
│
├── auth/
│   ├── login/page.tsx                    # Email/şifre + Google login
│   ├── kaydol/page.tsx                   # Email/şifre + Google kayıt
│   ├── callback/route.ts                 # OAuth callback — role'e göre yönlendir
│   ├── callback/psikolog/route.ts        # Psikolog OAuth callback
│   └── psikolog-tamamla/page.tsx         # Psikolog başvuru finalize
│
└── psikolog-ol/
    ├── page.tsx
    └── PsychologistApplyForm.tsx         # Psikolog başvuru formu (OAuth yok)

components/
├── assessment/AssessmentWizard.tsx       # Soru ağacı wizard
├── calendar/
│   ├── WeeklyCalendar.tsx                # 24 saatlik haftalık takvim
│   └── SlotModal.tsx                     # add/delete/approve/detail/completed modları
├── video/
│   └── VideoModal.tsx                    # Daily.co embed, Cambly tarzı UI
└── admin/
    └── QuestionTreeEditor.tsx            # Soru ağacı editörü

lib/
├── supabase/client.ts + server.ts
├── matching/index.ts                     # Psikolog eşleştirme algoritması
├── notifications.ts                      # Bildirim + zamanlama
└── daily/index.ts                        # Daily.co oda + token oluşturma
```

---

## Önemli Mimari Kararlar

### AnyClient Pattern
Supabase type sistemi `update()`/`insert()` için `never` dönüyor. Tüm DB işlemlerinde:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }
const service = createServiceRoleClient() as unknown as AnyClient
```
**Kalıcı çözüm:** `npm run db:types` ile Supabase type generate et.

### Middleware
Sadece dashboard path'lerini korur:
```typescript
matcher: ['/client/:path*', '/psychologist/:path*', '/admin/:path*']
```
`/admin/login` public — middleware'de erken return edilir.

### Role Bazlı Yönlendirme
`auth/callback/route.ts` — OAuth sonrası `users.role`'e göre:
- `client` → `/client`
- `psychologist` → `/psychologist`
- `admin` → `/admin`

---

## Auth Akışı

### Müşteri
- Email/şifre: `/auth/kaydol` → `signUp` → `/api/auth/register` → `/client`
- Google: `/auth/login` → OAuth → `/auth/callback` → `/client`

### Psikolog Başvurusu
- `/psikolog-ol` → form (ad, email, şifre, bio, uzmanlık, fiyat) → `signUp` → `/api/auth/register-psychologist` → `is_approved: false`
- Admin onaylayınca `/auth/login`'den giriş

### Admin
- `/admin/login` — sadece email/şifre, `role: admin` kontrolü

---

## Randevu Akışı

### Yeni Randevu (Test Modu)
1. Slot seç → checkout → `POST /api/payments/initiate`
2. Aynı psikolog için aktif paket varsa `total_sessions_credited` artırılır (birleştirme)
3. Yoksa yeni `payments(status:paid)` kaydı
4. `appointments(status:pending_approval)`, slot → `requested`
5. Psikolog panelinde sarı slot görünür

### Psikolog Onaylama
1. Sarı slot → approve modal → Onayla
2. `POST /api/appointments/[id]/accept`
3. Daily.co gerçek oda oluştur (DAILY_API_KEY zorunlu artık)
4. `appointments(status:scheduled)`, slot → `booked`

### Manuel Randevu (Psikolog)
1. Boş slot → "Randevu Oluştur" → danışan listesi
2. Danışan seç → hak kontrolü (yoksa uyarı, force seçeneği)
3. Direkt `scheduled` olarak oluşturulur, paketten seans düşülür

### Seans Tamamlama
- Psikolog: yeşil slot → "Seansı Bitir" → `POST /api/appointments/[id]/complete`
- `appointments.status: completed`, `slots.status: completed`
- Müşteriye bildirim

---

## Video Modülü

### Erişim Kuralı
- Seans saatinden **5dk önce** → geri sayım ekranı, otomatik bağlanır
- Seans saatinde ve sonrasında → direkt bağlanır
- **95dk sonra** (90dk + 5dk grace) → erişim kapanır

### Daily.co
- `createCallObject()` kullanılıyor (iframe değil)
- Token varsa join'e eklenir, yoksa tokensız bağlanılır
- Psikolog: sağda not alma paneli
- Müşteri: sade görünüm
- "Ayrıl" → sadece modal kapanır, seans bitmez
- "Seansı Bitir" → sadece psikolog, slot modal'ından

---

## Psikolog Profil Alanları

```
profiles tablosu:
- full_name, bio, avatar_url, gender
- specialties: text[]          — uzmanlık alanları
- price_per_session: integer
- is_approved: boolean
- experience_years: integer     — YENİ
- languages: text[]             — YENİ
- approaches: text[]            — YENİ (BDT, EMDR vb.)
- age_groups: text[]            — YENİ
- session_duration: integer     — YENİ (50/60/90 dk)
- session_types: text[]         — YENİ (online/yüz yüze/hibrit)
- education: jsonb              — YENİ [{school, department, year}]
- certificates: jsonb           — YENİ [{name, institution, year, url}]
```

### Storage Buckets
- `avatars` — public, psikolog fotoğrafları
- `certificates` — private, psikolog belgeleri

---

## Slot Status Mapping

| Slot Status | Appointment Status | Renk   | Modal     |
|-------------|-------------------|--------|-----------|
| available   | —                 | Mavi   | delete    |
| requested   | pending_approval  | Sarı   | approve   |
| booked      | scheduled         | Yeşil  | detail    |
| completed   | completed         | Gri    | completed |

---

## Design System — Klinik Mavi

```css
--color-primary:        #1A6BB5;  /* CTA, link, aksan */
--color-navy:           #1D3557;  /* Başlıklar, ana metin */
--color-muted:          #8FA3BF;  /* Alt başlık, placeholder */
--color-page-bg:        #F2F5F9;  /* Dashboard zemin */
--color-surface:        #FFFFFF;  /* Kart, sidebar */
--color-border:         #E4EAF2;  /* Ayırıcı */
--color-success:        #1A7A4A;
--color-warning:        #92600A;
--color-danger:         #B91C1C;
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DAILY_API_KEY=                    # Aktif — gerçek oda oluşturuluyor
CRON_SECRET=
# IYZICO_API_KEY=                 # Henüz aktif değil
# IYZICO_SECRET_KEY=
```

---

## DB Tabloları

| Tablo | Açıklama |
|-------|----------|
| `users` | id, email, role |
| `profiles` | Tüm profil bilgileri (yeni kolonlar eklendi) |
| `slots` | start_time, end_time, status (available/requested/booked/completed) |
| `payments` | Paket kayıtları — birleştirme mantığı aktif |
| `appointments` | Randevular — status: pending_approval/scheduled/completed/cancelled |
| `notifications` | Anlık bildirimler |
| `notification_schedules` | Zamanlanmış bildirimler |
| `questions` | Soru ağacı |
| `question_options` | Seçenekler + dallanma |
| `option_specialties` | Seçenek → uzmanlık ağırlığı |
| `client_assessments` | Assessment sonuçları |

---

## Yapılacaklar

### 🔴 Kritik
1. **İyzico entegrasyonu** — `TEST_MODE = false`, webhook yaz, banner kaldır

### 🟡 Önemli
2. **Psikolog profili müşteri tarafında** — booking sayfasında tam profil gösterimi (eğitim, yaklaşımlar, sertifikalar, diller)
3. **Şifre sıfırlama** — `/auth/sifre-sifirla`
4. **Klinik not sayfası** — seans sonrası psikolog notları
5. **Video seans sonrası** — psikolog → not kaydet, müşteri → değerlendirme ekranı

### 🟢 Nice to Have
6. **`supabase gen types`** — `AnyClient` hack'ini kaldır
7. **`packages` tablosu** — 1/3/6 seanslık paket tanımları, checkout'ta göster
8. **Duplicate dosyalar silinmeli:**
   - `app/api/psychologists - Kopya/` (manuel)
   - `app/api/psychologist/route.ts` (duplicate)
   - `app/api/cron/check-notifications/cron_route.ts` (eski)

---

## Bilinen Sorunlar

- **Geçmiş seanslar** — `completed` enum öncesi oluşan seanslar `scheduled` olarak kaldı. SQL: `UPDATE appointments SET status='completed' WHERE status='scheduled' AND slot_start_time < NOW() - INTERVAL '90 minutes'`
- **Storage policy** — `avatars` ve `certificates` bucket'larının RLS policy'leri manuel oluşturulmalı
- **packages tablosu boş** — checkout'ta varsayılan 1 seanslık paket kullanılıyor

---

## Komutlar

```bash
npm run dev          # Development
npm run build        # Production build
npm run lint         # ESLint
npm run db:types     # Supabase type generate
```
