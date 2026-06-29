# CLAUDE.md — Menta Psikolog Platformu

Son güncelleme: 26 Haziran 2026
Stack: Next.js 15.x (App Router) · Supabase · Daily.co · İyzico (test modu) · Tailwind CSS v4 · TypeScript · Vercel (Hobby)
Repo: https://github.com/cagridincel/psikolog-platform
Canlı URL: https://psikolog-platform-v1-btjdfuvcg-psikologplatform.vercel.app
Admin: adnan@adnan.com

---

## Proje Özeti

Online psikoloji seans platformu (Menta). Danışanlar psikolog seçer, slot rezerve eder, paket satın alır. Psikologlar takvim yönetir, randevu onaylar/reddeder, klinik not tutar. Video seans Daily.co üzerinden gerçekleşir. Admin tüm sistemi yönetir.

---

## Design System — Klinik Mavi

```css
--color-primary:   #1A6BB5   /* CTA, link, aksan */
--color-navy:      #1D3557   /* Başlıklar, ana metin */
--color-muted:     #8FA3BF   /* Alt başlık, placeholder */
--color-page-bg:   #F2F5F9   /* Dashboard zemin */
--color-surface:   #FFFFFF   /* Kart, sidebar */
--color-border:    #E4EAF2   /* Ayırıcı */
--color-blue-tint: #EBF3FC   /* Soft aksan bg */
--color-success:   #1A7A4A
--color-warning:   #92600A
--color-danger:    #B91C1C
--color-success-tint: #E8F5EE
--color-warning-tint: #FEF3E2
--color-danger-tint:  #FDECEA
```

---

## Dosya Yapısı

```
app/
├── page.tsx                                    # Ana sayfa — psikolog listesi + AssessmentWizard
├── layout.tsx
├── globals.css
│
├── (dashboard)/
│   ├── client/
│   │   ├── page.tsx                            # Data fetch: userId, payments, appointments, notifications
│   │   ├── ClientDashboard.tsx                 # 6 sekme: Ana/Seanslar/Psikologum/Ödemelerim/Mesajlar/Bildirimler
│   │   ├── book/[psychologistId]/
│   │   │   ├── page.tsx                        # getSetting() + tek psikolog kısıtlaması kontrolü
│   │   │   └── BookingPage.tsx                 # TAM profil: eğitim, yaklaşım, sertifika, dil, slot seçimi
│   │   └── checkout/
│   │       ├── page.tsx
│   │       └── CheckoutPage.tsx
│   │
│   └── psychologist/
│       ├── page.tsx                            # Data fetch: slots, appointments(+completed), stats, profiles, hasNote
│       ├── PsychologistDashboard.tsx           # 5 sekme: Takvim/Danışanlarım/Mesajlar/Bildirimler/Profilim
│       ├── profile/page.tsx
│       └── notes/[appointmentId]/
│           ├── page.tsx
│           └── ClinicalNotesPage.tsx           # Klinik not editörü — seans sonucu + şablon kısayolları
│
├── admin/
│   ├── page.tsx                                # adminId, adminName prop
│   ├── AdminDashboard.tsx                      # 8 sekme: Genel/Psikologlar/Kullanıcılar/Ödemeler/Randevular/Soru Ağacı/Mesajlar/Kontroller
│   └── login/page.tsx
│
├── api/
│   ├── me/route.ts
│   ├── psychologists/route.ts
│   ├── questions/route.ts
│   ├── assessment/route.ts
│   ├── psychologist/
│   │   ├── slots/route.ts + [slotId]/route.ts
│   │   ├── profile/route.ts                    # GET + PUT
│   │   ├── upload/route.ts                     # MIME + boyut + uzantı whitelist
│   │   ├── clients/route.ts
│   │   ├── appointments/route.ts               # completed dahil, slot_start_time + hasNote
│   │   └── notes/[appointmentId]/route.ts      # GET + PUT — service role, maybeSingle
│   ├── appointments/
│   │   ├── create/route.ts
│   │   ├── manual/route.ts                     # hak kontrolü + forceCreate
│   │   ├── [id]/accept/route.ts
│   │   ├── [id]/reject/route.ts                # payment_id null kontrolü
│   │   ├── [id]/complete/route.ts              # completed_sessions tablosuna yazar
│   │   └── [id]/token/route.ts                 # 20dk kural
│   ├── payments/initiate/route.ts              # TEST_MODE=true, paket birleştirme
│   ├── conversations/route.ts                  # GET/POST — service role, payment kontrolü
│   ├── conversations/[id]/messages/route.ts    # GET (okundu otomatik) / POST
│   ├── messages/upload/route.ts                # 20MB, whitelist
│   ├── admin/
│   │   ├── stats/route.ts
│   │   ├── psychologists/route.ts
│   │   ├── users/route.ts                      # pagination 50/sayfa
│   │   ├── payments/route.ts
│   │   ├── appointments/route.ts
│   │   ├── questions/route.ts + [id]/ + options/
│   │   ├── settings/route.ts                   # GET/PUT — platform_settings
│   │   └── seed/route.ts                       # Mock kullanıcı oluşturucu (geçici)
│   ├── auth/
│   │   ├── register/route.ts
│   │   └── register-psychologist/route.ts
│   └── cron/check-notifications/route.ts
│
├── auth/
│   ├── login/page.tsx                          # "Şifremi unuttum" linki var
│   ├── kaydol/page.tsx
│   ├── callback/route.ts                       # role'e göre yönlendirme
│   ├── callback/psikolog/route.ts
│   ├── sifre-sifirla/page.tsx                  # YENİ — email gir, link gönder
│   └── sifre-guncelle/page.tsx                 # YENİ — yeni şifre + güç göstergesi
│
└── psikolog-ol/PsychologistApplyForm.tsx

components/
├── assessment/AssessmentWizard.tsx
├── calendar/
│   ├── WeeklyCalendar.tsx                      # Geçmiş slot kontrolleri, available→pasif
│   └── SlotModal.tsx                           # add/delete/approve/detail/completed + "Klinik Not" butonu
├── video/VideoModal.tsx                        # createCallObject, Daily.co type declarations
├── messaging/MessagingPanel.tsx                # Realtime, rol bazlı, okundu tiki, dosya preview
└── admin/
    ├── QuestionTreeEditor.tsx
    └── PlatformControls.tsx                    # Toggle UI, platform_settings

lib/
├── supabase/client.ts + server.ts
├── matching/index.ts
├── notifications.ts                            # Promise.all paralel
├── daily/index.ts
└── settings.ts                                # getSetting(key) → boolean, default true

types/
├── database.types.ts                          # ProfileRow yeni alanlar
└── daily.d.ts                                # Daily.co type declarations (DailyParticipant dahil)
```

