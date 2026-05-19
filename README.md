# Capital

**Capital** is a React Native (Expo) app for live currency conversion, rate tracking, and Armenia-focused salary and finance calculators. The home screen is a customizable dashboard; conversion and tools open as modals or inline panels.

Package name: `exratio-mobile` · Expo slug: `ratesnap-mobile`

## Features

### Currency & rates

- **Currency converter** — fiat pairs with live rates, recent pair history, optional share text
- **Central Bank of Armenia (CBA) rates** — official AMD cross-rates for a defined foreign-currency subset, merged with the primary live API where applicable
- **Multi-currency view** — compare several targets against one base amount
- **Saved rates** — favorite pairs (local; synced to Supabase when signed in)
- **Rate alerts** — target rate above/below with push notifications
- **Rate charts** — historical-style charts for selected pairs
- **Offline-friendly** — cached exchange rates in AsyncStorage when the network fails

### Tools (dashboard)

Reorderable quick-action tiles (long-press reorder mode):

- Math **calculator** (expression evaluation via mathjs, history)
- **Tourist calculator**
- **Loan calculator**

### RA: Salary & finance

Illustrative calculators aligned with Armenian labor and tax practice (not legal advice):

- **Vacation & sick pay** — shared 12-month average salary; annual leave (Labor Code) and temporary disability benefit (sick leave) on one screen
- **Maternity / pregnancy leave** — illustrative benefit estimate
- **Salary** — gross ↔ net with pension, military stamp, health, and income tax (PIT on gross, matching typical payslip withholding)
- **Deposit** — interest growth with optional tax on profit
- **Loan calculator** (also on dashboard)

Form drafts persist locally; signed-in users sync some data via Supabase.

### RA: Freelance & tax

- Sole proprietor regimes, turnover tax, profit tax, VAT helper
- **Invoice** draft builder with reminders

### RA: Transport

- Vehicle **customs clearance** estimate (illustrative)
- Vehicle **sale** income-tax worksheet

### Account & app

- **Sign up / sign in** — Supabase Auth (email; OAuth where configured)
- **Optional app lock** — biometric unlock (Face ID / device biometrics)
- **Languages** — Armenian (default), English, Russian
- **Theme** — light / dark / system
- **Onboarding** guide for new users
- **Settings** — language, theme, notifications, saved/picked rates, terms, privacy policy, contact support, account deletion
- **EAS Update** — over-the-air updates via Expo (`expo-updates`)

## Tech stack

| Area | Stack |
|------|--------|
| Framework | [Expo](https://expo.dev) SDK 54, [Expo Router](https://docs.expo.dev/router/introduction/) |
| UI | React Native 0.81, React 19 |
| Language | TypeScript |
| Backend / auth | [Supabase](https://supabase.com) (auth, user data) |
| Live rates | ExchangeRate-API (or compatible URL) + CBA feed |
| Local storage | AsyncStorage, Secure Store (app lock) |
| Charts | react-native-chart-kit |
| Math | mathjs |

State is handled with React contexts (`AuthContext`, `LanguageContext`, `ThemeContext`, `AppLockContext`) and hooks—not Zustand.

## Project structure

```
ratesnap-mobile/
├── app/                      # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx         # Home dashboard
│   │   └── settings.tsx      # Settings
│   ├── signin.tsx, signup.tsx, forgot-password.tsx, reset-password.tsx
│   ├── auth/callback.tsx     # OAuth / email redirect
│   └── guide.tsx             # Onboarding
├── components/               # UI (converter, modals, calculators, …)
├── contexts/                 # Auth, language, theme, app lock
├── hooks/                    # Theme colors, user data hooks
├── lib/
│   ├── armenia/              # Payroll, leave, deposit, freelance, vehicle tax
│   ├── cbaExchangeRates.ts   # CBA rate fetch & filtering
│   ├── liveExchangeRates.ts  # Primary API + CBA merge
│   ├── userDataService.ts    # Supabase user data
│   └── legal/                # Privacy policy text (en / hy / ru)
├── constants/                # Theme tokens
├── tests/                    # Jest unit tests
├── assets/                   # Icons, splash, images
└── app.json                  # Expo config (name: Capital)
```

## Getting started

### Prerequisites

- Node.js 18+
- npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (or use `npx expo`)
- For device builds: [EAS CLI](https://docs.expo.dev/build/setup/) (`npm i -g eas-cli`)

### Install & run

```bash
git clone <your-repo-url>
cd ratesnap-mobile
npm install
```

Create a `.env` in the project root (values are also fallbacks in `app.json` `extra` for Supabase in dev):

```env
# Live exchange rates (required for converter)
EXPO_PUBLIC_API_URL=https://v6.exchangerate-api.com/v6/
EXPO_PUBLIC_API_KEY=your_exchange_rate_api_key

# Supabase (required for sign-in and cloud sync)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional: stable redirect for email / OAuth (recommended for production)
# EXPO_PUBLIC_AUTH_EMAIL_REDIRECT=https://your-domain.com/auth/callback
```

Start the dev server:

```bash
npx expo start
```

- **iOS simulator**: `i`
- **Android emulator**: `a`
- **Expo Go**: scan QR code
- **Web**: `w` (limited; some native features unavailable)

### Exchange rate API

Sign up at [ExchangeRate-API](https://www.exchangerate-api.com/) (or point `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_API_KEY` at another compatible provider). CBA rates are fetched separately and do not use this key.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | `expo start` — dev server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run in browser |
| `npm test` | Jest tests |
| `npm run lint` | ESLint (Expo config) |

## Testing

```bash
npm test
```

Tests cover calculator evaluation, Armenian payroll/leave logic, exchange-rate helpers, and related utilities. Some suites need the Expo Jest preset; if a test fails with Expo winter runtime errors, run individual files under `tests/` or fix `jest` / `jest-expo` setup.

## Building & updates

Production builds use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
eas build --platform ios
eas build --platform android
```

OTA updates (configured in `app.json`):

```bash
eas update --channel preview
```

Set the same `EXPO_PUBLIC_*` variables in EAS secrets or `eas.json` env for production builds.

## Important disclaimers

- Exchange rates and CBA attribution are for information only; verify amounts before financial decisions.
- Armenia salary, leave, freelance, and transport calculators are **illustrative** models. Rules change; confirm with your employer, accountant, or official sources.
- Privacy policy and terms are available in-app (Settings) in Armenian, English, and Russian.

## Contributing

1. Fork the repository  
2. Create a feature branch  
3. Add tests when changing calculation or rate logic  
4. Open a pull request  

## License

Private project — add a `LICENSE` file if you intend to open-source.

## Acknowledgments

- [ExchangeRate-API](https://www.exchangerate-api.com/) — live fiat rates  
- [Central Bank of Armenia](https://www.cba.am/) — official rate data  
- [Expo](https://expo.dev) · [Supabase](https://supabase.com)
