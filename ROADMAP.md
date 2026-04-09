# Personal OS (Projekt Lustro Cyfrowe) 🪞

Ambitny projekt stworzenia własnego "Systemu Operacyjnego", który łączy zarządzanie zadaniami (GTD), mierzenie czasu (Toggl), planowanie (Google Calendar), logi systemowe i statystyki ze śledzenia nawyków i zdrowia w jedno "centrum dowodzenia".

Inspiracja: System zapisu czasu a'la [Dote Timer](https://dotetimer.com/), ale działający wielosystemowo pod Twoją pełną kontrolą i z opcją zautomatyzowanego wprowadzania danych ("ingestii").

## 🛠️ Stack Technologiczny

- **Frontend / Główny Framework:** SvelteKit (szybkość, natywna reaktywność).
- **Styling:** Tailwind CSS + komponenty graficzne np. Chart.js / LayerChart.
- **Baza Danych:** MongoDB (niezrównana na start dla nieustrukturyzowanych, "brudnych" danych ze skryptów).
- **ORM / Dostęp do bazy:** Prisma (używamy z MongoDB w celu type-safety; odrzucamy Mongoose).
- **Zarządzanie paczkami:** pnpm (single repo / monorepo, ale bez sztucznego tworzenia `packages/` na start, jeśli to nie jest potrzebne).
- **Język:** TypeScript.
- **Backend-dodatkowy:** Tylko jeśli będzie to absolutnie potrzebne dla oddzielenia logiki, ewentualny mikroserwis z użyciem Fastify (zamiast Express).

## 📐 Główne założenia Architektury

1. **Multi-user od początku:** Logowanie przez Google OAuth2 (np. `Auth.js`). Trzyma oddzielenie danych i zapewnia bezpieczeństwo na wypadek chęci udostępnienia projektu.
2. **Flexible Schema (Baza Danych):** Używamy pola `JSON` w Prisma dla surowych danych. Elastyczność na pierwszym miejscu.
3. **Agregacja Danych (Ingestory):** Różne skrypty w tle (tzw. daemony), które będą pisać do jednej kolekcji: Google Calendar, Toggl, logi z Google Fit, monitorowanie aplikacji/ruchu sieciowego.
4. **Zadania = Zdarzenia:** Zadanie istnieje realnie na dashboardzie tylko wtedy, jeśli posiada planowany czas w kalendarzu lub jest śledzone w czasie rzeczywistym.

## 🗄️ Wstępny Model Danych (Prisma + MongoDB)

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    String @id @default(auto()) @map("_id") @db.ObjectId
  email String @unique
  name  String?
  logs  ActivityLog[]
}

model ActivityLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  userId     String   @db.ObjectId
  user       User     @relation(fields: [userId], references: [id])

  title      String
  source     String   // np. "google_calendar", "toggl", "router", "manual"
  type       String   // "PLAN" vs "REAL"

  start      DateTime
  end        DateTime?

  // Różne ustrukturyzowane metadane z apek (JSON)
  payload    Json?

  createdAt  DateTime @default(now())

  @@index([userId, start])
}
```

## 🗺️ Roadmapa (Plan Działania)

### Etap 1: Setup i Integracja Google + Toggl (MVP)

_Cel: Odtworzenie podstawowych wizualizacji znanych z Dote Timer w oparciu o prawdziwe dane._

- [ ] Inicjalizacja projektu SvelteKit z TailwindCSS.
- [ ] Setup i podłączenie kontenera MongoDB + Prisma (bez Mongoose).
- [ ] Zbudowanie paczki skryptu (ingestora) łączącego się do API Google Calendar (import zadań typu `PLAN`).
- [ ] Zbudowanie paczki skryptu do API Toggl (import zdarzeń typu `REAL`).
- [ ] Budowa widoku Dashboard: Pionowa oś 24h pokazująca plan zestawiony ze stanem faktycznym (nakładające się bloki na osi z-index).

### Etap 2: Dodawanie Kolektorów (Źródeł danych)

_Cel: Rozszerzenie śledzenia o dodatkowe aplikacje, żeby pokazywać pełen przepływ dnia._

- [ ] Osobiste narzędzia zdrowotne (śledzenie wagi, stan zdrowia, sen - Google Fit / Sleep Droid).
- [ ] Osobiste finanse (wydatki / LoseIt).
- [ ] Skrypt nasłuchiwania komunikacji przychodzącej/wychodzącej.

### Etap 3: Zaawansowana Korelacja Danych i Moduł GTD (Wielkie Scalanie)

_Cel: Widoki pozwalające na analizy "Plan vs Real" poparte konkretnymi statystykami._

- [ ] Wprowadzenie widoków z macierzą Eisenhowera.
- [ ] Inteligentne powiązanie: Automatyczna modyfikacja zadań zaplanowanych ze względu na odczyt ze skryptów "Real" (np. ruch git/GitHub, spędzony czas na URL).
- [ ] Przyszłość: Wpięcie silnika wektorowego (MongoDB) do przeszukiwań pełnotekstowych zapytań (LLM).

## Spis Twoich Aplikacji/Skryptów

**Posiadane/Własne:** Śledzenie zdrowia, wydatki, nasłuch komunikacji, nasłuch procesów PC (zrzuty ekranów).
**Zewnętrzne (Do integracji/przepisania):** Content SoMe, Dietetyka (Lose It), Trening (Strong), Sen (Sleep Droid), Zdrowie ogółem (Google Fit), Google Calendar.

---

co do integracji z todoist

mam erro 410 o tym, ze jest deprecated

ale mam takie problemy:

1. w kalendarzu nie wiedzę rzeczy na dzisiaj z google calendar
2. nie widzę tasków z todoist nigdzie
3. jak kliknę start na nowy trackowany czas to mam 00:00:00 i to się zaczyna aktualizować realtime dopiero jak odświerzę stronę, nazwa jest nie edytowalna po wystartowaniu i jak klikam "zatrzymaj" to system nie realguje

co do todist tu masz o migracji

https://developer.todoist.com/api/v1/#tag/Migrating-from-v9

Migrating from v9

The Todoist API v1 is a new API that unifies the Sync API v9 and the REST API v2. This section shows what was changed in the new version in one single place to ease the migration for current apps and integrations.

The documentation for the Sync API v9 and REST API v2 are still available for reference.

wiec jak bym zaczal czytanie dokumentacji tu

https://developer.todoist.com/api/v1/#section/Developing-with-Todoist
