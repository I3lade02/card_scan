import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ headerTitleAlign: "center" }}>
            <Tabs.Screen name="scan" options={{ title: "Scan" }} />
            <Tabs.Screen name="collection" options={{ title: "Collection" }} />
            <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        </Tabs>
    );
}