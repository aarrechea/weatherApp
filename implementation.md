# Weather App — Implementation

A personal, Android-only weather app. It has three parts that share one data layer:

- a **5 × 4 home-screen widget** with three screens (Current, Hourly, Daily) and navigation buttons,
- an optional **ongoing notification** with the current conditions (also shown on the lock screen),
- a small **app** used to set things up: saved places, widget background opacity and the notification switch.

There is no backend and no account. The only network calls go to Open-Meteo, which is free and needs no API key. The app is installed as an APK, not through a store.

This file describes what exists and how it fits together.

---

## 1. Tools and technologies

### App stack

| Tool                                        | Version              | What it is used for                                                                                                               |
| ------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| React Native                                | 0.88.1               | The app framework. The New Architecture and Hermes are on.                                                                        |
| Expo SDK                                    | 58 (`expo ~58.0.26`) | Build tooling, config plugins and native modules. A development build is used, not Expo Go, because the widget needs native code. |
| React                                       | 19.3.0               | UI. The React Compiler is enabled (`experiments.reactCompiler`).                                                                  |
| TypeScript                                  | ~6.0.3               | The whole code base. `strict` is on.                                                                                              |
| Expo Router                                 | ~58.0.32             | File-based navigation in `src/app/`.                                                                                              |
| React Native Paper                          | ^5.15.5              | Material 3 components and theme for the app screens.                                                                              |
| `react-native-android-widget`               | ^0.26.0              | Builds the home-screen widget from JavaScript. Widgets cannot use Paper.                                                          |
| `expo-location`                             | ~58.0.22             | The device position for "follow me", including background reads for the widget.                                                   |
| `expo-notifications`                        | ~58.1.9              | The ongoing weather notification. Local notifications only, no push.                                                              |
| `@react-native-async-storage/async-storage` | 2.2.0                | Persistent storage, behind the `KeyValueStore` interface.                                                                         |
| `@expo/vector-icons`                        | ^15.0.2              | Icons. Its Material Community Icons font is also bundled for the widget.                                                          |

### Data source

- **Open-Meteo forecast API**: `https://api.open-meteo.com/v1/forecast`
- **Open-Meteo geocoding API**: `https://geocoding-api.open-meteo.com/v1/search` (city name to coordinates)

### Build and quality tools

| Tool                                                            | Notes                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| JDK 25 (`/usr/lib/jvm/java-25-openjdk`)                         | Runs Gradle. Works with the versions below.                                    |
| Gradle 9.4.1, Android Gradle Plugin 9.2.1                       | Come with the generated `android/` project.                                    |
| Android SDK                                                     | compileSdk 37, build-tools 37.0.0, NDK 27.1.12297006, minSdk 24, targetSdk 36. |
| ESLint 9 with `eslint-config-expo` and `eslint-config-prettier` | `npm run lint`                                                                 |
| Prettier 3                                                      | `npm run format`, `npm run format:check`                                       |
| `tsc`                                                           | `npx tsc --noEmit`                                                             |
| `expo-doctor`                                                   | `npx expo-doctor` checks the project and dependency setup.                     |
| Android Studio, `adb`, an AVD (`Medium_Phone_API_37.0`)         | Emulator and device work.                                                      |

---

## 2. Repository layout

```
weather_app/
├── index.ts                  Custom entry point: sets the notification behavior,
│                             registers the widget task, then loads Expo Router
├── app.json                  Expo config: plugins, permissions, widget definition
├── package.json              Dependencies and scripts ("main" is index.ts)
├── implementation.md         This file
├── open_meteo.py             Reference script from Open-Meteo's variable picker
│                             (git-ignored: it contains personal coordinates)
├── AGENTS.md, README.md      Expo template files
├── assets/images/            App icons, splash image, notification-icon.png
├── android/                  Generated by `expo prebuild`. Git-ignored. Never edit.
└── src/
    ├── app/                  Expo Router routes (thin wrappers)
    │   ├── _layout.tsx       Paper provider, theme and the navigation stack
    │   ├── index.tsx         Home route
    │   └── settings.tsx      Settings route
    ├── screens/              The screens the routes show
    │   ├── HomeScreen.tsx    Temporary home: widget setup and position status
    │   └── SettingsScreen.tsx  Opacity, notification switch, places, city search
    ├── domain/               Pure types and logic. No React, no I/O.
    ├── api/                  Forecast and geocoding providers, errors, loading with cache
    ├── storage/              Persistent stores built on one key-value interface
    ├── location/             The device position and its permissions
    ├── notification/         The current-weather notification
    ├── widget/               Everything the widget draws and does
    └── theme/                The Material 3 light and dark Paper themes
```

