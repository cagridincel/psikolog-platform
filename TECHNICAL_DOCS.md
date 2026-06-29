# Menta Platform — Teknik Dokümantasyon

> Hazırlanma tarihi: 26 Haziran 2026  
> Bu döküman, projeye yeni katılan yazılımcı ve analistler için hazırlanmıştır.  
> Kod tabanını anlamak, yeni özellik geliştirmek ve hata gidermek için başvuru kaynağıdır.

---

## İçindekiler

1. [Sistem Genel Bakış](#1-sistem-genel-bakış)
2. [Teknoloji Stack'i](#2-teknoloji-stacki)
3. [Proje Kurulumu](#3-proje-kurulumu)
4. [Mimari](#4-mimari)
5. [Veritabanı Tasarımı](#5-veritabanı-tasarımı)
6. [Kimlik Doğrulama ve Yetkilendirme](#6-kimlik-doğrulama-ve-yetkilendirme)
7. [API Katmanı](#7-api-katmanı)
8. [İş Akışları](#8-iş-akışları)
9. [Video Seans Modülü](#9-video-seans-modülü)
10. [Mesajlaşma Sistemi](#10-mesajlaşma-sistemi)
11. [Bildirim Sistemi](#11-bildirim-sistemi)
12. [Psikolog Eşleştirme Algoritması](#12-psikolog-eşleştirme-algoritması)
13. [Platform Kontrolleri](#13-platform-kontrolleri)
14. [Frontend Bileşen Mimarisi](#14-frontend-bileşen-mimarisi)
15. [Test Stratejisi](#15-test-stratejisi)
16. [Deploy ve Altyapı](#16-deploy-ve-altyapı)
17. [Bilinen Sorunlar ve Teknik Borç](#17-bilinen-sorunlar-ve-teknik-borç)
18. [Yeni Özellik Geliştirme Rehberi](#18-yeni-özellik-geliştirme-rehberi)

---

## 1. Sistem Genel Bakış

Menta, danışanları psikologlarla buluşturan bir online terapi platformudur. Üç farklı kullanıcı rolü vardır:

```
┌─────────────────────────────────────────────────────────┐
│                      MENTA PLATFORM                      │
├───────────────┬───────────────────┬─────────────────────┤
│    DANIŞAN    │     PSİKOLOG      │       ADMİN         │
│               │                   │                     │
│ • Psikolog ara│ • Takvim yönet    │ • Psikolog onayla   │
│ • Seans al    │ • Randevu onayla  │ • İstatistik gör    │
│ • Video seans │ • Video seans     │ • Soru ağacı yönet  │
│ • Mesajlaş    │ • Klinik not tut  │ • Platform kontrol  │
│ • Ödeme yap   │ • Mesajlaş        │ • Mesajlaş          │
└───────────────┴───────────────────┴─────────────────────┘
```

**Temel iş akışı:**
1. Danışan kayıt olur → soru ağacından geçer → psikolog önerisi alır
2. Uygun psikologu seçer → slot seçer → ödeme yapar
3. Psikolog randevuyu onaylar → Daily.co video odası oluşturulur
4. Seans gerçekleşir → psikolog klinik not girer → danışan bildirim alır

---

## 2. Teknoloji Stack'i

| Katman | Teknoloji | Versiyon | Açıklama |
|--------|-----------|----------|----------|
| Framework | Next.js | 15.x | App Router, Server Components |
| Dil | TypeScript | 5.x | Strict mode |
| Veritabanı | Supabase (PostgreSQL) | — | Auth + DB + Storage + Realtime |
| Stil | Tailwind CSS | v4 | CSS variables ile custom design system |
| Video | Daily.co | — | WebRTC tabanlı video görüşme |
| Ödeme | İyzico | — | Test modunda, henüz aktif değil |
| Deploy | Vercel | Hobby | Otomatik CI/CD |
| Test | Vitest | 1.x | Unit + Component testleri |
| Cron | cron-job.org | — | Vercel Hobby kısıtı nedeniyle harici |

---

## 3. Proje Kurulumu

### Gereksinimler
- Node.js 20+
- npm 10+
- Supabase hesabı
- Daily.co hesabı (video için)

### Adımlar

```bash
# 1. Repo'yu klonla
git clone https://github.com/cagridincel/psikolog-platform.git
cd psikolog-platform

# 2. Bağımlılıkları yükle
npm install

# 3. Environment variables
cp .env.example .env.local
# .env.local'i düzenle (aşağıya bak)

# 4. Geliştirme sunucusu
npm run dev
```

### Environment Variables

```env
# Supabase — Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...    # Sadece server-side

# Daily.co — Dashboard > Developers > API Keys
DAILY_API_KEY=your_daily_api_key

# Cron güvenlik anahtarı (istediğin string)
CRON_SECRET=menta123

# İyzico (henüz aktif değil)
# IYZICO_API_KEY=
# IYZICO_SECRET_KEY=
```

---

## 4. Mimari

### Next.js App Router Yapısı

```
app/
├── (dashboard)/          ← Grup route — layout'u ortak
│   ├── client/           ← Danışan dashboard'u
│   └── psychologist/     ← Psikolog dashboard'u
├── admin/                ← Admin panel
├── api/                  ← API Route Handlers (server-only)
├── auth/                 ← Auth sayfaları
└── psikolog-ol/          ← Psikolog başvuru sayfası
```

### Request Akışı

```
Kullanıcı isteği
    │
    ▼
middleware.ts          ← Oturum kontrolü, korumalı path'leri koru
    │
    ▼
Page/Layout (Server Component)   ← DB'den veri çek, props geç
    │
    ▼
Client Component       ← UI render, kullanıcı etkileşimi
    │
    ▼
API Route Handler      ← İş mantığı, DB yazma, dış servis çağrısı
    │
    ▼
Supabase               ← PostgreSQL + RLS
```

### İki Farklı Supabase Client

Bu ayrımı anlamak kritik:

```typescript
// 1. ANON CLIENT — lib/supabase/server.ts
// Cookie tabanlı, kullanıcı oturumunu taşır
// RLS (Row Level Security) kuralları uygulanır
// Sadece o kullanıcının görebileceği verileri getirir
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

// 2. SERVICE ROLE CLIENT — lib/supabase/server.ts
// RLS'i bypass eder — tüm verilere erişir
// SADECE API route'larında kullanılır, never client-side
// Dikkat: Bu key'i asla frontend'e sızdırma!
const service = createServiceRoleClient()
```

**Ne zaman hangisi kullanılır:**
- `createClient()`: Kullanıcının kendi verilerini okuyacağı sorgular
- `createServiceRoleClient()`: Birden fazla kullanıcının verisini birleştirme, admin işlemleri, completed_sessions okuma

### AnyClient Pattern

TypeScript tip sistemi Supabase client'ının `update()`/`insert()` işlemleri için `never` dönmesine neden oluyor. Geçici workaround:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }
const service = createServiceRoleClient() as unknown as AnyClient

// Artık type hatasız kullanılabilir
await service.from('appointments').update({ status: 'completed' }).eq('id', id)
```

**Kalıcı çözüm:** `npm run db:types` komutu ile Supabase'den güncel TypeScript tipleri generate edilmeli.

---

## 5. Veritabanı Tasarımı

### Tablo İlişkileri

```
auth.users (Supabase Auth)
    │
    ├── public.users (id = auth.users.id)
    │       role: psychologist | client | admin
    │
    └── public.profiles (id = auth.users.id)
            Tüm profil bilgileri

public.slots (psikolog takvim slotları)
    │
    └── public.appointments
            │
            ├── public.payments (paket bilgisi)
            ├── public.profiles (client + psychologist)
            └── public.completed_sessions
                    clinical_notes, outcome

public.conversations
    │
    ├── public.conversation_participants
    └── public.messages

public.questions → public.question_options → public.option_specialties
public.notifications
public.notification_schedules
public.platform_settings
```

### Kritik Tablolar

#### profiles
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
full_name TEXT NOT NULL
bio TEXT
avatar_url TEXT
gender TEXT                    -- 'male' | 'female' | null
specialties TEXT[]             -- ['Anksiyete', 'Depresyon', ...]
price_per_session INTEGER
is_approved BOOLEAN DEFAULT false
experience_years INTEGER
languages TEXT[]               -- ['Türkçe', 'İngilizce']
approaches TEXT[]              -- ['BDT', 'EMDR', ...]
age_groups TEXT[]              -- ['Yetişkin (26-64)', ...]
session_duration INTEGER       -- 50 | 60 | 90
session_types TEXT[]           -- ['Online', 'Yüz Yüze']
education JSONB                -- [{school, department, year}]
certificates JSONB             -- [{name, institution, year, url}]
```

#### slots
```sql
id UUID PRIMARY KEY
psychologist_id UUID REFERENCES auth.users(id)
start_time TIMESTAMPTZ NOT NULL
end_time TIMESTAMPTZ NOT NULL
status slot_status DEFAULT 'available'
  -- ENUM: available | requested | booked | completed
```

#### appointments
```sql
id UUID PRIMARY KEY
payment_id UUID REFERENCES payments(id)   -- NULL olabilir (manuel randevu)
client_id UUID REFERENCES auth.users(id)
psychologist_id UUID REFERENCES auth.users(id)
slot_id UUID REFERENCES slots(id)
status appointment_status
  -- ENUM: pending_approval | scheduled | completed | cancelled
meeting_room_url TEXT          -- Daily.co oda URL'i
slot_start_time TIMESTAMPTZ    -- Slots tablosundan kopyalanır (performance)
rejection_reason TEXT
rejected_at TIMESTAMPTZ
approval_deadline TIMESTAMPTZ
```

#### payments
```sql
id UUID PRIMARY KEY
client_id UUID REFERENCES auth.users(id)
psychologist_id UUID REFERENCES auth.users(id)
amount_paid INTEGER            -- Kuruş cinsinden
total_sessions_credited INTEGER  -- Satın alınan seans sayısı
sessions_used INTEGER DEFAULT 0  -- Kullanılan seans sayısı
status payment_status          -- ENUM: pending | paid | cancelled | refunded
iyzico_payment_id TEXT         -- TEST-timestamp (test modunda)
cancelled_at TIMESTAMPTZ
cancelled_reason TEXT
```

#### completed_sessions
```sql
id UUID PRIMARY KEY
appointment_id UUID REFERENCES appointments(id)
client_id UUID REFERENCES auth.users(id)
psychologist_id UUID REFERENCES auth.users(id)
actual_start_time TIMESTAMPTZ
actual_end_time TIMESTAMPTZ
duration_minutes INTEGER DEFAULT 50
outcome session_outcome
  -- ENUM: attended | late | no_show | cancelled
clinical_notes TEXT            -- Psikologun klinik notları (gizli)
```

#### messages
```sql
id UUID PRIMARY KEY
conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE
sender_id UUID REFERENCES users(id)
content TEXT                   -- Metin mesajı (NULL olabilir, dosya varsa)
file_url TEXT                  -- Storage'daki dosya URL'i
file_name TEXT
file_type TEXT                 -- 'image/jpeg', 'application/pdf' vb.
is_read BOOLEAN DEFAULT false
read_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Row Level Security (RLS)

Supabase'de her tablo için RLS politikaları tanımlıdır. Örnek:

```sql
-- users tablosu: Kullanıcı sadece kendi kaydını görebilir
CREATE POLICY "users: self read" ON public.users
  FOR SELECT USING (
    (id = auth.uid()) OR (current_user_role() = 'admin'::user_role)
  );

-- messages tablosu: Sadece konuşma katılımcıları görebilir
CREATE POLICY "messages: katılımcılar görebilir" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );
```

**Not:** `createServiceRoleClient()` tüm RLS politikalarını bypass eder. Bu yüzden sadece server-side API route'larda kullanılmalıdır.

---

## 6. Kimlik Doğrulama ve Yetkilendirme

### Middleware (`middleware.ts`)

Her request şuradan geçer:

```typescript
// Korumalı path'ler
const PROTECTED_PREFIXES = ['/client', '/psychologist', '/admin']

export async function middleware(request: NextRequest) {
  // Supabase oturumunu cookie'den okur ve yeniler
  const { data: { user } } = await supabase.auth.getUser()
  
  // Korumalı path + kullanıcı yok → login sayfasına yönlendir
  if (isProtected && !user) {
    redirect(pathname.startsWith('/admin') ? '/admin/login' : '/auth/login')
  }
}
```

**Önemli:** Middleware sadece oturum açık/kapalı kontrolü yapar. Role kontrolü her sayfanın kendi `page.tsx`'inde yapılır.

### Auth Akışları

#### 1. Danışan Kaydı (Email/Şifre)
```
/auth/kaydol → supabase.auth.signUp() → email doğrulama
     → /auth/callback → public.users INSERT (role:'client')
     → public.profiles INSERT → /client
```

#### 2. Google OAuth
```
/auth/login → supabase.auth.signInWithOAuth({provider:'google'})
     → Google consent screen
     → /auth/callback?code=xxx → exchangeCodeForSession()
     → users tablosunda var mı? → yoksa INSERT → role'e göre yönlendir
```

#### 3. Psikolog Başvurusu
```
/psikolog-ol → form doldur (ad, email, şifre, bio, uzmanlık, fiyat)
     → POST /api/auth/register-psychologist
     → signUp() + users INSERT (role:'psychologist') + profiles INSERT (is_approved:false)
     → Admin onayına kadar giriş yapamaz
```

#### 4. Admin Girişi
```
/admin/login → supabase.auth.signInWithPassword()
     → /api/admin/stats'tan role kontrol edilir
     → role !== 'admin' → /admin/login?error=unauthorized
```

#### 5. Şifre Sıfırlama
```
/auth/sifre-sifirla → supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://domain.com/auth/sifre-guncelle'
})
     → Kullanıcıya email gönderilir
     → Link'e tıklanır → /auth/sifre-guncelle → onAuthStateChange('PASSWORD_RECOVERY')
     → supabase.auth.updateUser({ password: newPassword })
```

### Role Bazlı Koruma

Her `page.tsx`'te explicit role kontrolü yapılır:

```typescript
// app/admin/page.tsx
const { data: userData } = await db
  .from('users').select('role').eq('id', user.id).single()

if (userData?.role !== 'admin') redirect('/admin/login?error=unauthorized')
```

---

## 7. API Katmanı

### Dizin Yapısı

```
app/api/
├── psychologist/           ← Psikolog işlemleri
│   ├── slots/              ← Takvim slot yönetimi
│   ├── profile/            ← Profil okuma/güncelleme
│   ├── appointments/       ← Randevu listesi
│   ├── clients/            ← Danışan listesi
│   ├── upload/             ← Dosya yükleme
│   └── notes/[id]/         ← Klinik notlar
├── appointments/[id]/      ← Randevu eylemleri
│   ├── accept/             ← Onayla + Daily.co oda oluştur
│   ├── reject/             ← Reddet + bildirim
│   ├── complete/           ← Tamamla + completed_sessions
│   └── token/              ← Daily.co token al
├── conversations/          ← Mesajlaşma konuşmaları
├── payments/initiate/      ← Ödeme başlat
├── admin/                  ← Admin işlemleri
│   ├── stats/              ← Dashboard istatistikleri
│   ├── psychologists/      ← Psikolog yönetimi
│   ├── settings/           ← Platform ayarları
│   └── seed/               ← Mock data (geçici)
└── cron/check-notifications/ ← Zamanlanmış bildirimler
```

### API Route Yazım Standardı

Her API route aynı pattern'i izler:

```typescript
export async function POST(req: Request) {
  // 1. Auth kontrolü
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  // 2. Input validasyonu
  const { field1, field2 } = await req.json()
  if (!field1) return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })

  // 3. AnyClient (gerekirse)
  const service = createServiceRoleClient() as unknown as AnyClient

  // 4. İş mantığı

  // 5. Başarı response
  return NextResponse.json({ success: true })
}
```

### Önemli API'ler

#### POST `/api/payments/initiate`
Ödeme başlatır (şu an test modunda):
1. Slot'un hâlâ uygun olup olmadığını kontrol et
2. Aynı psikolog için aktif paket var mı? → Varsa paket birleştir (sessions_used artır)
3. Yoksa yeni `payments` kaydı oluştur
4. `appointments` kaydı oluştur (status: pending_approval)
5. Slot'u `requested` yap
6. Psikoloğa bildirim zamanla

```typescript
// Paket birleştirme mantığı
if (existingPayment) {
  // Yeni seans hakkı mevcut pakete eklenir
  await service.from('payments').update({
    total_sessions_credited: existingPayment.total_sessions_credited + sessionCount,
  }).eq('id', existingPayment.id)
} else {
  // Yeni paket oluştur
  await service.from('payments').insert({ ... })
}
```

#### POST `/api/appointments/[id]/accept`
Psikolog randevuyu onaylar:
1. Randevu bu psikoloğa mı ait? (yetki kontrolü)
2. Status `pending_approval` mı?
3. `DAILY_API_KEY` varsa Daily.co'da gerçek oda oluştur
4. `appointments.status = scheduled`, `slots.status = booked`
5. Danışan ve psikoloğa bildirim gönder

#### GET `/api/appointments/[id]/token`
Video seans token'ı döner:
```typescript
// Zaman kontrolü
const diffMins = (startTime - now) / 60000
if (diffMins > 20) return { early: true, secondsUntilStart: ... }
if (now > startTime + 95 minutes) return { error: 'Seans süresi doldu' }

// Daily.co meeting token oluştur
const token = await createMeetingToken(roomName, userId, isPsychologist)
return { roomUrl, token, isPsychologist }
```

#### POST `/api/appointments/[id]/complete`
Seansı tamamlar:
1. Psikolog bu randevuya mı ait?
2. Zaten completed ise idempotent → success dön
3. `appointments.status = completed`, `slots.status = completed`
4. `completed_sessions` tablosuna kayıt ekle (outcome: 'attended')
5. Danışana bildirim

---

## 8. İş Akışları

### Randevu Yaşam Döngüsü

```
Slot (available)
    │
    │ Danışan seans alır
    ▼
Slot (requested) + Appointment (pending_approval)
    │
    ├─── Psikolog reddeder ──────► Slot (available) + Appointment (cancelled)
    │                               Danışana bildirim + Alternatif slot önerisi
    │
    │ Psikolog onaylar
    ▼
Slot (booked) + Appointment (scheduled) + Daily.co oda
    │
    │ Seans zamanı gelir → Video görüşme
    │
    │ Psikolog "Seansı Bitir"
    ▼
Slot (completed) + Appointment (completed) + CompletedSession kaydı
    │
    │ Psikolog klinik not girer
    ▼
CompletedSession (clinical_notes, outcome güncellendi)
```

### Ödeme ve Paket Sistemi

```
Danışan paket satın alır
    │
    ├── Aynı psikologda aktif paket var mı?
    │       │
    │       ├── EVET → Mevcut pakete seans ekle (total_sessions_credited + N)
    │       └── HAYIR → Yeni payments kaydı oluştur
    │
    └── Her seans kullanımında sessions_used + 1 artar
         Kalan hak = total_sessions_credited - sessions_used
```

### Tek Psikolog Kısıtlaması

Booking sayfasında (`book/[psychologistId]/page.tsx`):

```typescript
const restrictionEnabled = await getSetting('single_psychologist_restriction')

if (restrictionEnabled) {
  // Başka bir psikologda kalan seans hakkı var mı?
  const { data: otherPackages } = await supabase
    .from('payments')
    .select('id, total_sessions_credited, sessions_used')
    .eq('client_id', user.id)
    .eq('status', 'paid')
    .neq('psychologist_id', psychologistId)  // ← Bu psikolog hariç

  const hasOtherActivePackage = otherPackages.some(
    p => p.sessions_used < p.total_sessions_credited
  )

  if (hasOtherActivePackage) redirect('/client?error=active_package_exists')
}
// Not: Kendi psikoloğundan seans almak neq filtresi sayesinde her zaman serbest
```

---

## 9. Video Seans Modülü

### Genel Akış

```
Danışan/Psikolog "Katıl" butonuna basar
    │
    ▼
GET /api/appointments/[id]/token
    │
    ├── 20dk önceyse → early:true, secondsUntilStart döner
    │       → Frontend geri sayım gösterir
    │
    ├── 95dk geçtiyse → 410 Gone döner
    │       → "Seans süresi doldu" gösterir
    │
    └── Uygun zaman → { roomUrl, token, isPsychologist } döner
            │
            ▼
    VideoModal açılır
            │
            ▼
    Daily.createCallObject()
    frame.join({ url: roomUrl, token: token })
```

### Daily.co Entegrasyonu

```typescript
// lib/daily/index.ts

// Oda oluşturma (randevu onaylanınca çağrılır)
export async function createRoom(appointmentId: string, scheduledAt: Date) {
  const expireAt = scheduledAt + 75 dakika  // Seans + grace period

  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    body: JSON.stringify({
      name: `session-${appointmentId}`,
      privacy: 'private',              // Sadece token ile girilebilir
      properties: {
        exp: expireAt.getTime() / 1000,
        max_participants: 2,           // Sadece psikolog + danışan
        enable_recording: false,
        enable_chat: false,            // In-app mesajlaşma var
      },
    }),
  })
}

// Meeting token (her bağlantıda oluşturulur)
export async function createMeetingToken(roomName, userId, isOwner) {
  // isPsychologist=true → is_owner:true → odadan atabilir
}
```

### VideoModal Bileşeni

`components/video/VideoModal.tsx` — Daily.co'nun `createCallObject` API'sini kullanır (iframe değil):

```typescript
const DailyIframe = (await import('@daily-co/daily-js')).default
const frame = DailyIframe.createCallObject()

// Katıl
await frame.join({
  url: roomUrl,
  token: token || undefined,
  userName: participantName,
  audioSource: true,
  videoSource: true,
})

// Event listener'lar
frame.on('participant-joined', ...)
frame.on('participant-left', ...)
frame.on('error', ...)
```

### Zaman Kuralları

| Durum | Koşul | Davranış |
|-------|-------|----------|
| Çok erken | `now < start - 20dk` | Geri sayım göster |
| Aktif | `start - 20dk < now < start + 95dk` | Katıl butonu görünür |
| Süresi dolmuş | `now > start + 95dk` | Buton gizlenir |

Bu kontrol hem:
- **Frontend'de** (ClientDashboard, SlotModal): Buton render edilmez
- **Backend'de** (`/api/appointments/[id]/token`): 410 döner

---

## 10. Mesajlaşma Sistemi

### Veri Modeli

```
conversations
  id, last_message_at
      │
      ├── conversation_participants (conversation_id, user_id)
      │       RLS: sadece kendi konuşmalarını görebilir
      │
      └── messages (conversation_id, sender_id, content, file_url, is_read)
              RLS: sadece konuşma katılımcıları görebilir
```

### Konuşma Oluşturma (`POST /api/conversations`)

```typescript
// Erişim kontrolü
const isAdmin = myRole === 'admin' || theirRole === 'admin'

if (!isAdmin) {
  // Psikolog ↔ Danışan: ödeme kaydı zorunlu
  const payment = await service.from('payments')
    .select('id')
    .eq('client_id', clientId)
    .eq('psychologist_id', psychId)
    .eq('status', 'paid')
    .single()

  if (!payment) return 403 // Aktif paket yok
}

// Mevcut konuşma var mı? → Aynı konuşmayı döndür
// Yoksa → Yeni conversations + 2x conversation_participants ekle
```

### Realtime Mesaj Alma (`MessagingPanel.tsx`)

```typescript
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    // Yeni mesaj geldi → state'e ekle
    setMessages(prev => [...prev, payload.new])
    // Karşı taraftan geldiyse → okundu işaretle
    if (payload.new.sender_id !== currentUserId) {
      fetch(`/api/conversations/${conversationId}/messages`)
    }
  })
  .subscribe()
```

### Rol Bazlı UI

- **Danışan:** "Mesajlar" sekmesine girince `defaultRecipientId` (psikologu) ile konuşma otomatik açılır/oluşturulur. "Yeni" butonu yoktur.
- **Psikolog/Admin:** "Yeni" butonu → modal açılır → danışan/kullanıcı listesinden seçilir.

### Dosya Yükleme (`POST /api/messages/upload`)

```typescript
// Whitelist kontrolü
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif',
                       'application/pdf', 'application/msword', ...]
if (!ALLOWED_TYPES.includes(file.type)) return 400

// Boyut kontrolü
if (file.size > 20 * 1024 * 1024) return 400  // 20MB

// Supabase Storage'a yükle
const { data } = await supabase.storage
  .from('message-files')
  .upload(`messages/${userId}/${Date.now()}.${ext}`, buffer)
```

---

## 11. Bildirim Sistemi

### İki Katmanlı Yapı

```
1. Anlık bildirimler (notifications tablosu)
   → Hemen gönderilir (sendNotification / sendNotifications)
   → Dashboard'da bell icon'da görünür

2. Zamanlanmış bildirimler (notification_schedules tablosu)
   → Belirli saatte gönderilmek üzere kaydedilir
   → Cron job her 5 dakikada bir çalışarak bekleyen bildirimleri işler
```

### Randevu Onay Bildirimleri

```typescript
// Danışan seans aldığında 3 hatırlatıcı zamanlanır
await scheduleApprovalNotifications(appointmentId, psychologistId, new Date())

// Oluşturulan zamanlamalar:
// - Anında: "Yeni randevu talebi"
// - +12 saat: "12 saatiniz kaldı"  
// - +20 saat: "Son 4 saat"

// Eğer randevu bu sürede onaylanmazsa → otomatik red (henüz implement edilmedi)
```

### Cron Job (`GET /api/cron/check-notifications`)

```typescript
// cron-job.org tarafından her 5 dakikada bir çağrılır
// Header kontrolü: x-cron-secret = CRON_SECRET

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) return 401

  await processPendingNotifications()
  return { processed: true }
}

// processPendingNotifications():
// 1. scheduled_at <= now AND is_sent = false olan kayıtları bul
// 2. Randevu hâlâ pending_approval mı? → Bildirimi gönder
// 3. is_sent = true yap
```

---

## 12. Psikolog Eşleştirme Algoritması

### Genel Akış

```
Kullanıcı soru ağacını tamamlar
    │
    ▼
POST /api/assessment
    │
    ├── Seçilen option_id'lerden specialty ağırlıklarını topla
    ├── Meta değerleri çıkar (cinsiyet tercihi vb.)
    │
    ▼
matchPsychologists(scores, psychologists, meta)
    │
    ├── Uygun slotu olmayanları çıkar
    ├── Cinsiyet filtresini uygula
    ├── Her psikolog için skor hesapla:
    │       score += specialty_weight (eğer psikologun uzmanlığı seçilmişse)
    │
    └── Skora göre sırala → En yüksek 3'ü döndür
```

### Skor Hesaplama

```typescript
export function calculateScores(answers, optionSpecialties) {
  const scores: Record<string, number> = {}
  const selectedOptionIds = new Set(answers.flatMap(a => a.option_ids))

  for (const os of optionSpecialties) {
    if (selectedOptionIds.has(os.option_id)) {
      // Kullanıcı bu seçeneği seçtiyse, ilgili uzmanlığa ağırlık ekle
      scores[os.specialty] = (scores[os.specialty] ?? 0) + os.weight
    }
  }
  return scores  // Örnek: { 'Anksiyete': 5, 'Depresyon': 3 }
}

export function matchPsychologists(scores, psychologists, meta) {
  return psychologists
    .filter(p => p.slots.some(s => s.status === 'available'))  // Slotu olan
    .filter(p => !genderPreference || p.gender === genderPreference)  // Cinsiyet
    .map(p => ({
      profile: p,
      score: p.specialties.reduce((sum, s) => sum + (scores[s] ?? 0), 0),
      matchedSpecialties: p.specialties.filter(s => (scores[s] ?? 0) > 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)  // En iyi 3
}
```

### Soru Ağacı Yapısı

```
questions (type: single | multi)
    │
    └── question_options
            ├── next_question_id  ← Bir sonraki soru
            └── option_specialties
                    ├── specialty  ← 'Anksiyete'
                    └── weight     ← 1-3 arası ağırlık
```

Örnek ağaç:
```
"Nasıl hissediyorsunuz?" (is_first: true)
    ├── "Çok kötü hissediyorum" → weight: Depresyon:3, Anksiyete:2
    │       └── next: "Ne zamandır?"
    ├── "Bunaltıcı kaygı" → weight: Anksiyete:3, OKB:2
    │       └── next: "Ne zamandır?"
    └── ...
```

---

## 13. Platform Kontrolleri

### Nasıl Çalışır

`platform_settings` tablosunda JSON değerli key-value çiftleri saklanır:

```sql
key: 'single_psychologist_restriction'
value: true  -- JSONB boolean
description: 'Danışanların tek psikologla çalışmasını zorunlu kılar'
```

### getSetting Helper

```typescript
// lib/settings.ts
export async function getSetting(key: string): Promise<boolean> {
  try {
    const service = createServiceRoleClient() as unknown as AnyClient
    const { data } = await service
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single()
    return data?.value === true
  } catch {
    return true  // Hata durumunda kısıtlama açık kalır (güvenli default)
  }
}
```

### Yeni Kontrol Eklemek

1. **DB'ye ekle:**
```sql
INSERT INTO platform_settings (key, value, description) VALUES 
  ('yeni_kısıtlama', 'false', 'Açıklama...');
```

2. **`PlatformControls.tsx`'te label ekle:**
```typescript
const SETTING_LABELS: Record<string, { label: string; detail: string }> = {
  single_psychologist_restriction: { ... },
  yeni_kısıtlama: {
    label: 'Yeni Kısıtlama',
    detail: 'Bu kısıtlama şunu yapar...',
  },
}
```

3. **İlgili yerde `getSetting()` çağır:**
```typescript
const enabled = await getSetting('yeni_kısıtlama')
if (enabled) { ... }
```

---

## 14. Frontend Bileşen Mimarisi

### Dashboard Yapısı (Server + Client Ayrımı)

```
page.tsx (Server Component)
│   → DB'den tüm veri çekilir
│   → Props olarak Client Component'e geçilir
│
└── XxxDashboard.tsx (Client Component)
        → useState, useEffect kullanır
        → Sekmeler arası geçiş
        → API çağrıları (PATCH, POST, DELETE)
```

**Neden bu ayrım?**
- Server Component'te veri çekme → daha hızlı ilk yükleme (no loading spinner)
- Client Component'te interaktivite → sekme geçişi, modal açma vs.

### Takvim Sistemi

```
WeeklyCalendar.tsx
│   Haftalık 24 saatlik grid
│   Her hücre: slot var mı? renk? tıklanabilir mi?
│
│   Geçmiş slot kuralları:
│   ├── available + geçmiş → pasif (tıklanamaz, soluk)
│   ├── booked/requested + geçmiş → tıklanabilir ama opacity:60
│   └── Geçmiş boş hücre → tıklanamaz (yeni slot eklenemez)
│
└── onCellClick(day, hour) → SlotModal açılır

SlotModal.tsx
│   5 mod:
│   ├── add: Yeni slot ekle
│   ├── delete: Slot sil
│   ├── approve: Randevuyu onayla/reddet
│   ├── detail: Seans detayı + Katıl butonu
│   └── completed: Tamamlanan seans + Klinik Not butonu
```

### MessagingPanel Bileşeni

```
MessagingPanel.tsx
│   Props:
│   ├── currentUserId: string
│   ├── role: 'psychologist' | 'client' | 'admin'
│   └── defaultRecipientId?: string  (danışan için psikolog ID'si)
│
│   Sol panel: Konuşma listesi
│   ├── Unread badge
│   ├── Son mesaj önizleme
│   └── "Yeni" butonu (psikolog/admin)
│
│   Sağ panel: Mesaj alanı
│   ├── Realtime subscription (Supabase channel)
│   ├── Dosya yükleme (paperclip icon)
│   └── Okundu tiki (✓ gri = gönderildi, mavi = okundu)
```

---

## 15. Test Stratejisi

### Test Dosyaları

```
__tests__/
├── setup.ts                     ← Global mock'lar
├── lib/
│   ├── matching.test.ts         ← Psikolog eşleştirme algoritması
│   └── settings.test.ts         ← Platform ayarları okuma
├── api/
│   ├── conversations.test.ts    ← Konuşma API
│   ├── appointments.test.ts     ← Complete + reject
│   └── upload.test.ts           ← Dosya yükleme whitelist
└── components/
    ├── AppointmentCard.test.tsx ← Zaman kuralları (20dk/95dk)
    └── PlatformControls.test.tsx ← Toggle UI
```

### Mock Yapısı

```typescript
// __tests__/setup.ts
// Supabase client mock
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

// Her test, kendi mock implementasyonunu sağlar:
vi.mocked(createServiceRoleClient).mockReturnValue({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { value: true } }),
      }),
    }),
  }),
} as any)
```

### Test Çalıştırma

```bash
npm test                  # Tek seferlik
npm run test:watch        # Değişikliklerde otomatik
npm run test:coverage     # Coverage raporu (HTML)
```

---

## 16. Deploy ve Altyapı

### Vercel (Hobby Plan)

```
GitHub push → Vercel webhook → Otomatik build → Deploy
```

**Limitasyonlar:**
- Cron job: Sadece günde 1 kez (biz cron-job.org kullanıyoruz)
- Build timeout: 45 saniye
- Serverless function timeout: 10 saniye

**Build ayarları (`next.config.ts`):**
```typescript
eslint: { ignoreDuringBuilds: true }    // ESLint hataları build'i durdurmaz
typescript: { ignoreBuildErrors: true }  // TS hataları build'i durdurmaz
```

**Not:** Bu ayarlar geliştirme hızlandırmak için eklenmiştir. Üretim kalitesi için kaldırılmalı ve hatalar düzeltilmelidir.

### Cron Job (cron-job.org)

```
cron-job.org → Her 5 dakika →
POST https://domain.vercel.app/api/cron/check-notifications
Header: x-cron-secret: CRON_SECRET
```

### Supabase Storage Buckets

| Bucket | Erişim | Kullanım |
|--------|--------|----------|
| `avatars` | Public | Psikolog fotoğrafları |
| `certificates` | Private | Psikolog belgeleri |
| `message-files` | Public | Mesajlaşmada paylaşılan dosyalar |

**Storage Policy (SQL):**
```sql
-- message-files bucket için
CREATE POLICY "message files upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'message-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "message files read" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-files');
```

---

## 17. Bilinen Sorunlar ve Teknik Borç

### Kritik

| Sorun | Etki | Çözüm |
|-------|------|-------|
| Mock kullanıcı şifreleri çalışmıyor | Test edilemiyor | Seed route'u Vercel'de çalıştır veya auth.users'a doğru hash ekle |
| İyzico TEST_MODE | Gerçek ödeme yok | İyzico hesabı aktif olunca `TEST_MODE=false` |
| `AnyClient` pattern | TypeScript tip güvenliği yok | `npm run db:types` ile tip generate et |

### Orta Öncelik

| Sorun | Etki | Çözüm |
|-------|------|-------|
| `packages` tablosu boş | 1/3/6 seans seçeneği yok | `packages` tablosu ve checkout entegrasyonu |
| Video seans sonrası değerlendirme yok | Danışan deneyimi eksik | Değerlendirme ekranı ekle |
| Admin psikolog değişim akışı yok | Manuel SQL gerekiyor | Admin paneline özellik ekle |

### Teknik Borç

| Sorun | Açıklama |
|-------|----------|
| ESLint/TS ignore | Build'de hatalar görmezden geliniyor |
| `any` tipleri | Birçok yerde `@typescript-eslint/no-explicit-any` |
| `<a>` yerine `<Link>` | Birkaç yerde Next.js Link kullanılmıyor |
| `<img>` yerine `<Image>` | next/image kullanılmıyor, LCP performansı düşük |

---

## 18. Yeni Özellik Geliştirme Rehberi

### Adım 1: DB Değişikliği Gerekiyorsa

1. Supabase SQL Editor'da migration yaz
2. Yeni tablo için RLS policy ekle
3. `npm run db:types` ile tipleri güncelle (henüz çalışmıyor — manuel `database.types.ts` güncelle)

### Adım 2: API Route Ekle

```typescript
// app/api/yeni-ozellik/route.ts
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
type AnyClient = { from: (table: string) => any }

export async function POST(req: Request) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  // 2. Role kontrolü (gerekirse)
  // 3. İş mantığı
  // 4. Response
}
```

### Adım 3: Frontend Bileşeni

Yeni bir sekme veya sayfa için:

1. **Server Component** (`page.tsx`): Tüm veriyi çek
2. **Client Component**: UI render et, event'leri yakala
3. Mevcut design system renklerini kullan (C objesi içinde tanımlı)

```typescript
const C = {
  navy: '#1D3557', blue: '#1A6BB5', muted: '#8FA3BF',
  border: '#E4EAF2', bg: '#F2F5F9', // ...
}
```

### Adım 4: Test Yaz

```typescript
// __tests__/api/yeni-ozellik.test.ts
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/yeni-ozellik/route'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')

