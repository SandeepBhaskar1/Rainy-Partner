import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../src/Context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import i18n from "../i18n";
import { useLanguage } from "../context/LanguageContext";
import axios from "axios";

export default function AgreementScreen({ navigation }) {
  const { setUser, Backend_url } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const { t } = useLanguage();

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert(
        t("common.error"),
        t("agreement.errorAccept")
      );
      return;
    }

    const token = await SecureStore.getItemAsync("access_token");

    try {
      const response = await axios.put(
        `${Backend_url}/plumber/agreement`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await AsyncStorage.removeItem("user_data");

      const updatedUserData = response.data.user;

      if (!updatedUserData || !updatedUserData._id) {
        throw new Error(
          "Backend did not return user data. Make sure your backend endpoint returns the user object."
        );
      }

      await AsyncStorage.setItem("user_data", JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      
      router.push("/(tabs)/home");
    } catch (error) {
      Alert.alert(t("common.error"), t("agreement.failedToSave"));
    }
  };

  const handleDecline = () => {
    Alert.alert(
      t("agreement.declineTitle"),
      t("agreement.declineMessage"),
      [{ text: t("agreement.okButton"), onPress: () => router.replace("/login") }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{
            uri: "https://customer-assets.emergentagent.com/job_pipepro-platform/artifacts/pnr83gr9_Rainy%20Logo%20with%20R%20Symbol%203.jpg",
          }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{t("agreement.title")}</Text>
        <Text style={styles.subtitle}>{t("agreement.subtitle")}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.agreementCard}>
          <Text style={styles.agreementIntro}>
            {t("agreement.introText")}
          </Text>
          <Text style={styles.companyName}>
            {t("agreement.companyName")}
          </Text>
          <Text style={styles.agreementIntro}>
            {t("agreement.plumberText")}
          </Text>
          <Text style={styles.agreementIntro}>
            {t("agreement.agreementNote")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section1Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section1Text")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section2Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section2Text")}
          </Text>

          <Text style={styles.sectionTitle}>
            {t("agreement.section3Title")}
          </Text>
          <Text style={styles.text}>
            {t("agreement.section3Text")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section4Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section4Text")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section5Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section5Text")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section6Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section6Text")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section7Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section7Text")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section8Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section8Text")}
          </Text>

          <Text style={styles.sectionTitle}>
            {t("agreement.section9Title")}
          </Text>
          <Text style={styles.text}>
            {t("agreement.section9Text")}
          </Text>

          <Text style={styles.sectionTitle}>{t("agreement.section10Title")}</Text>
          <Text style={styles.text}>
            {t("agreement.section10Text")}
          </Text>

          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>{t("agreement.contactTitle")}</Text>
            <Text style={styles.contactText}>
              {t("agreement.contactText")}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.acceptanceSection}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <Text style={styles.checkboxText}>
            {t("agreement.checkboxText")}
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
          >
            <Text style={styles.declineButtonText}>{t("agreement.declineButton")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptButton,
              !accepted && styles.acceptButtonDisabled,
            ]}
            onPress={handleAccept}
            disabled={!accepted}
          >
            <Text style={styles.acceptButtonText}>{t("agreement.agreeButton")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  agreementCard: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  agreementIntro: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A90E2",
    textAlign: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  contactInfo: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  acceptanceSection: {
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  checkboxText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FF3B30",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  declineButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonDisabled: {
    backgroundColor: "#999",
  },
  acceptButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});