About 4,300 lines of TypeScript in `src/`.

---

## 3. Architecture

### Layers and what depends on what

```
            ┌───────────────┐  ┌────────────────┐  ┌────────────────┐
  entry     │  app/screens  │  │     widget     │  │  notification  │
            └───────┬───────┘  └───────┬────────┘  └───────┬────────┘
                    │                  │                   │
                    └──────────────────┼───────────────────┘
                                       ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐
  services  │    api    │  │  storage  │  │ location  │  │ notifier │
            └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬─────┘
                  └──────────────┴───────┬──────┴─────────────┘
                                         ▼
                              ┌──────────────────┐
  core                        │      domain      │  types, selectors, weather codes
                              └──────────────────┘
```

Rules the code follows:

- **`domain` depends on nothing.** It holds the app's own model (`Forecast`, `Condition`, `Units`, `GeoLocation`, `SavedPlace`), the selectors that pick a slice of a forecast, and the weather-code mapping.
- **The UI never sees Open-Meteo's response format.** The adapter in `api/openMeteo/` converts it to the domain `Forecast`. To switch provider, write a new adapter and change one line in `api/config.ts`.
- **Persistence goes through `KeyValueStore`** (`getItem`, `setItem`, `removeItem`). AsyncStorage is the only implementation. Switching to MMKV means changing one line in `storage/index.ts`.
- **Widget logic takes its dependencies as a parameter** (`WidgetDeps`). The real wiring lives in `widget/deps.ts`. This is what makes the widget task testable without a phone.

### The three kinds of "forecast loading"

| Mode           | What it does                                                                                             | Used for                              |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| network first  | `loadForecast`: fetch, save to the cache, and on failure fall back to the cached forecast for that place | refreshes                             |
| cache first    | read the stored forecast, go online only if there is none                                                | button taps that only change the view |
| `loadSnapshot` | picks the selected place, applies the mode above, and returns either a forecast or a user-facing message | the widget and the notification       |

---

## 4. Modules in detail

### `src/domain/`

| File               | Contents                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forecast.ts`      | `Forecast`, `CurrentWeather`, `HourlyWeather`, `DailyWeather`, `Condition`, `Units`, `GeoLocation`. All values are in the units the forecast was fetched in (`forecast.units`).                                             |
| `weatherCodes.ts`  | WMO weather code to `Condition`, label and a Material Community Icons name (day and night variants).                                                                                                                        |
| `views.ts`         | Selectors: `currentHour`, `nextHours`, `hoursAhead`, `today`, `upcomingDays`, `daysAhead`, `restOfToday`, `rainOutlook`. They work relative to "now", so a stale cached forecast shows fewer entries instead of wrong ones. |
| `locations.ts`     | `SavedPlace`, `ResolvedLocation`, `DeviceFix`, `MAX_SAVED_PLACES` (3), the `DEVICE_SLOT` constant.                                                                                                                          |
| `widgetScreens.ts` | The three screens and `stepScreen` (back and forward with wrap-around).                                                                                                                                                     |
| `geo.ts`           | Great-circle distance (`distanceKm`).                                                                                                                                                                                       |

### `src/api/`

| File                                | Contents                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`, `config.ts`, `index.ts` | The provider interfaces, the one place that picks the providers, and the public functions `getForecast`, `searchCities`, `loadForecast`.    |
| `openMeteo/forecast.ts`             | Builds the request and maps the response. 9 days, `timezone=auto`, `timeformat=unixtime` so daylight-saving changes cannot shift any value. |
| `openMeteo/geocoding.ts`            | City search. Queries shorter than 2 characters never reach the network.                                                                     |
| `openMeteo/parse.ts`                | Small validators. Anything unexpected becomes a `parse` error.                                                                              |
| `http.ts`, `errors.ts`              | `fetchJson` with a 10 s timeout, and `WeatherApiError` with the kinds `network`, `timeout`, `http`, `parse`.                                |
| `loadForecast.ts`                   | Network first, cache as the fallback. Throws only if the request fails and nothing is cached.                                               |

