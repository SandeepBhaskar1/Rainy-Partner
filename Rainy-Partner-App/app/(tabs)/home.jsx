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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from 'react-native-keychain' 

export default function HomeScreen() {
  const { user, token, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [activeOrders, setActiveOrders] = useState(0);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.BACKEND_URL_LOCAL;

  const fetchProfile = async (token) => {
    const userRawData = await AsyncStorage.getItem("user_data");
    const userData = JSON.parse(userRawData);
    console.log(userData);
    

    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/plumber/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (error) {
      Alert.alert("Error Occurred. Please Try Again Later.");
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assigned jobs
  const fetchAssignedJobs = async (token) => {
    try {
      const res = await axios.get(
        `${process.env.BACKEND_URL_LOCAL}/plumber/assigned-jobs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(res.data.jobs);

      setAssignedJobs(res.data.jobs || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setAssignedJobs([]);
    }
  };

  // Fetch active orders
  const fetchActiveOrders = async (token) => {
    try {
      const res = await axios.get(
        `${process.env.BACKEND_URL_LOCAL}/plumber/orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const filtered =
        res.data?.filter(
          (order) =>
            order.status === "Pending" ||
            order.status === "Processing" ||
            order.status === "Dispatched"
        ) || [];
      setActiveOrders(filtered.length);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setActiveOrders(0);
    }
  };

  // Fetch everything together
  const fetchAll = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
         await Promise.all([
      fetchProfile(token),
      fetchAssignedJobs(token),
      fetchActiveOrders(token)
    ]) 
  }catch (err) {
      console.error('Error in fetchAll', err)
    }
  }, []); 

  useEffect(() => {
    if (token) {
      fetchAll();
    }
  }, [token, fetchAll]);

  // Loader / Empty profile fallback
  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 50 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          Profile not found.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAll} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.name}>{profile.name || "Partner"}</Text>
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

        {/* KYC Status Banner */}
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
                ? "KYC verification is pending"
                : "KYC verification was rejected. Please contact support."}
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/jobs")}
          >
            <Ionicons name="briefcase" size={24} color="#4A90E2" />
            <Text style={styles.statNumber}>{assignedJobs?.length || 0}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/orders")}
          >
            <Ionicons name="cube-outline" size={24} color="#00B761" />
            <Text style={styles.statNumber}>{activeOrders || 0}</Text>
            <Text style={styles.statLabel}>Active Orders</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          {assignedJobs.length > 0 ? (
            assignedJobs.slice(0, 3).map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobTitleRow}>
                  <Text style={styles.jobTitle}>{job.client.name}</Text>

                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>Urgent</Text>
                  </View>
                </View>
                <Text style={styles.jobSub}>{job.client.address}</Text>
                <Text style={styles.jobSub1}>{job.model_purchased}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent jobs found.</Text>
          )}
        </View>

        {/* Training Videos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Videos</Text>
          <TouchableOpacity
            style={styles.videoCard}
            onPress={() => Linking.openURL("https://youtu.be/Y9NSGoK-pvI?si=5eMMj3clWeQs4yUA")}
          >
            {/* Left Side Icon */}
            <View style={styles.videoIconWrapper}>
              <Ionicons name="play-circle" size={40} color="#FF5722" />
            </View>

            {/* Right Side Title + Description */}
            <View style={styles.videoContent}>
              <Text style={styles.videoText}>Installation Guide</Text>
              <Text style={styles.videoDesc}>
                Complete step-by-step installation tutorial
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.videoCard}
            onPress={() => Linking.openURL("https://youtu.be/NIHGeMq2dWQ?si=PDIbK_E_ULzhMdgO")}
          >
            {/* Left Side Icon */}
            <View style={styles.videoIconWrapper}>
              <Ionicons name="play-circle" size={40} color="#FF5722" />
            </View>

            {/* Right Side Title + Description */}
            <View style={styles.videoContent}>
              <Text style={styles.videoText}>Maintenance Guide</Text>
              <Text style={styles.videoDesc}>
                Keep yout filters running efficiently.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.videoCard}
            onPress={() => Linking.openURL("https://youtu.be/LLMJKRG0kPs?si=2ULep4Ucg9dsWmou")}
          >
            {/* Left Side Icon */}
            <View style={styles.videoIconWrapper}>
              <Ionicons name="play-circle" size={40} color="#FF5722" />
            </View>

            {/* Right Side Title + Description */}
            <View style={styles.videoContent}>
              <Text style={styles.videoText}>Do's & Don'ts </Text>
              <Text style={styles.videoDesc}>
                The crucial Do's and Don'ts for Rainy Rainwater Harvesting Filters.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.accountItem}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="person" size={22} color="#4A90E2" />
            <Text style={styles.accountText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accountItem}
            onPress={() =>
              Alert.alert("Confirm Logout", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: logout },
              ])
            }
          >
            <Ionicons name="log-out" size={22} color="#FF3B30" />
            <Text style={[styles.accountText, { color: "#FF3B30" }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
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
  urgentText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
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

  videoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  videoDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  accountText: { marginLeft: 12, fontSize: 16, color: "#333" },
});