describe('POST /api/yeni-ozellik', () => {
  it('yetkisiz kullanıcıya 401 döner', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const res = await POST(new Request('http://localhost', { method: 'POST', body: '{}' })) as any
    expect(res.status).toBe(401)
  })
})
```

### Adım 5: Deploy

```bash
git add .
git commit -m "feat: yeni özellik açıklaması"
git push
# Vercel otomatik deploy
```

---

## Sık Sorulan Sorular

**S: Neden bazı sorgular `db` bazıları `service` kullanıyor?**  
C: `db` anon client'tır — RLS politikaları çalışır ve kullanıcı sadece kendi verilerini görebilir. `service` ise RLS'i bypass eder, birden fazla kullanıcının verisine aynı anda erişmek gerektiğinde (örn: profil bilgilerini birleştirme) kullanılır.

**S: `maybeSingle()` ile `single()` farkı nedir?**  
C: `single()` kayıt bulamazsa hata fırlatır, `maybeSingle()` `null` döner. Emin olunmayan sorgularda `maybeSingle()` kullanın.

**S: Yeni bir bildirim türü nasıl eklenir?**  
C: `lib/notifications.ts`'te `messages` objesine yeni key ekle, ilgili işlem sonrası `sendNotification()` çağır.

**S: Slot durumları nasıl değişir?**  
C: Slot sadece API üzerinden güncellenir, hiçbir zaman direkt client-side güncellenmez:
- `available` → `requested`: Danışan seans aldığında
- `requested` → `booked`: Psikolog onayladığında  
- `requested` → `available`: Psikolog reddettiğinde
- `booked` → `completed`: Psikolog "Seansı Bitir" dediğinde

**S: Video seans çalışmıyor, ne yapmalıyım?**  
C: `DAILY_API_KEY` env variable'ını kontrol et. Yoksa fallback URL kullanılır ama bağlantı çalışmaz. Daily.co dashboard'dan aktif bir API key gerekiyor.

---

## 19. Son Değişiklikler (27 Haziran 2026)

### Ana Sayfa Yenilendi (`app/page.tsx`)

Hiwell ve Heltia'dan ilham alınarak 7 yeni bölüm eklendi:

| Bölüm | Açıklama |
|-------|----------|
| Hero | Etiket badge, güven ikonları (🔒⭐📱), iki CTA butonu |
| Nasıl Çalışır | 3 adımlı kart, desktop'ta oklar |
| Neden Menta | 4 özellik kartı |
| İstatistikler | Koyu arka plan, scroll'da count-up animasyonu |
| Yorumlar | Desktop'ta 3 kart, mobilde otomatik carousel |
| SSS | Accordion, 5 soru |
| Footer | 4 kolon, linkler, copyright |

**count-up animasyonu** — `IntersectionObserver` ile elemanın viewport'a girince sayaç başlar:
```typescript
function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // 16ms interval ile hedefe ulaş
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
  }, [target, duration])
  return { count, ref }
}
```

---

### Mobil Responsive (`ClientDashboard`, `PsychologistDashboard`, `AdminDashboard`)

**Sidebar → Bottom Navigation pattern:**

```
Desktop (md+):                    Mobil:
┌──────┬──────────────┐           ┌──────────────────┐
│ Side │              │           │                  │
│  bar │   İçerik     │           │     İçerik       │
│      │              │           │                  │
└──────┴──────────────┘           ├──────────────────┤
                                  │  Bottom Nav      │
                                  └──────────────────┘