### `src/storage/`

| Store               | Key                  | Holds                                                                                         |
| ------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `forecastCache.ts`  | `forecast:<slot>`    | The last forecast and its fetch time for each place, plus the coordinates it was made for.    |
| `locationsStore.ts` | `locations:v1`       | Up to 3 saved places, the follow-me switch, the selected place, and the last device position. |
| `settingsStore.ts`  | `settings:v1`        | `ongoingNotification` and `widgetOpacity`.                                                    |
| `widgetScreens.ts`  | `widget:<id>:screen` | The screen each widget instance shows.                                                        |

Rules worth knowing:

- A cached forecast is reused only within **5 km** of where it was made, so follow me never shows another city after you travel.
- `locationsStore` never allows an empty state: there is always follow me or a saved place. Concurrent changes are applied one at a time.
- Unreadable or corrupt stored data falls back to defaults and never throws.
- Opacity levels 40 and 20, which existed in an earlier version, are read as 50.

### `src/location/`

`getDeviceLocation()` asks for the foreground permission if needed, reuses a recent system position if there is one, and otherwise asks for a new fix with its own timeout. A position off by up to 5 km is accepted, because a forecast grid cell is several kilometers wide. With `background: true` it never shows a prompt and needs "Allow all the time". `requestBackgroundLocation()` and `getBackgroundLocationStatus()` drive the setup step. Failures are a `DeviceLocationError` with a `kind` the UI can act on.

### `src/widget/`

| File                                         | Contents                                                                                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handler.tsx`                                | `createWidgetTaskHandler(deps)`: the entry for everything Android asks of the widget (see section 5).                                                                                                                         |
| `widgetData.ts`                              | `WidgetDeps`, `loadSnapshot` and `contentFromLoaded`: which place, which forecast, or what to say when there is none.                                                                                                         |
| `model.ts`                                   | Turns a forecast into ready-to-show strings for each screen. Layout components only arrange these, so the text is testable without rendering.                                                                                 |
| `format.ts`                                  | Temperatures, rain, wind, visibility, clock times at the forecast's location.                                                                                                                                                 |
| `WeatherWidget.tsx`, `screens.tsx`, `ui.tsx` | The components: root widget, caption, navigation row, the three screens, and small building blocks. They must be plain functions with no hooks (a library rule) and start with `"use no memo"` because of the React Compiler. |
| `theme.ts`                                   | Light and dark colors (hex, because the library does not accept `rgb()`), and `widgetColors(theme, opacity)`.                                                                                                                 |
| `size.ts`                                    | `fontScale`: text grows with the widget's real size, from 0.8 to 1.5 times.                                                                                                                                                   |
| `glyphs.ts`                                  | Codepoints for the roughly 28 icons used. The widget draws an icon as text, so it needs the character, not the name.                                                                                                          |
| `redraw.tsx`                                 | `redrawWidgets`: redraw every widget on the home screen now, from the stored forecast.                                                                                                                                        |
| `deps.ts`, `widgetTaskHandler.ts`            | The real dependencies wired together, and the handler built from them.                                                                                                                                                        |

### `src/notification/`

`content.ts` builds the text, `update.ts` decides when to post, and `notifier.ts` talks to `expo-notifications`: one silent channel (`current-weather`), one notification identifier, posted again to replace itself. `types.ts` holds the `Notifier` interface so the widget code can be tested with a fake.

---

## 5. Key flows

### The widget updating itself

```
Android alarm (every ~30 min)  ─┐
widget added / app updated     ─┤
refresh button tapped          ─┴─▶ WIDGET_UPDATE / WIDGET_CLICK
                                          │  headless JavaScript task (app not open)
                                          ▼
                              loadSnapshot("refresh")
                                ├─ pick the selected place
                                ├─ follow me: background position (8 s), else last saved one
                                └─ loadForecast: network, else cache (marked "offline")
                                          │
                       ┌──────────────────┴──────────────────┐
                       ▼                                     ▼
              draw the widget                     update the notification
        (screen, size and opacity)           (if the switch is on, same forecast)
