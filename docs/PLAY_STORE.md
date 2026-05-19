# Google Play Store release guide — Capital

This project is configured for **EAS Build** production Android builds as **AAB** (Android App Bundle), which Google Play requires for new apps.

## Prerequisites

1. [Google Play Console](https://play.google.com/console) developer account ($25 one-time).
2. [Expo account](https://expo.dev) linked to project owner `davidgyulinyan`.
3. [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
4. Log in: `eas login`

## One-time setup

### 1. Environment secrets (EAS)

Local `.env` is used for development only. Production builds need secrets on EAS:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value "YOUR_KEY" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --type string
```

List secrets: `eas secret:list`

`EXPO_PUBLIC_API_URL` is already set in `eas.json` for production/preview profiles. Override with a secret if needed.

### 2. Android signing (EAS credentials)

On first production build, EAS creates or uploads a keystore:

```bash
eas credentials --platform android
```

Keep credentials in EAS; do not commit `.jks` files.

### 3. Remote app versions

`eas.json` uses `"appVersionSource": "remote"` and production `autoIncrement: true` so **versionCode** increases on each Play upload.

Set the initial store version once (match `package.json` version `1.0.0`):

```bash
eas build:version:set --platform android --profile production
```

Follow prompts for `version` (e.g. `1.0.0`) and `versionCode` (e.g. `1`).

### 4. Push notifications (optional but recommended)

Rate alerts use `expo-notifications`. For reliable delivery on release builds:

1. Create a [Firebase](https://console.firebase.google.com/) project.
2. Add Android app with package `com.davidgyulinyan.exratiomobile`.
3. Download `google-services.json` and place it in the project root (gitignored).
4. Upload FCM key in EAS: `eas credentials --platform android`

Or use Expo’s push credential flow in the EAS dashboard.

### 5. Play Console app record

Create an app with package name **`com.davidgyulinyan.exratiomobile`** (must match `app.json`).

Prepare store listing:

- App name: **Capital**
- Short & full description (see marketing copy / README)
- Screenshots (phone 16:9 or device frames)
- Feature graphic 1024×500
- App icon 512×512 (high-res export from `assets/images/app-icon.png`)
- **Privacy policy URL** (required) — host your policy or use a public page; in-app text is under Settings → Privacy
- **Data safety** form: declare location, account email, analytics if any, etc.
- **Content rating** questionnaire
- **Target audience** and ads declaration (likely “No ads”)

### 6. Play App Signing

Enable **Google Play App Signing** when prompted. Upload the AAB from EAS; Google manages the app signing key.

## Build for Play Store

Production **AAB**:

```bash
npm run build:android
```

Equivalent:

```bash
eas build --platform android --profile production
```

Internal testing APK (optional):

```bash
npm run build:android:preview
```

When the build finishes, download the `.aab` from the Expo dashboard or CLI.

## Submit to Play Console

### Manual upload

1. Play Console → **Testing** → Internal testing (or Production when ready).
2. **Create new release** → Upload the `.aab`.
3. Add release notes, review, and roll out.

### EAS Submit (automated)

1. Create a [Google Play service account](https://expo.fyi/creating-google-service-account) with Play Console API access.
2. Save JSON key as `google-play-service-account.json` in project root (gitignored).
3. Run:

```bash
npm run submit:android
```

`eas.json` submits to **internal** track as **draft** by default. Edit `submit.production.android` in `eas.json` for `production` track when ready.

## Version updates

1. Bump `version` in `package.json` (and optionally `app.json` is synced via `app.config.js`).
2. Run production build again (`autoIncrement` bumps `versionCode`).
3. Upload new AAB and publish.

OTA JS updates (no store review for JS-only changes):

```bash
eas update --channel production --message "Describe change"
```

Only works for changes compatible with the installed native binary; native module or SDK changes need a new store build.

## Checklist before first production release

- [ ] `.env` populated locally; EAS secrets set for production
- [ ] `eas build --platform android --profile production` succeeds
- [ ] Test AAB on a real device (internal testing track)
- [ ] Converter works with live rates; sign-in works
- [ ] Rate alerts and notifications permission flow tested on Android 13+
- [ ] Location permission rationale acceptable (currency detection)
- [ ] Account deletion works (Play policy)
- [ ] Privacy policy URL live in Play Console
- [ ] Data safety form completed accurately

## Project configuration reference

| Item | Value |
|------|--------|
| App name | Capital |
| Android package | `com.davidgyulinyan.exratiomobile` |
| Build output (production) | AAB (`app-bundle`) |
| Min SDK | 24 |
| Target SDK | 35 |
| EAS project ID | `0e05b89a-80f4-4868-b91e-3009f1bcf007` |
| Updates channel (production) | `production` |

## Troubleshooting

- **Missing API key at runtime** — Add `EXPO_PUBLIC_API_KEY` as EAS secret; rebuild.
- **Supabase auth fails** — Set `EXPO_PUBLIC_SUPABASE_*` secrets; configure redirect URLs in Supabase dashboard.
- **versionCode conflict** — Run `eas build:version:set` or check versions in Expo dashboard.
- **Config schema errors** — Run `npx expo config --type public` and `npx expo-doctor`.