---

## Mimari Kararlar

### AnyClient Pattern
Supabase type sistemi `update()`/`insert()` için `never` dönüyor. Tüm DB işlemlerinde:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }
const service = createServiceRoleClient() as unknown as AnyClient
```
Kalıcı çözüm: `npm run db:types` ile Supabase type generate et.

### Service Role vs Anon Client
- **Anon client (`createClient()`):** Auth gerektiren RLS korumalı okumalar
- **Service role (`createServiceRoleClient()`):** RLS bypass — `completed_sessions`, `profiles` arası join, admin işlemleri, conversation katılımcı bilgileri

### Slot Status → Modal Mode
| Slot | Appointment | Renk | Modal |
|------|-------------|------|-------|
| available | — | Mavi | delete |
| requested | pending_approval | Sarı | approve |
| booked | scheduled | Yeşil | detail |
| completed | completed | Gri | completed + klinik not |

### Seans Erişim Kuralı
- **20dk önce:** "Xdk sonra aktif" mesajı
- **Seans süresince (0-95dk):** "Katıl" butonu aktif
- **95dk sonra:** "Seans süresi doldu" — buton gizlenir

### Paket Birleştirme
Aynı psikolog için aktif paket varsa `total_sessions_credited` artırılır, yeni kayıt oluşturulmaz.

### Manuel Randevu
Psikolog danışan seçer → hak kontrolü (forceCreate ile bypass) → direkt `scheduled`

### Tek Psikolog Kısıtlaması
`platform_settings` tablosunda `single_psychologist_restriction` key'i. Admin toggle ile açılıp kapatılır. Başka psikologda kalan seans hakkı varsa booking engellenir. Kendi psikoloğundan almak her zaman serbest (`neq` filtresi).

---

## Auth Akışı

- **Danışan:** `/auth/kaydol` → signUp → `/api/auth/register` → `/client`
- **Psikolog başvuru:** `/psikolog-ol` → form → `/api/auth/register-psychologist` → admin onayı
- **Admin:** `/admin/login` → email/şifre → role:admin kontrolü
- **Şifre sıfırlama:** `/auth/sifre-sifirla` → resetPasswordForEmail → email linki → `/auth/sifre-guncelle`
- **Supabase redirect URLs (production):**
  - `https://psikolog-platform-v1-btjdfuvcg-psikologplatform.vercel.app/auth/callback`
  - `https://psikolog-platform-v1-btjdfuvcg-psikologplatform.vercel.app/auth/callback/psikolog`
  - `https://psikolog-platform-v1-btjdfuvcg-psikologplatform.vercel.app/auth/sifre-guncelle`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback/psikolog`
  - `http://localhost:3000/auth/sifre-guncelle`

