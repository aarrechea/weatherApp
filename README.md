# Weather App

A personal weather app for Android, built around a **home-screen widget**. It shows the current conditions, the next hours and the coming days, and can keep the current weather in a notification on the lock screen. There is no backend and no account: the data comes straight from [Open-Meteo](https://open-meteo.com/).

It is a personal project, installed as an APK. It is not published on any store.

## What it does

- **A 5 × 4 home-screen widget** with three screens you step through with back and forward buttons:
  - **Current:** temperature, condition, feels-like, today's max and min, humidity, wind, gusts, visibility, sunrise and sunset, and the chance and amount of rain for the rest of today.
  - **Hourly:** six hours, every third hour, with temperature, rain and wind.
  - **Daily:** the eight days after today, with max and min, rain, wind and the chance of rain.
- **Follow me plus up to three saved places.** A location button on the widget cycles through them. City search uses Open-Meteo's geocoding.
- **An optional ongoing notification** with the current conditions, also shown on the lock screen.
- **Adjustable widget background** from fully solid down to 50% opacity.
- **Works offline:** the last forecast for each place is kept and shown, marked as offline, when there is no connection.
- Updates itself about every 30 minutes, and on demand with the refresh button.

## Built with

React Native and Expo (SDK 58) with TypeScript, Expo Router, React Native Paper and `react-native-android-widget`. The structure, the tools and how the pieces fit together are described in [implementation.md](implementation.md).

## Running it

You need Node.js, a JDK (17 or newer; it is developed with 25) and the Android SDK (platform 37 and NDK 27.1.12297006; Gradle can download them), with `JAVA_HOME` and `ANDROID_HOME` set. The app uses native code for the widget, so Expo Go cannot run it: it needs a real build.

```bash
npm install

# generate the native Android project (git-ignored)
CI=1 npx expo prebuild --platform android --no-install

# build a release APK that includes the JavaScript
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64

# install on a connected phone or emulator
adb install -r app/build/outputs/apk/release/app-release.apk
```

Then open the app, and add the **Weather** widget from the home screen's widget picker (or with the button in the app).

Checks:

```bash
npx tsc --noEmit
npm run lint
npm run format:check
```

### Permissions

- **Location**, only for the follow-me place. The widget's background updates need "Allow all the time". Saved places work without any location permission.
- **Notifications**, only if you turn on the current-weather notification in Settings.

The release APK from these steps is signed with a generated debug key. Use your own signing key before you rely on updates over an installed copy.

## Data

Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Open-Meteo's free service is for non-commercial use.