```

### Taps on the widget

| Tap              | Action                                                                  | Forecast mode                       |
| ---------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| ◀ / ▶            | `STEP_SCREEN` with a direction; the new screen is saved for that widget | cache                               |
| 📍               | `NEXT_LOCATION`: follow me, then each saved place, then follow me again | cache, and updates the notification |
| ⟳                | `REFRESH`                                                               | network                             |
| The weather area | `OPEN_APP`, handled by Android                                          | none                                |

Resizing the widget redraws from the cache. Removing it deletes its saved screen.

### The notification

Posted from the same forecast right after the widget is drawn, so the two agree. It is also updated when the app opens and when the Settings switch is turned on. The switch asks for the notification permission first and stays off if it is refused.

### Changing the opacity

The Settings row saves the level and calls `redrawWidgets`, so the widget changes at once. The widget task also reads the setting on every draw.

---

## 6. What the widget shows

The layout rule on every screen: two neighbouring values share one column, stacked, so there are fewer, wider columns and the text can be bigger.

| Screen      | Content                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Current** | Row 1: condition icon, temperature, label and feels-like, with today's max above min. Rows 2 and 3 in three columns: rain total above its chance, wind above gusts, sunrise above sunset; then humidity, wind direction, visibility. |
| **Hourly**  | Six hours, every third hour from the next one. Three columns of two stacked hours. Each has time and icon, temperature with feels-like, then rain and wind side by side with the amount above the unit.                              |
| **Daily**   | The eight days after today (labels like `Wed 25`), four columns of two. Each has icon, max and min, rain and max wind, and the day's highest chance of rain across the whole cell.                                                   |

Definitions that matter:

- **Rest of today** is the running hour plus every later hour of today. The rain amount on the Current screen is the total over those hours and the chance is the highest hourly chance in them. They are the same hours Open-Meteo uses for its own daily totals.
- **Navigation row:** `◀  📍  (empty)  ⟳  ▶`. Buttons and the divider never fade below 60% opacity, so the row stays visible.
- **Opacity levels:** 100, 90, 80, 70, 60, 50 percent. Only colors change, never the layout. Text and icons stay solid.

---

## 7. Configuration

### `app.json` plugins

| Plugin                        | Purpose                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `expo-router`                 | Routing                                                                                                                        |
| `expo-splash-screen`          | Splash screen                                                                                                                  |
| `expo-location`               | Background location on, foreground service off                                                                                 |
| `react-native-android-widget` | Defines the `Weather` widget: 5 × 4 cells, minimum 320 × 250 dp, resizable, 30-minute update period, and bundles the icon font |
| `expo-notifications`          | Notification icon and color                                                                                                    |

### Android permissions

Location (coarse, fine, background), `RECEIVE_BOOT_COMPLETED`, and `POST_NOTIFICATIONS` (added by the notifications library). The notification and badge libraries also declare a few more that this app does not use, such as foreground service and wake lock.

### Entry point

`index.ts` runs before the app UI so Android can start the widget without opening the app: it sets the notification behavior, registers the widget task handler, and only then imports `expo-router/entry`.

---

## 8. Build, run and install

```bash
# one-time and whenever a native module or plugin option changes
CI=1 npx expo prebuild --platform android --no-install

