import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  HelperText,
  List,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";

import { WeatherApiError, searchCities } from "@/api";
import {
  MAX_SAVED_PLACES,
  DEVICE_SLOT,
  savedPlaceFromGeoLocation,
  type GeoLocation,
} from "@/domain";
import { notifier } from "@/notification/notifier";
import { refreshNotification } from "@/notification/update";
import { widgetDeps } from "@/widget/deps";
import { redrawWidgets } from "@/widget/redraw";
import {
  DEFAULT_LOCATIONS,
  DEFAULT_SETTINGS,
  WIDGET_OPACITY_STEPS,
  forecastCache,
  locationsStore,
  settingsStore,
  type AppSettings,
  type LocationsChangeError,
  type LocationsChangeResult,
  type LocationsState,
} from "@/storage";

const CHANGE_ERROR_TEXT: Record<LocationsChangeError, string> = {
  full: `You can save up to ${MAX_SAVED_PLACES} places. Remove one first.`,
  duplicate: "That place is already saved.",
  "last-location": "Keep at least one location.",
  "not-found": "That place is no longer saved.",
};

function describe(place: { region?: string; country?: string }): string {
  return [place.region, place.country].filter(Boolean).join(", ");
}

/** Locations: follow me, saved places and city search. Units and theme come later. */
export default function SettingsScreen() {
  const [state, setState] = useState<LocationsState>(DEFAULT_LOCATIONS);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [notificationNote, setNotificationNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    locationsStore.load().then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    settingsStore.get().then((loaded) => {
      if (!cancelled) setSettings(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Apply a store change: show the new state, or say why it was refused. */
  function applied(result: LocationsChangeResult): boolean {
    setState(result.state);
    setMessage(result.ok ? null : CHANGE_ERROR_TEXT[result.error]);
    return result.ok;
  }

  async function search() {
    setBusy(true);
    setMessage(null);
    try {
      const found = await searchCities(query);
      setResults(found);
      if (found.length === 0) setMessage("No cities found.");
    } catch (error) {
      setMessage(
        error instanceof WeatherApiError ? error.message : "Search failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function add(place: GeoLocation) {
    const added = applied(
      await locationsStore.addPlace(savedPlaceFromGeoLocation(place)),
    );
    if (added) {
      setResults([]);
      setQuery("");
    }
  }

  async function remove(id: string) {
    if (applied(await locationsStore.removePlace(id))) {
      await forecastCache.remove(id);
    }
  }

  /** Change how see-through the widget is, and redraw the widget at once. */
  async function changeOpacity(widgetOpacity: number) {
    setSettings(await settingsStore.update({ widgetOpacity }));
    await redrawWidgets(widgetDeps);
  }

  /**
   * The current-weather notification. Turning it on asks for the system
   * permission first, and the switch stays off if it is refused.
   */
  async function toggleNotification(on: boolean) {
    setNotificationNote(null);
    if (!on) {
      setSettings(await settingsStore.update({ ongoingNotification: false }));
      await notifier.clear();
      return;
    }
    const allowed =
      (await notifier.isAllowed()) || (await notifier.requestPermission());
    if (!allowed) {
      setNotificationNote(
        "Notifications are blocked for this app. Allow them in the system settings.",
      );
      return;
    }
    setSettings(await settingsStore.update({ ongoingNotification: true }));
    await refreshNotification(widgetDeps);
  }

  const full = state.places.length >= MAX_SAVED_PLACES;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleMedium">Widget background (% solid)</Text>
      <SegmentedButtons
        value={String(settings.widgetOpacity)}
        onValueChange={(value) => {
          void changeOpacity(Number(value));
        }}
        buttons={WIDGET_OPACITY_STEPS.map((step) => ({
          value: String(step),
          label: String(step),
          // Each segment has a minimum width that only fits five buttons;
          // without this the last one runs off the screen.
          style: { minWidth: 0 },
        }))}
      />
      <HelperText type="info">
        Lower values let the wallpaper show through. The text stays solid.
      </HelperText>
      <Divider />

      <Text variant="titleMedium" style={styles.heading}>
        Notification
      </Text>
      <List.Item
        title="Current weather notification"
        description="Shows the current conditions, also on the lock screen. Updates when the widget does."
        descriptionNumberOfLines={3}
        left={(props) => <List.Icon {...props} icon="bell-outline" />}
        right={() => (
          <Switch
            value={settings.ongoingNotification}
            onValueChange={(value) => {
              void toggleNotification(value);
            }}
          />
        )}
      />
      {notificationNote ? (
        <HelperText type="error">{notificationNote}</HelperText>
      ) : null}
      <Divider />

      <Text variant="titleMedium" style={styles.heading}>
        Locations
      </Text>

      <List.Item
        title="Follow me"
        description="Use this device's position"
        onPress={() => locationsStore.select(DEVICE_SLOT).then(applied)}
        left={(props) => (
          <List.Icon
            {...props}
            icon={
              state.selected === DEVICE_SLOT ? "check-circle" : "crosshairs-gps"
            }
          />
        )}
        right={() => (
          <Switch
            value={state.followMe}
            onValueChange={(value) => {
              void locationsStore.setFollowMe(value).then(applied);
            }}
          />
        )}
      />
      <Divider />

      {state.places.map((place) => (
        <View key={place.id}>
          <List.Item
            title={place.name}
            description={describe(place)}
            onPress={() => locationsStore.select(place.id).then(applied)}
            left={(props) => (
              <List.Icon
                {...props}
                icon={
                  state.selected === place.id ? "check-circle" : "map-marker"
                }
              />
            )}
            right={() => (
              <Button onPress={() => remove(place.id)}>Remove</Button>
            )}
          />
          <Divider />
        </View>
      ))}
      <Text variant="bodySmall" style={styles.count}>
        {state.places.length} of {MAX_SAVED_PLACES} places saved. Tap a place to
        show it.
      </Text>

      <Text variant="titleMedium" style={styles.heading}>
        Add a place
      </Text>
      <TextInput
        mode="outlined"
        label="Search city"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
        returnKeyType="search"
        disabled={full}
      />
      <Button
        mode="contained-tonal"
        icon="magnify"
        onPress={search}
        loading={busy}
        disabled={full || busy || query.trim().length < 2}
      >
        Search
      </Button>
      {message ? <HelperText type="error">{message}</HelperText> : null}

      {results.map((place) => (
        <View key={place.id}>
          <List.Item
            title={place.name}
            description={describe(place)}
            right={() => (
              <Button disabled={full} onPress={() => add(place)}>
                Add
              </Button>
            )}
          />
          <Divider />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
  heading: {
    marginTop: 16,
  },
  count: {
    marginTop: 4,
  },
});
