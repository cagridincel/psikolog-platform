# Psikolog Platform — Proje Bağlamı

Bu dosya Claude AI için proje bağlamını özetler. Yeni bir sohbette GitHub reposunu paylaşınca buradan devam edebiliriz.

## Proje Özeti

Online psikoloji seans platformu. Müşteriler psikologlarla eşleşiyor, paket satın alıyor, görüntülü seans yapıyor.

## Tech Stack

- **Frontend/Backend:** Next.js 15 (App Router, Server Components)
- **Veritabanı:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (Google OAuth)
- **Video görüşme:** Daily.co
- **Ödeme:** İyzico (entegrasyon henüz tamamlanmadı)
- **Deploy:** Vercel (henüz deploy edilmedi)
- **Dil:** TypeScript

## Klasör Yapısı

```
psikolog-platform/
├── app/
│   ├── (auth)/
│   │   — YOK, bunun yerine:
│   ├── auth/
│   │   ├── login/page.tsx          # Google OAuth login sayfası
│   │   └── callback/route.ts       # OAuth callback handler
│   ├── (dashboard)/
│   │   ├── client/
│   │   │   ├── page.tsx            # Müşteri dashboard (temel)
│   │   │   ├── book/[psychologistId]/
│   │   │   │   ├── page.tsx        # Slot seçim sayfası (server)
│   │   │   │   └── BookingPage.tsx # Slot seçim sayfası (client)
│   │   │   └── checkout/
│   │   │       ├── page.tsx        # Ödeme sayfası (server)
│   │   │       └── CheckoutPage.tsx # Ödeme sayfası (client)
│   │   └── psychologist/
│   │       ├── page.tsx            # Psikolog dashboard (server)
│   │       └── PsychologistDashboard.tsx # Haftalık takvim (client)
│   ├── api/
│   │   ├── assessment/route.ts     # Soru ağacı değerlendirme + eşleştirme
│   │   ├── questions/route.ts      # Soru ağacını çeker
│   │   ├── psychologists/route.ts  # Onaylı psikolog listesi
│   │   ├── me/route.ts             # Mevcut kullanıcı bilgisi
│   │   ├── appointments/
│   │   │   └── [id]/
│   │   │       ├── accept/route.ts # Randevu kabul
│   │   │       └── reject/route.ts # Randevu red + alternatif öneri
│   │   ├── psychologist/
│   │   │   └── slots/
│   │   │       ├── route.ts        # Slot GET + POST
│   │   │       └── [slotId]/route.ts # Slot DELETE
│   │   ├── payments/
│   │   │   └── initiate/route.ts   # İyzico ödeme başlatma (YAPILACAK)
│   │   └── cron/
│   │       └── check-notifications/route.ts # 24h timeout kontrolü
├── components/
│   ├── assessment/
│   │   └── AssessmentWizard.tsx    # Soru ağacı wizard modal
│   └── calendar/
│       ├── WeeklyCalendar.tsx      # Haftalık takvim grid
│       └── SlotModal.tsx           # Slot ekleme/silme/onay modal
├── hooks/
│   ├── useNotifications.ts         # Realtime bildirim hook
│   └── useCountdown.ts             # Seans geri sayım hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   └── server.ts               # Server Supabase client + service role
│   ├── daily/index.ts              # Daily.co API wrapper
│   ├── matching/index.ts           # Psikolog eşleştirme algoritması
│   └── notifications.ts            # Bildirim helper + cron processor
├── types/
│   └── database.types.ts           # Tüm TypeScript tipleri
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_schema_updates.sql
│       ├── 003_question_tree.sql
│       └── 004_packages.sql
├── middleware.ts                    # Auth koruması (/client, /psychologist, /admin)
└── vercel.json                      # Cron job config (5 dakikada bir)
```

## Veritabanı Şeması (Özet)

### Tablolar
- `users` — id, email, role (client/psychologist/admin)
- `profiles` — id (FK→users), full_name, bio, specialties[], price_per_session, is_approved, gender
- `slots` — id, psychologist_id, start_time, end_time, status (available/requested/booked)
- `payments` — id, client_id, psychologist_id, package_id, amount_paid, total_sessions_credited, sessions_used, status, iyzico_payment_id, cancelled_at
- `appointments` — id, payment_id, client_id, psychologist_id, slot_id, status (pending_approval/scheduled/completed/cancelled/auto_cancelled), meeting_room_url, approval_deadline, rejection_reason
- `completed_sessions` — id, appointment_id, outcome, clinical_notes (RLS ile sadece psikolog görebilir), client_joined_at, client_left_at, actual_duration_minutes
- `notifications` — id, user_id, title, description, is_read
- `notification_schedules` — 0/12/20. saat psikolog hatırlatmaları
- `psychologist_recommendations` — red sonrası alternatif psikolog önerileri
- `questions` — soru ağacı (meta_key ile cinsiyet gibi filtreler)
- `question_options` — cevap seçenekleri (next_question_id ile dallanma, meta_value)
- `option_specialties` — cevap → specialty ağırlık eşleşmesi
- `client_assessments` — müşteri cevapları ve skorları
- `packages` — 1/2/4/8 seans paketleri, indirim oranları (admin yönetir)

