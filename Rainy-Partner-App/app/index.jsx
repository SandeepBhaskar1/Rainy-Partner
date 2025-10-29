import React, { useEffect } from "react";
import { View, Image } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../src/Context/AuthContext";

export default function Index() {
  const router = useRouter();
  const { isLoading } = useAuth();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("user_data");
        const userData = userDataStr ? JSON.parse(userDataStr) : null;

        if (!userData) {
          router.replace("/login");
          return;
        }

        const savedLanguage = await AsyncStorage.getItem("app_language");
        if (!savedLanguage) {
          router.replace("/languageSelectionPage");
          return;
        }

        if (userData.needs_onboarding) {
          router.replace("/onboarding");
          return;
        }

        const agreementStatus =
          userData.agreement_status === true ||
          userData.agreement_status === "true";

        if (!agreementStatus) {
          router.replace("/agreement");
          return;
        }

        router.replace("/(tabs)/home");
      } catch (error) {
        console.error("❌ Error during index navigation:", error);
        router.replace("/login");
      }
    };

    if (!isLoading) {
      const timer = setTimeout(() => {
        checkUserAndRedirect();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
    >
      <Image
        source={require("../assets/Rainy-Splash.png")}
        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      />
    </View>
  );
}