# build (JDK 25). First native build about 10 minutes, JS-only changes about 1 minute
cd android
JAVA_HOME=/usr/lib/jvm/java-25-openjdk ANDROID_HOME=$HOME/Android/Sdk \
  ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64

# install (phone is arm64, the emulator is x86_64)
adb -s <serial> install -r app/build/outputs/apk/release/app-release.apk
```

The release APK embeds the JavaScript, so the widget works without a development server. It is currently signed with the generated debug keystore.

### Checks before calling something done

```bash
npx tsc --noEmit
npx expo lint
npx prettier --check .
npx expo-doctor
```

---

## 9. Testing

There are **no automated tests in the repository yet**. During development the logic was checked with throwaway scripts kept outside the repo. They covered the formatters, the selectors, the stores, the cache rules, the Open-Meteo adapter against the live API, the widget task handler with fake dependencies, the widget layout (does every screen fit at five widget sizes), and the notification and opacity behavior. The widget and notification were also checked on an emulator and a phone. Turning those scripts into a committed test suite is a sensible next step.

---

## 10. Known limitations

- **Follow me is untested on a real phone.** The emulator never delivered a position. If a fresh background position fails, the widget uses the last one the app saved, which is saved only when the app is opened.
- **Automatic updates are not guaranteed to be regular.** The period is 30 minutes, the minimum Android allows, and the system may deliver late. Battery optimization and Doze can delay it further. If the widget goes stale, set the app's battery usage to "Unrestricted". There is no quick retry after a failed update.
- **The notification can show as "Content hidden"** on a phone set to hide sensitive content on the lock screen. Android decides this, not the app.
- **The notification stays fresh in the background only while the widget is on the home screen,** because the widget's updates drive it.
- **Units and theme are fixed** (°C, km/h, mm). The Settings screen does not offer them yet.
- **The in-app main screen is a placeholder.** The forecast is shown by the widget and the notification only.
- **The release APK uses the debug signing key.** Create and back up a real keystore before relying on the app, because losing it blocks updates over the installed app.
- **`open_meteo.py` contains personal coordinates,** so it is git-ignored and exists only on the developer's machine. Do not remove it from `.gitignore`.
- **The repository is public** (`github.com/aarrechea/weatherApp`). Never commit keystores, API keys or personal coordinates.

---

## 11. Where to change things

| To change                          | Go to                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Switch weather provider            | Write an adapter that implements `ForecastProvider`, then edit `src/api/config.ts`                             |
| Use MMKV instead of AsyncStorage   | Add a `KeyValueStore` implementation, then edit `src/storage/index.ts`                                         |
| Units                              | `DEFAULT_UNITS` in `src/domain/forecast.ts`, used by `src/widget/deps.ts`                                      |
| Number of days requested           | `FORECAST_DAYS` in `src/api/openMeteo/forecast.ts`                                                             |
| Hours and days shown on the widget | `HOURS_SHOWN`, `HOUR_STEP`, `DAYS_SHOWN` in `src/widget/model.ts`                                              |
| Opacity levels                     | `WIDGET_OPACITY_STEPS` in `src/storage/settingsStore.ts`                                                       |
| Widget colors                      | `WIDGET_COLORS` in `src/widget/theme.ts`                                                                       |
| Widget size, update period         | the `react-native-android-widget` entry in `app.json`, then prebuild                                           |
| Add a widget icon                  | Add its name to the list in `src/widget/glyphs.ts`                                                             |
| Notification text                  | `src/notification/content.ts`                                                                                  |
| Rain definitions ("rest of today") | `restOfToday` and `rainOutlook` in `src/domain/views.ts`                                                       |
| A new widget screen                | `src/domain/widgetScreens.ts`, `src/widget/model.ts`, `src/widget/screens.tsx`, `src/widget/WeatherWidget.tsx` |
