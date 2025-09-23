// components/KYCProtected.jsx
import React, { useEffect } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../Context/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const KYCProtected = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.kyc_status !== 'approved') {
      Alert.alert(
        'Not Authorized',
        'You need to complete KYC to view this page.',
        [{ text: 'OK', onPress: () => router.replace('/home') }]
      );
    }
  }, [user]);

  if (!user) {
    return null; // waiting for redirect
  }

  if (user.kyc_status !== 'approved') {
    // Fallback UI if you want to show something before redirect
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {user.kyc_status === 'pending'
              ? 'KYC verification is pending'
              : 'KYC verification was rejected. Please contact support.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { padding: 20, backgroundColor: '#f8d7da', borderRadius: 8 },
  bannerText: { color: '#721c24', fontSize: 16, textAlign: 'center' },
});

export default KYCProtected;