---

## Randevu Akışı

### Yeni Randevu (Test Modu)
1. BookingPage → slot seç → "Devam Et"
2. Aktif paket varsa direkt randevu → `POST /api/appointments/create`
3. Yoksa → checkout → `POST /api/payments/initiate` (TEST_MODE)
4. `appointments(status:pending_approval)`, slot → `requested`

### Psikolog Onaylama
1. Sarı slot → approve modal → Onayla
2. `POST /api/appointments/[id]/accept`
3. Daily.co gerçek oda oluşturulur
4. `appointments(status:scheduled)`, slot → `booked`

### Seans Tamamlama
1. Psikolog: yeşil slot → "Seansı Bitir" → `POST /api/appointments/[id]/complete`
2. `appointments.status: completed`, `slots.status: completed`
3. `completed_sessions` tablosuna kayıt eklenir
4. Müşteriye bildirim

### Klinik Not
1. Gri slot → "Klinik Not Ekle / Görüntüle"
2. `/psychologist/notes/[appointmentId]`
3. Seans sonucu seç (Katıldı/Geç katıldı/Katılmadı/İptal)
4. Not yaz → Kaydet → `/psychologist`'e dön

---

## Mesajlaşma Sistemi

### DB Tabloları
- `conversations` (id, last_message_at)
- `conversation_participants` (conversation_id, user_id)
- `messages` (id, conversation_id, sender_id, content, file_url, file_name, file_type, is_read, read_at)
- Storage: `message-files` bucket (public)

### Erişim Kuralları
- **Psikolog ↔ Danışan:** `payments` tablosunda `paid` kayıt zorunlu
- **Admin ↔ Herkes:** Her zaman serbest
- **Danışan:** Sadece kendi psikoloğuyla — psikologId `defaultRecipientId` olarak geçilir, otomatik konuşma açılır/oluşturulur
- **Psikolog/Admin:** "Yeni" butonu → danışan/kullanıcı listesinden seçer

### Özellikler
- Supabase Realtime ile anlık mesaj
- Dosya/resim paylaşımı (20MB, whitelist: jpg/png/webp/gif/pdf/doc/docx)
- Okundu tiki (gönderenden farklı biri mesajı açınca `is_read: true`)
- Unread badge (konuşma listesinde)
- Mesaj yüklenince otomatik scroll

---

## Platform Kontrolleri

### platform_settings Tablosu
```sql
key TEXT PRIMARY KEY
value JSONB
description TEXT
updated_at TIMESTAMPTZ
```

### Mevcut Ayarlar
| Key | Default | Açıklama |
|-----|---------|----------|
| `single_psychologist_restriction` | `true` | Danışanların tek psikologla çalışmasını zorunlu kılar |

### API
- `GET /api/admin/settings` — Tüm ayarları listele
- `PUT /api/admin/settings` — `{key, value}` ile güncelle
- `getSetting(key)` helper → boolean, hata durumunda `true` döner

---

## Video Modülü

### Erişim Kuralı
- 20dk öncesi → `early` (geri sayım)
- Seans içi → `join` (katıl)
- 95dk sonrası → `expired` (süresi doldu)

### Daily.co
- `createCallObject()` (iframe değil)
- Token varsa join'e eklenir
- Psikolog: not alma paneli sağda
- "Ayrıl" → sadece modal kapanır
- "Seansı Bitir" → sadece psikolog yetkisi

---

## Psikolog Profil Alanları

```typescript
profiles tablosu:
full_name, bio, avatar_url, gender
specialties: text[]          // uzmanlık alanları
price_per_session: integer
is_approved: boolean
experience_years: integer
languages: text[]
approaches: text[]           // BDT, EMDR, Gestalt vb.
age_groups: text[]
session_duration: integer    // 50/60/90 dk
session_types: text[]        // Online / Yüz Yüze / Hibrit
education: jsonb             // [{school, department, year}]
certificates: jsonb          // [{name, institution, year, url}]
```

