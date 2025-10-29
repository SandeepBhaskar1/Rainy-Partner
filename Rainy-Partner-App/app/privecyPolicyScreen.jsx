// screens/PrivacyPolicyScreen.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


export default function PrivacyPolicyScreen() {
    const router = useRouter();
  const privacyText = `
Privacy Policy
Last Updated: October 23, 2025

Welcome to Rainy Plumbers (“we,” “our,” or “us”).
We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our mobile application, website, and related services (collectively, the “Platform”).
By accessing or using Rainy Plumbers, you consent to the practices described in this Privacy Policy.

1. Summary: How Rainy Plumbers Uses Your Data
Type of Data       Purpose of Collection       Shared With Third Parties
Name, Phone, Email Account creation, communication, order management  No
Location Data      Assigning nearby leads and managing delivery     Yes (logistics partners)
Payment Details    Processing orders and payments                   Yes (secure payment gateway)
Usage & Device Data App improvement, analytics, crash reports         Yes (analytics providers)

We do not sell your data. You can delete your account or personal data at any time by contacting info@rainyfilters.com

2. Information We Collect
a. Personal Information
• Full Name
• Mobile Number
• Email Address
• Business Name or Company Name (if applicable)
• Address and Service Location
• Government-issued ID (if required)

b. Transactional Data
• Orders, delivery addresses, payment info

c. Lead and Service Data
• Installation lead details, job status, completion reports

d. Device and Usage Data
• Device type, OS, app version
• IP address, access time, crash logs, GPS location (with permission)

3. Consent for Data Collection
By using the Platform, you consent to collection, storage, processing, and limited sharing.

4. How We Use Your Information
- Account registration
- Processing orders & deliveries
- Assigning leads
- Communicating updates/offers
- Analyzing usage trends
- Preventing fraud, legal compliance

5. Data Sharing & Disclosure
We do not sell or rent your data. Shared only with customers, delivery partners, authorized providers, or legal requirements.

6. Data Security
- SSL encryption
- Restricted access
- Regular audits and backups

7. Data Retention
Data kept as long as account active or needed legally, then deleted securely.

8. Account Deletion
Delete via app or email info@rainyfilters.com, permanently removed in 7 working days.

9. App Permissions
Location, Camera & Storage, Phone Access – only for operational use.

10. Analytics
Anonymized usage/performance data.

11. Your Rights
Access/update personal data, withdraw consent, request deletion, lodge complaints.

12. Third-Party Links
Review privacy policies of linked services.

13. Children’s Privacy
App intended for 18+, minors’ data deleted immediately.

14. Global Users (GDPR)
Data may be processed in India; GDPR compliance followed.

15. Changes to Policy
Updates posted on Platform; continued use = acceptance.

16. Grievance Officer
Name: Sonal Pinto
Email: info@rainyfilters.com
Address: Farmland Rainwater Harvesting Systems, Karnataka, India.
Working Hours: Mon-Sat, 10AM-6PM (IST)

17. Contact Us
Email: sales@rainyfilters.com
Company: Farmland Rainwater Harvesting Systems
Website: www.rainyfilters.com
`;

  return (
    <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
      <SafeAreaView>
        <TouchableOpacity onPress={() => router.replace('/profile')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.text}>{privacyText}</Text>
        </SafeAreaView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
    backButton: {
    marginRight: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
});