```

- Sidebar: `hidden md:flex` (mobilde gizli)
- Main: `md:ml-56` (mobilde margin yok)
- Padding: `p-4 md:p-8`
- Bottom nav: `md:hidden fixed bottom-0` — ikonlar + etiketler + unread badge
- Content area: `pb-24 md:pb-8` (bottom nav için alan)

**Responsive grid'ler:**
```
grid-cols-4        → grid-cols-2 md:grid-cols-4
grid-cols-2 (yan)  → grid-cols-1 sm:grid-cols-2
px-8               → px-4 md:px-8
```

---

### Auth Akışı Düzeltmeleri

#### `next` Parametresi Kayboluyor Sorunu

**Problem:** Kullanıcı psikolog seçip "Seans Al" → login'e yönlendiriliyor → oradan "Kayıt Ol"'a geçince `next` parametresi kayboluyor → kayıt sonrası `/client`'a gidiyor, psikolog unutuluyor.

**Çözüm:**

```
Ana sayfa → /auth/login?next=/client/book/[id]
    │
    └── "Kayıt Ol" → /auth/kaydol?next=/client/book/[id]  ← next taşındı
            │
            ├── Email kayıt → router.replace(next)          ← next okundu
            └── Google → callback?next=/client/book/[id]    ← next taşındı