### Önemli DB Notları
- Tüm tablolarda RLS aktif
- `completed_sessions.clinical_notes` — sadece psikolog görebilir (view ile korunuyor)
- `current_user_role()` helper fonksiyonu var
- `cancel_appointment()` ve `auto_reject_expired_appointments()` fonksiyonları var
- Vercel cron ile her 5dk `auto_reject` çalışır
- Supabase bölgesi şu an Sydney (ap-southeast-2) — production öncesi Frankfurt'a taşınmalı

## Tamamlanan Özellikler

- ✅ Veritabanı şeması (4 migration)
- ✅ TypeScript tipleri
- ✅ Next.js kurulumu + Supabase entegrasyonu
- ✅ Google OAuth (login/callback)
- ✅ Landing page (psikolog listesi + Supabase bağlantılı)
- ✅ Soru ağacı assessment wizard (dinamik, DB'den yönetilir)
- ✅ Psikolog eşleştirme algoritması (specialty skoru + cinsiyet filtresi)
- ✅ Login akışı — "Seans Al" butonunda zorunlu, wizard'da serbest
- ✅ Slot seçim sayfası (/client/book/[psychologistId])
- ✅ Checkout sayfası — 4 paket kartı (1/2/4/8 seans), indirim hesaplama
- ✅ Psikolog haftalık takvim dashboard
- ✅ Slot ekleme/silme (takvim üzerinden)
- ✅ Randevu kabul/red API'leri
- ✅ 24 saat timeout + cron job
- ✅ Bildirim sistemi (Realtime + zamanlamalı)
- ✅ Alternatif psikolog öneri sistemi

## Yapılacaklar

### Kritik (production öncesi zorunlu)
- ⏳ İyzico ödeme entegrasyonu + webhook handler
- ⏳ `appointments/create` API route'u (paket hakkıyla randevu oluşturma)
- ⏳ Callback route'da `users` tablosuna yazma sorunu (Google login sonrası public.users'a eklenmiyor)
- ⏳ Müşteri dashboard (paket özeti, randevular, geri sayım sayacı)
- ⏳ Daily.co video görüşme odası (müşteri + psikolog sayfaları)
- ⏳ Klinik not sayfası (psikolog, seans sonrası)
- ⏳ Supabase bölgesini Frankfurt'a taşı (yeni proje oluştur)
- ⏳ Vercel deploy

### Psikolog Dashboard (devam)
- ⏳ Psikolog profil sayfası (/psychologist/profile)
  - Ad, bio, uzmanlık alanları, fiyat, avatar, cinsiyet düzenleme
  - Eğitim ve sertifika bilgileri (opsiyonel)
- ⏳ Onaylı randevu detay modalı (danışan adı, geçmiş seans sayısı, "Seansa Katıl" butonu)
- ⏳ Sarı slot (pending) tıklanınca danışan bilgisi + kabul/red akışı (UI tarafı)
- ⏳ Klinik not girişi (seans sonrası)

### Admin Paneli
- ⏳ Psikolog yönetimi
  - Başvuru listesi — onayla / reddet
  - Profil düzenleme
  - Aktif/pasif yapma
  - **Direkt psikolog ekleme** — admin formu ile (ad, email, uzmanlık, fiyat, cinsiyet) → sistem davet emaili gönderir → psikolog link ile şifre belirler
- ⏳ Müşteri yönetimi
  - Müşteri listesi
  - Paket geçmişi
  - Seans geçmişi
- ⏳ Paket yönetimi
  - Paket ekleme/düzenleme/silme
  - İndirim oranları
  - "Popüler" etiketi toggle
- ⏳ İstatistikler
  - Tamamlanan seans sayısı
  - Gelir özeti
  - Aktif psikolog/müşteri sayısı

