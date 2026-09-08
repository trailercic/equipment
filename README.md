# Equipment Coming - kamioni i prikolice (Supabase + Netlify)

Web aplikacija za praćenje kamiona i prikolica koji dolaze u radionicu, sa javnom tablom za TV.

## Šta aplikacija radi

- **Prijava** sa nalogom (email + lozinka), tri uloge:
  - **Admin** - upravlja korisničkim nalozima, vidi i menja sve
  - **Maintenance** - prijavljuje dolazak vozila (unosi TRUCK/TRAILER, registraciju, razlog dolaska)
  - **Fleet** - menja status vozila (ARRIVED → READY)
- **TV tabla** (`/board`) - javna stranica bez prijave, dve kolone ARRIVED / READY, osvežava se uživo (Supabase Realtime) - otvoriš je u browseru na TV-u/monitoru u radionici
- Svi podaci se čuvaju trajno u Supabase bazi

Tehnologije: **React + Vite + TypeScript**, **Supabase** (baza, autentifikacija, realtime), **Netlify** (hosting + serverless funkcija za pravljenje naloga), **Tailwind CSS**.

---

## 1. Napravi Supabase projekat

1. Idi na [supabase.com](https://supabase.com), napravi nalog i novi projekat (izaberi region blizu tebe, sačekaj par minuta da se projekat pokrene).
2. Otvori **SQL Editor** (u levom meniju) → **New query**.
3. Otvori fajl `supabase/schema.sql` iz ovog paketa, kopiraj ceo sadržaj, nalepi u SQL Editor i klikni **Run**.
   - Ovo pravi dve tabele (`profiles`, `vehicles`), uključuje Row Level Security (RLS) politike po ulogama, i uključuje Realtime za `vehicles`.
4. Idi na **Project Settings → API**. Zapamti:
   - **Project URL** (npr. `https://xxxx.supabase.co`)
   - **anon public** ključ
   - **service_role** ključ (⚠️ ovo je tajni ključ, nikad ga ne stavljaj u frontend kod ili GitHub - ide samo u Netlify environment varijable)

### Prvi admin nalog

Najlakše je da napraviš prvi nalog ručno:

1. Supabase Dashboard → **Authentication → Users → Add user** → unesi svoj email i lozinku, čekiraj "Auto Confirm User".
2. Idi na **Table Editor → profiles** - videćeš da je automatski napravljen red za tebe sa `role = FLEET` (podrazumevano).
3. Klikni na taj red i promeni `role` u `ADMIN`, i po želji upiši `full_name`.
4. Time se prijavljuješ u aplikaciju kao Administrator, i dalje naloge (Maintenance, Fleet) praviš iz same aplikacije (Korisnici stranica).

---

## 2. Pokretanje lokalno

Potreban ti je [Node.js](https://nodejs.org) 18+.

```bash
cd equipment-coming
npm install
cp .env.example .env
```

Otvori `.env` i upiši svoj `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` (iz koraka 1).

```bash
npm run dev
```

Otvori [http://localhost:5173](http://localhost:5173) - prijavi se sa nalogom koji si napravio.

TV tabla je na [http://localhost:5173/board](http://localhost:5173/board).

> Napomena: Netlify funkcija za pravljenje/brisanje korisnika (`admin-users`) radi samo kada je sajt hostovan na Netlify-ju, ili lokalno preko `netlify dev` (Netlify CLI) - obično `npm run dev` (Vite) je dovoljan za rad na dizajnu/funkcijama, a pravljenje korisnika testiraš tek na Netlify-ju ili sa `netlify dev`.

---

## 3. Stavi kod na GitHub

```bash
git init
git add .
git commit -m "Prva verzija aplikacije"
```

Napravi novi repozitorijum na [github.com/new](https://github.com/new) (privatan, radi se o poslovnoj aplikaciji), pa prati uputstvo koje GitHub prikaže za "push postojećeg koda sa komandne linije".

---

## 4. Deploy na Netlify

1. Idi na [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → poveži GitHub → izaberi repozitorijum.
2. Netlify će sam prepoznati `netlify.toml` (build komanda `npm run build`, folder `dist`, funkcije u `netlify/functions`).
3. Pre prvog deploy-a (ili posle, pa redeploy), idi na **Site configuration → Environment variables** i dodaj:
   - `VITE_SUPABASE_URL` = tvoj Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = tvoj Supabase anon key
   - `SUPABASE_URL` = isti Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = tvoj Supabase service_role key (tajni!)
4. Klikni **Deploy site**.
5. Kad se deploy završi, dobićeš adresu tipa `https://tvoj-sajt.netlify.app`. Tu adresu možeš kasnije promeniti u **Site configuration → Domain management** (i staviti sopstveni domen ako imaš).

Za TV u radionici, otvori `https://tvoj-sajt.netlify.app/board` u browseru na TV-u/monitoru i ostavi otvoreno - sama se osvežava kad god se doda vozilo ili promeni status.

---

## 5. Kako se koristi

- **Maintenance** se prijavi, klikne "Prijavi dolazak vozila", unese tip (kamion/prikolica), registraciju i razlog dolaska. Vozilo se odmah pojavljuje na TV tabli u koloni ARRIVED.
- **Fleet** se prijavi, vidi listu vozila, i kad je vozilo spremno klikne "Označi kao Ready" - vozilo se seli u READY kolonu na TV tabli.
- **Admin** radi sve gore navedeno, i dodatno upravlja nalozima na stranici "Korisnici" (dodavanje, promena uloge, brisanje).

## 6. Sigurnost

- Lozinke i autentifikaciju u potpunosti vodi Supabase Auth.
- Pristup podacima je zaštićen Row Level Security (RLS) politikama direktno u bazi (ne samo u kodu aplikacije) - čak i da neko pokuša da zaobiđe frontend, baza neće dozvoliti npr. Fleet nalogu da obriše vozilo.
- `service_role` ključ nikad nije u frontend kodu - koristi ga samo Netlify funkcija, na serverskoj strani.

## 7. Moguća proširenja (za kasnije)

Fotografije vozila, istorija promena statusa (ko je i kada promenio), filter po tipu vozila na TV tabli, zvučno/vizuelno obaveštenje kad vozilo pređe u READY, štampanje potvrde o prijemu.
