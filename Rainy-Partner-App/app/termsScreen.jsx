// screens/TermsAndConditionsScreen.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsAndConditionsScreen() {
  const router = useRouter();

  const termsText = `
Terms and Conditions
Last Updated: October 23, 2025

Welcome to Rainy Plumbers (“we,” “our,” or “us”).
These Terms and Conditions (“Terms”) govern your access to and use of the Rainy Plumbers mobile application, website, and related services (collectively, the “Platform”).
By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, please discontinue use immediately.

1. Definitions
• “User” / “You” – Any individual or business (including plumbers, technicians, or service partners) using the Platform.
• “Customer” – A person seeking installation or service through the Platform.
• “Products” – Rainwater harvesting filters, plumbing tools, or related products listed on the Platform.
• “Leads” – Installation or service requests shared with registered plumbers.

2. Eligibility
To use Rainy Plumbers, you must:
• Be at least 18 years old.
• Be a licensed or qualified plumber, installer, or professional.
• Provide accurate and complete registration details.

3. Account Registration and Responsibility
• Maintain confidentiality of account credentials.
• All activities under your account are your responsibility.
• Provide truthful and complete registration info.
• Notify info@rainyfilters.com if unauthorized access is suspected.

4. Services Provided
1. Product Ordering
2. Installation Leads
We act as a technology intermediary and are not an agent, employer, or contractor.

5. Product Orders and Payments
• Orders subject to confirmation and availability.
• Prices in Indian Rupees (₹), inclusive of taxes unless stated.
• Payments via bank transfer or UPI (no in-app payment gateway).
• Refunds issued via original payment method, if applicable.

6. Leads and Job Allocation
• Leads distributed based on location, profile, and performance.
• Accepting a lead means agreement to complete service responsibly.

7. User Obligations
• Provide accurate information.
• Use Platform for legitimate purposes.
• Avoid illegal or abusive content.
• Maintain professional conduct.
• Comply with local laws and safety standards.

8. Intellectual Property Rights
All content and designs are property of Rainy Plumbers / Rainy Filters. No reproduction without permission.

9. Privacy and Data Protection
Your use is governed by our Privacy Policy. Consent to data handling is implied.

10. Service Availability
Service may be interrupted due to maintenance or updates.

11. Limitation of Liability
We are not liable for direct/indirect losses, payment delays, or actions of users.

12. Indemnification
You agree to indemnify Rainy Plumbers for violations of these Terms or misuse of the Platform.

13. Termination
Access may be suspended/terminated for violations or misuse.

14. Governing Law and Jurisdiction
Laws of India; disputes resolved in Bengaluru courts.

15. Disclaimer
Platform provided “as is”. No warranties implied.

16. Updates to Terms
Updates posted within Platform; continued use = acceptance.

17. Grievance Officer
Name: Sonal Pinto
Email: info@rainyfilters.com
Address: Farmland Rainwater Harvesting Systems, Karnataka, India.
Working Hours: Mon-Sat, 10AM-6PM (IST)

18. Contact Us
Email: info@rainyfilters.com
Company: Farmland Rainwater Harvesting Systems
Website: www.rainyfilters.com
`;

  return (
    <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => router.replace('/profile')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Terms and Conditions</Text>
          <Text style={styles.text}>{termsText}</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    marginLeft: 10,
    marginTop: 10,
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
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
});