```

```typescript
// auth/kaydol/page.tsx
const searchParams = useSearchParams()
const next = searchParams.get('next') ?? '/client'

// Email kayıt sonrası
router.replace(next)  // '/client' yerine

// Google OAuth
redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
```

```typescript
// auth/login/page.tsx — kayıt linki
<a href={`/auth/kaydol${next ? `?next=${encodeURIComponent(next)}` : ''}`}>
  Kayıt Ol
</a>
```

#### Psikolog Booking Engeli

**Problem:** Login olmuş psikolog "Seans Al" butonuna tıklayabiliyordu.

**Çözüm — İki katmanlı:**

1. **Frontend (`page.tsx`):**
```typescript
function handleBooking(psychologistId: string) {
  if (user?.role === 'psychologist' || user?.role === 'admin') return  // engel
  // ...
}

<button disabled={user?.role === 'psychologist' || user?.role === 'admin'}>
  Seans Al
</button>
```

2. **Server-side (`book/[psychologistId]/page.tsx`):**
```typescript
const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
if (userData?.role === 'psychologist') redirect('/psychologist')
if (userData?.role === 'admin') redirect('/admin')
```

URL'e direkt girmeye çalışsa da server-side redirect devreye girer.

---

### Danışanlar Sekmesi (`PsychologistDashboard`)

Düz liste yerine danışana göre gruplanmış akordiyon yapısı:

```
Tarık Camdal (3 seans · Son: 24 Haz)  ▼
  ├── 24 Haz · 15:00  [Tamamlandı]  [📝 Notu Görüntüle]
  ├── 17 Haz · 15:00  [Tamamlandı]  [Not Ekle]
  └── 10 Haz · 09:00  [Onaylı]
Haşim İşcan (1 seans · Onay bekliyor) ▶
```

- `useMemo` ile `client_id`'ye göre gruplama
- `useState<Set<string>>` ile açık/kapalı durumu
- `page.tsx`'te `slot_start_time` ve `hasNote` (completed_sessions join) çekiliyor
- "📝 Notu Gör" mavi, "Not Ekle" gri stil farkı

---

**S: Psikolog neden booking sayfasına giremez?**  
C: İki katmanlı koruma var. Frontend'de buton disabled, server-side'da `book/[id]/page.tsx` role kontrolü yapıp yönlendiriyor. URL'e direkt girse de redirect çalışır.

**S: Kullanıcı kayıt olunca neden psikolog seçimi kayboluyor?**  
C: Kayboluyor gibi görünüyorsa `next` parametresi kaybolmuş demektir. Login → kaydol linkinin `?next=` taşıyıp taşımadığını kontrol et. Kaydol formunda `useSearchParams()` ile `next` okunup `router.replace(next)` yapılmalı.

