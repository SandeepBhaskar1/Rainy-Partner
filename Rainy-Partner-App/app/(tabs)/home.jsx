import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/Context/AuthContext";
import axios from "axios";
import { router } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";

export default function HomeScreen() {
  const { user, token, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [activeOrders, setActiveOrders] = useState(0);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchProfile = async (token) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/plumber/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (error) {
      Alert.alert(t("home.errorOccurred"));
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedJobs = async (token) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/plumber/assigned-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignedJobs(res.data.jobs || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setAssignedJobs([]);
    }
  };

  const fetchActiveOrders = async (token) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/plumber/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered =
        res.data?.filter(
          (order) =>
            order.status === "Order-Placed" ||
            order.status === "Payment-Completed" ||
            order.status === "Dispatched"
        ) || [];
      setActiveOrders(filtered.length);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setActiveOrders(0);
    }
  };

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      await Promise.all([
        fetchProfile(token),
        fetchAssignedJobs(token),
        fetchActiveOrders(token),
      ]);
    } catch (err) {
      console.error("Error in fetchAll", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAll();
  }, [token, fetchAll]);

  const goToOrders = useCallback(
    () => router.push("/(tabs)/orders?tab=track"),
    []
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          {t("common.loading")}
        </Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          {t("home.profileNotFound")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAll} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{t("home.welcomeBack")}</Text>
              <Text style={styles.name}>
                {profile.name || t("home.partner")}
              </Text>
            </View>
            <View style={styles.profileImageContainer}>
              <Ionicons
                name="person-circle"
                size={50}
                color="#4A90E2"
                onPress={() => router.push("/(tabs)/profile")}
              />
            </View>
          </View>
        </View>

        {profile.kyc_status !== "approved" && (
          <View
            style={[
              styles.banner,
              profile.kyc_status === "pending"
                ? styles.warningBanner
                : styles.errorBanner,
            ]}
          >
            <Ionicons
              name={profile.kyc_status === "pending" ? "time" : "alert-circle"}
              size={24}
              color="white"
            />
            <Text style={styles.bannerText}>
              {profile.kyc_status === "pending"
                ? t("home.kycPending")
                : t("home.kycRejected")}
            </Text>
          </View>
        )}

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/jobs")}
          >
            <Ionicons name="briefcase" size={24} color="#4A90E2" />
            <Text style={styles.statNumber}>{assignedJobs?.length || 0}</Text>
            <Text style={styles.statLabel}>{t("home.activeJobs")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={goToOrders}>
            <Ionicons name="cube-outline" size={24} color="#00B761" />
            <Text style={styles.statNumber}>{activeOrders || 0}</Text>
            <Text style={styles.statLabel}>{t("home.activeOrders")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.recentJobs")}</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/jobs")}>
            {assignedJobs.length > 0 ? (
              assignedJobs.slice(0, 3).map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobTitleRow}>
                    <Text style={styles.jobTitle}>{job.client.name}</Text>
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>{t("home.urgent")}</Text>
                    </View>
                  </View>
                  <Text style={styles.jobSub}>{job.client.address}</Text>
                  <Text style={styles.jobSub1}>{job.model_purchased}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{t("home.noRecentJobs")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.trainingVideos")}</Text>

          <TouchableOpacity
            style={styles.videoCard}
            onPress={() =>
              Linking.openURL(
                "https://youtu.be/Y9NSGoK-pvI?si=5eMMj3clWeQs4yUA"
              )
            }
          >
            <View style={styles.videoIconWrapper}>
              <Ionicons name="play-circle" size={40} color="#FF5722" />
            </View>
            <View style={styles.videoContent}>
              <Text style={styles.videoText}>
                {t("home.installationGuide")}
              </Text>
              <Text style={styles.videoDesc}>{t("home.installationDesc")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.videoCard}
            onPress={() =>
              Linking.openURL(
                "https://youtu.be/NIHGeMq2dWQ?si=PDIbK_E_ULzhMdgO"
              )
            }
          >
            <View style={styles.videoIconWrapper}>
              <Ionicons name="play-circle" size={40} color="#FF5722" />
            </View>
            <View style={styles.videoContent}>
              <Text style={styles.videoText}>{t("home.maintenanceGuide")}</Text>
              <Text style={styles.videoDesc}>{t("home.maintenanceDesc")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.videoCard}
            onPress={() =>
              Linking.openURL(
                "https://youtu.be/LLMJKRG0kPs?si=2ULep4Ucg9dsWmou"
              )
            }
          >
            <View style={styles.videoIconWrapper}>
              <Ionicons name="play-circle" size={40} color="#FF5722" />
            </View>
            <View style={styles.videoContent}>
              <Text style={styles.videoText}>{t("home.dosAndDonts")}</Text>
              <Text style={styles.videoDesc}>{t("home.dosAndDontsDesc")}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.account")}</Text>
          <TouchableOpacity
            style={styles.accountItem}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="person" size={22} color="#4A90E2" />
            <Text style={styles.accountText}>{t("common.profile")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accountItem}
            onPress={() =>
              Alert.alert(t("home.confirmLogout"), t("home.areYouSure"), [
                { text: t("common.cancel"), style: "cancel" },
                { text: t("common.logout"), onPress: logout },
              ])
            }
          >
            <Ionicons name="log-out" size={22} color="#FF3B30" />
            <Text style={[styles.accountText, { color: "#FF3B30" }]}>
              {t("common.logout")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 16, color: "#666" },
  name: { fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 4 },
  profileImageContainer: { alignItems: "center", justifyContent: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
  },
  warningBanner: { backgroundColor: "#FF9500" },
  errorBanner: { backgroundColor: "#FF3B30" },
  bannerText: { color: "white", fontSize: 14, marginLeft: 8, flex: 1 },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginVertical: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 8 },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  section: { marginBottom: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  jobCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  jobTitle: { fontSize: 16, fontWeight: "500", color: "#333" },
  jobSub: { fontSize: 14, color: "#666", marginTop: 4 },
  jobSub1: { fontSize: 14, color: "#4A90E2", marginTop: 4 },
  emptyText: { fontSize: 14, color: "#999", fontStyle: "italic" },
  urgentBadge: {
    backgroundColor: "red",
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 12,
  },
  urgentText: { color: "white", fontSize: 12, fontWeight: "bold" },
  jobTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginTop: 5,
  },
  videoIconWrapper: {
    width: "15%",
    justifyContent: "center",
    alignItems: "center",
  },
  videoContent: {
    width: "85%",
    flexDirection: "column",
    justifyContent: "center",
  },
  videoText: { fontSize: 16, fontWeight: "600", color: "#333" },
  videoDesc: { fontSize: 12, color: "#666", marginTop: 4 },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  accountText: { marginLeft: 12, fontSize: 16, color: "#333" },
});