### Storage Buckets
- `avatars` — public
- `certificates` — private
- `message-files` — public

---

## DB Tabloları

| Tablo | Notlar |
|-------|--------|
| `users` | id, email, role (psychologist/client/admin) |
| `profiles` | Tüm profil bilgileri — yeni kolonlar eklendi |
| `slots` | status enum: available/requested/booked/completed |
| `payments` | Paket birleştirme mantığı aktif |
| `appointments` | status: pending_approval/scheduled/completed/cancelled; slot_start_time kolonu |
| `completed_sessions` | clinical_notes, outcome (attended/late/no_show/cancelled) |
| `notifications` | Anlık bildirimler |
| `notification_schedules` | Zamanlanmış bildirimler |
| `conversations` | Mesajlaşma — last_message_at |
| `conversation_participants` | conversation_id + user_id |
| `messages` | content, file_url, is_read, read_at |
| `questions` | Soru ağacı |
| `question_options` | Seçenekler + next_question_id dallanma |
| `option_specialties` | Seçenek → uzmanlık ağırlığı |
| `platform_settings` | key/value/description — admin toggle |

### Önemli Enum Değerleri
```sql
session_outcome: attended | late | no_show | cancelled
slot_status: available | requested | booked | completed
appointment_status: pending_approval | scheduled | completed | cancelled
```

---

## Test & Deploy

### Test Suite (Vitest)
```bash
npm test                    # Tek seferlik
npm run test:watch          # Geliştirme sırasında
npm run test:coverage       # Coverage raporu
```

**Test kapsamı:**
- `lib/matching.ts` — psikolog eşleştirme algoritması
- `lib/settings.ts` — platform ayarları okuma
- `api/conversations` — auth, kendine mesaj engeli
- `api/appointments/complete` + `reject` — auth, yetki, null kontrolü
- `api/upload` — MIME whitelist, boyut limiti
- `components/AppointmentCard` — 20dk/95dk zaman kuralları
- `components/PlatformControls` — toggle, PUT isteği

### Deploy
- **Platform:** Vercel (Hobby)
- **Cron:** cron-job.org (Vercel Hobby cron kısıtı nedeniyle)
  - URL: `https://psikolog-platform-v1-btjdfuvcg-psikologplatform.vercel.app/api/cron/check-notifications`
  - Header: `x-cron-secret: CRON_SECRET`
  - Schedule: her 5 dakika