### Sonraki aşama
- ⏳ Müşteri geçmiş seanslar sayfası
- ⏳ E-posta bildirimleri (Supabase veya Resend)
- ⏳ Mobile responsive iyileştirmeler

### Refactor (kod kalitesi — production öncesi)

**🔴 Kritik:**
- ⏳ `as any` kullanımını temizle — `accept/route.ts`, `psychologist/page.tsx`, `assessment/route.ts` başta olmak üzere tüm dosyalarda proper interface'ler yazılmalı
- ⏳ Kök dizindeki `route.ts` dosyasını sil (yanlış yerde, işlevsiz)
- ⏳ `public.users` yazma sorununu Supabase trigger ile çöz — Google login sonrası `auth.users`'a eklenen kullanıcı otomatik olarak `public.users`'a da eklensin:
  ```sql
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'client')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, full_name, specialties, is_approved)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), '{}', false)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  ```
- ⏳ `JSON.parse(JSON.stringify(...))` hack'ini kaldır — Server→Client veri geçişinde proper DTO pattern kullan (sadece gerekli alanları seç, Proxy nesne geçirme)

**🟡 İyileştirme:**
- ⏳ API route'larında error handling güçlendir — try/catch eksik olan yerlere ekle, kullanıcıya anlamlı hata mesajları dön
- ⏳ `appointments` sorgusundaki N+1 sorununu çöz — client profillerini ayrı sorguda çekiyoruz, Supabase'de doğru FK hint ile tek sorguda çekilebilir
- ⏳ `lib/matching/index.ts`'de `(psych as any).gender` cast'ini kaldır — `ProfileRow`'a `gender` alanı ekle
- ⏳ Console.log'ları tara ve temizle — debug sırasında eklenen log'lar production'a gitmemeli
- ⏳ Middleware son halini kontrol et — `/auth` prefix'i korumalı listede olmamalı

## Önemli Kararlar

### Paket Yapısı
- 4 paket: 1, 2, 4, 8 seans
- İndirimler: 0%, 4%, 8%, 12%
- "4 Seans" paketi "Popüler" olarak işaretli
- Paketler admin panelinden yönetilir (`packages` tablosu)
- **Paket tek psikologa bağlı** — kalan seanslar başka psikologla kullanılamaz

### Randevu Akışı
1. Ödeme tamamlanır → `payments` kaydı oluşur (status: paid)
2. İlk slot için `appointments` oluşur (status: pending_approval)
3. Slot kilitlenir (status: requested)
4. Psikolog 24 saat içinde kabul/red eder
5. Kabul → Daily.co odası oluşturulur, slot → booked
6. Red/timeout → slot serbest, paket iptal, alternatif psikolog önerilir
7. Kalan seanslar için ödeme yapılmadan yeni randevu oluşturulabilir

### Login Akışı
- Wizard (soru ağacı): login gerektirmez
- "Seans Al" butonu: login zorunlu
- Seçilen psikolog + slot URL params ile korunur

### Eşleştirme Algoritması
- `option_specialties` tablosunda her cevap seçeneği specialty'lere ağırlık verir
- Müşteri cevapları toplanır, specialty skorları hesaplanır
- Psikologların specialty listesi ile karşılaştırılır
- Cinsiyet filtresi: `questions.meta_key = 'gender_preference'`, `question_options.meta_value = 'female/male/any'`
- Dinamik — hardcoded ID yok, DB'den yönetilir
- Max 3 psikolog önerilir, skora göre sıralı

### Bildirim Sistemi
- Psikolog talep aldığında: 0h, 12h, 20h hatırlatma
- Vercel cron (her 5dk) pending bildirimleri işler
- `CRON_SECRET` env var ile güvenlik

### Video Görüşme
- Daily.co — private room, max 2 katılımcı, kayıt yok (KVKK)
- 60 dakika seans + 15 dakika buffer (75dk exp)
- Psikolog = owner token, müşteri = normal token
- Katılım/ayrılma anlık kaydedilir (session tracking)

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DAILY_API_KEY=
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
```

## Test Verileri

### Test Psikolog (DB'de, auth kullanıcısı değil)
- ID: `11111111-1111-1111-1111-111111111111`
- Email: `psikolog@test.com`
- Ad: Dr. Ayse Kaya
- Gender: female
- Specialties: Anksiyete, Depresyon, Stres, Çift Terapisi, Kişisel Gelişim
- Price: 500 TL/seans

### Geliştirici Hesabı
- Email: cagridincel@gmail.com
- Role: psychologist (geçici, test için)
- is_approved: true

## GitHub Repo
https://github.com/cagridincel/psikolog-platform