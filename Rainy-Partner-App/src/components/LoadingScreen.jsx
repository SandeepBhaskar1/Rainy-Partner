import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={{ uri: 'https://customer-assets.emergentagent.com/job_pipepro-platform/artifacts/pnr83gr9_Rainy%20Logo%20with%20R%20Symbol%203.jpg' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>Rainy Partner</Text>
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 32,
  },
  loader: {
    marginVertical: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});