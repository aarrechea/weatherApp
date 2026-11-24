import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { requestPinWidget } from "react-native-android-widget";
import { Button, Text } from "react-native-paper";
import { Link } from "expo-router";

import type { DeviceFix } from "@/domain";
import {
  DeviceLocationError,
  getBackgroundLocationStatus,
  getDeviceLocation,
  requestBackgroundLocation,
  type BackgroundLocationStatus,
} from "@/location";
import { refreshNotification } from "@/notification/update";
import { locationsStore } from "@/storage";
import { widgetDeps } from "@/widget/deps";
import { WIDGET_NAME } from "@/widget/handler";

const STATUS_TEXT: Record<BackgroundLocationStatus, string> = {
  granted: 'Location: allowed "all the time". The widget can follow you.',
  "foreground-only":
    "Location: only while the app is open. The widget cannot follow you.",
  denied: "Location: not allowed.",
};

/**
 * Temporary home screen: the widget setup the widget needs to work. The real
 * main screen and the settings screen replace most of this in Phase 3.
 */
export default function HomeScreen() {
  const [status, setStatus] = useState<BackgroundLocationStatus | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [fix, setFix] = useState<DeviceFix | null>(null);
  const [fixNote, setFixNote] = useState<string>("Finding your position…");

  useEffect(() => {
    let cancelled = false;
    getBackgroundLocationStatus().then((value) => {
      if (!cancelled) setStatus(value);
    });
    // Keep the current-weather notification fresh whenever the app opens.
    void refreshNotification(widgetDeps);
    // Follow me: find the position now and save it. The widget falls back to
    // this saved position whenever it cannot get a fresh one in the background.
    getDeviceLocation({ requestPermission: false, timeoutMs: 20_000 })
      .then(async (found) => {
        await locationsStore.saveDeviceFix(found);
        if (!cancelled) setFix(found);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFixNote(
          error instanceof DeviceLocationError
            ? `No position yet: ${error.message}`
            : "No position yet.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function allowLocation() {
    setNote(null);
    try {
      setStatus(await requestBackgroundLocation());
    } catch (error) {
      setNote(
        error instanceof DeviceLocationError
          ? error.message
          : "Could not ask for location.",
      );
      setStatus(await getBackgroundLocationStatus());
    }
  }

  async function addWidget() {
    setNote(null);
    const supported = await requestPinWidget({ widgetName: WIDGET_NAME });
    if (!supported) {
      setNote(
        "Your launcher cannot add widgets from here. Long-press the home screen and choose Widgets.",
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Weather</Text>
      <Text variant="bodyMedium">The forecast will appear here.</Text>

      <Text variant="titleMedium" style={styles.heading}>
        Widget setup
      </Text>
      <Text variant="bodyMedium">
        {status === null ? "Checking location…" : STATUS_TEXT[status]}
      </Text>
      <Button mode="contained" icon="crosshairs-gps" onPress={allowLocation}>
        Allow location all the time
      </Button>
      <Button mode="contained-tonal" icon="widgets" onPress={addWidget}>
        Add the widget to the home screen
      </Button>
      {note ? <Text variant="bodySmall">{note}</Text> : null}
      <Text variant="bodySmall">
        {fix
          ? `Position saved: ${fix.latitude.toFixed(2)}, ${fix.longitude.toFixed(2)}` +
            (fix.accuracy === null ? "" : ` (±${Math.round(fix.accuracy)} m)`)
          : fixNote}
      </Text>

      <Link href="/settings" asChild>
        <Button mode="text" icon="cog">
          Settings
        </Button>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  heading: {
    marginTop: 16,
  },
});