- **ESLint/TS:** `next.config.ts`'te `ignoreDuringBuilds: true`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DAILY_API_KEY=              # Aktif — gerçek oda oluşturuluyor
CRON_SECRET=menta123
# IYZICO_API_KEY=           # Henüz aktif değil
```

---

## Mock Data

### Kullanıcılar (40 adet)
20 psikolog + 20 danışan. Email formatı: `ad@ad.com`

**Psikologlar:**
| Email | İsim | Uzmanlık |
|-------|------|----------|
| ayse@ayse.com | Dr. Ayşe Kaya | Anksiyete, Depresyon, EMDR |
| mehmet@mehmet.com | Uzm. Psk. Mehmet Demir | Travma, Aile Terapisi |
| zeynep@zeynep.com | Psk. Zeynep Arslan | Çocuk ve Ergen |
| can@can.com | Dr. Can Yıldız | OKB, Sosyal Kaygı |
| selipsi@selin.com | Psk. Selin Çelik | Yeme Bozukluğu |
| berk@berk.com | Uzm. Psk. Berk Şahin | Bağımlılık |
| fatma@fatma.com | Dr. Fatma Koç | Depresyon, Psikanaliz |
| emrepsi@emre.com | Psk. Emre Yılmaz | Kariyer, Tükenmişlik |
| elifpsi@elif.com | Uzm. Psk. Elif Kara | Çift Terapisi |
| murat@murat.com | Dr. Murat Aydın | Mindfulness, Stres |
| nihan@nihan.com | Psk. Nihan Öztürk | Yas, Kayıp |
| serkan@serkan.com | Uzm. Psk. Serkan Bulut | Öfke Yönetimi |
| busra@busra.com | Dr. Büşra Aktaş | Sosyal Fobi |
| taner@taner.com | Psk. Taner Çakır | Kimlik, ACT |
| sibel@sibel.com | Dr. Sibel Yıldırım | TSSB, EMDR |
| denizpsi@deniz.com | Uzm. Psk. Deniz Erdoğan | Yaşlı Psikolojisi |
| alp@alp.com | Psk. Alp Korkmaz | Spor Psikolojisi |
| pinar@pinar.com | Dr. Pınar Arslan | Perinatal |
| kerem@kerem.com | Uzm. Psk. Kerem Avcı | DEHB, Otizm |
| melis@melis.com | Dr. Melis Güneş | Kültürlerarası |

**Danışanlar:** ahmet@ahmet.com, merve@merve.com, burak@burak.com, selindanisan@selin.com, onur@onur.com, aylin@aylin.com, mert@mert.com, gizem@gizem.com, cem@cem.com, irem@irem.com, kaan@kaan.com, denizdanisan@deniz.com, elifdanisan@elif.com, serhan@serhan.com, aysedanisan@ayse.com, tolga@tolga.com, naz@naz.com, furkan@furkan.com, ceren@ceren.com, emredanisan@emre.com

**Şifre sorunu:** `auth.users`'a direkt SQL insert ile şifreler çalışmıyor. Seed route (`/api/admin/seed`) Vercel'de 404 veriyor. Geçici çözüm: Supabase Dashboard'dan manuel şifre güncelleme veya seed route'u debug etme.

---

## Bu Oturumda Tamamlananlar (27 Haziran 2026)

### Ana Sayfa Yenilendi
- Hero, Nasıl Çalışır, Neden Menta, İstatistikler, Psikolog listesi, Yorumlar, SSS, CTA banner, Footer bölümleri eklendi
- Mobil carousel (yorumlar), accordion (SSS), sayaçlı istatistikler
- Scroll-triggered count-up animasyonu

### Mobil Responsive
- Dashboard sidebar → `hidden md:flex`, `md:ml-56` ile desktop-only
- Danışan ve psikolog dashboard'larına bottom navigation eklendi
- Grid'ler: `grid-cols-4` → `grid-cols-2 md:grid-cols-4`
- Padding: `p-8` → `p-4 md:p-8`
- BookingPage: 2 kolon grid mobilde tek kolon

### Auth Akışı Düzeltmeleri
- **next parametresi kayboluyor:** Kaydol sayfası `useSearchParams` ile `next` okuyor, kayıt sonrası oraya yönlendiriyor
- **Google OAuth:** `redirectTo`'ya `?next=` eklendi
- **Login → Kayıt linki:** `?next=` parametresi taşınıyor
- **Psikolog booking engeli:** Ana sayfada buton `disabled`, booking `page.tsx`'te server-side role kontrolü (`/psychologist`'e yönlendirme)

---

## Yapılacaklar

### 🔴 Kritik
1. **Mock data şifre sorunu** — Seed route'u Vercel'de çalıştır veya kullanıcıları Supabase dashboard'dan manuel oluştur
2. **İyzico entegrasyonu** — production'a geçiş, webhook, TEST_MODE kaldır

### 🟡 Önemli
3. **Video seans sonrası** — danışan değerlendirme ekranı
4. **Admin — psikolog değişim akışı** — danışanın psikologunu admin panelinden değiştirebilmeli

### 🟢 Nice to Have
5. **`supabase gen types`** — `AnyClient` hack'ini kaldır
6. **`packages` tablosu** — 1/3/6 seanslık paket tanımları, checkout'ta göster
7. **Test suite genişletme** — mesajlaşma, klinik not, platform kontrolleri için testler
8. **Seed route'u sil** — mock data tamamlanınca `app/api/admin/seed/route.ts` silinmeli

---

## Bilinen Sorunlar

- **Mock kullanıcı şifreleri** — `auth.users`'a direkt SQL insert ile şifre çalışmıyor; Supabase Dashboard'dan manuel eklemek gerekiyor
- **Seed route 404** — Vercel'de `app/api/admin/seed/route.ts` deploy olmadı
- **Storage policy** — `avatars`, `certificates`, `message-files` bucket RLS policy'leri manuel oluşturulmalı
- **packages tablosu boş** — checkout'ta varsayılan 1 seanslık paket kullanılıyor
- **next.config.ts TS hatası** — `eslint` property TypeScript'te `NextConfig`'de tanımsız görünüyor ama build çalışıyor

---

## Komutlar

```bash
npm run dev              # Development
npm run build            # Production build (ESLint/TS ignore aktif)
npm run lint             # ESLint
npm run test             # Vitest
npm run test:coverage    # Coverage raporu
npm run db:types         # Supabase type generate
```
