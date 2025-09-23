import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function AgreementScreen({navigation}) {
  const [accepted, setAccepted] = useState(false);
const handleAccept = async () => {
  if (!accepted) {
    Alert.alert('Error', 'Please accept the terms and conditions to continue');
    return;
  }

  try {
    const token = await AsyncStorage.getItem('access_token');
    const BACKEND_URL = process.env.BACKEND_URL_LOCAL;

    await axios.put(
      `${BACKEND_URL}/plumber/agreement`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const userDataStr = await AsyncStorage.getItem('user_data');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      userData.agreement_status = true;
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    }

    router.push('/(tabs)/home');
  } catch (error) {
    Alert.alert('Error', 'Failed to save agreement acceptance');
  }
};


  const handleDecline = () => {
    Alert.alert(
      'Agreement Declined',
      'You must accept the agreement to use the app. The app will now close.',
      [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: 'https://customer-assets.emergentagent.com/job_pipepro-platform/artifacts/pnr83gr9_Rainy%20Logo%20with%20R%20Symbol%203.jpg' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>📑 Partner Plumber Agreement</Text>
        <Text style={styles.subtitle}>Please review and accept our terms</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.agreementCard}>
          <Text style={styles.agreementIntro}>
            This Partner Plumber Agreement ("Agreement") is entered into between:
          </Text>
          <Text style={styles.companyName}>
            Farmland Rainwater Harvesting Systems (Brand: Rainy) ("Company")
          </Text>
          <Text style={styles.agreementIntro}>
            You, the registered plumber partner ("Plumber"), through acceptance of these terms in the App.
          </Text>
          <Text style={styles.agreementIntro}>
            By clicking "I Agree", you accept all obligations under this Agreement.
          </Text>
          
          <Text style={styles.sectionTitle}>1. Appointment & Exclusivity</Text>
          <Text style={styles.text}>
            1.1 The Company authorizes the Plumber solely to install Rainy Filters and related products assigned through the App.
            {'\n\n'}1.2 The Plumber shall not use the App, customer leads, or Company's brand name to install, recommend, or promote any competitor's products.
            {'\n\n'}1.3 Violation of this clause will lead to immediate termination and possible legal action.
          </Text>

          <Text style={styles.sectionTitle}>2. Installation & Pricing</Text>
          <Text style={styles.text}>
            2.1 Only Rainy Filters supplied by the Company may be installed under this program.
            {'\n\n'}2.2 For basic installations, only the standard agreed charges as fixed by the Company shall be collected from customers.
            {'\n\n'}2.3 Any additional charges (for extra piping, masonry, or non-standard work) must be pre-informed to the customer and approved through the App.
            {'\n\n'}2.4 Overcharging, hidden charges, or deviation from approved pricing will result in suspension/termination.
          </Text>

          <Text style={styles.sectionTitle}>3. Customer Data & Confidentiality</Text>
          <Text style={styles.text}>
            3.1 The Plumber will receive customer information (name, address, phone, email, GST details) solely for the purpose of installation or delivery.
            {'\n\n'}3.2 The Plumber shall not misuse, share, store, sell, or exploit customer data for personal or third-party benefit.
            {'\n\n'}3.3 Any misuse of customer data will lead to immediate blacklisting, legal action under IT and privacy laws, and recovery of damages by the Company.
          </Text>

          <Text style={styles.sectionTitle}>4. Payments</Text>
          <Text style={styles.text}>
            4.1 Installation charges shall be collected directly from customers strictly as per Company policy.
            {'\n\n'}4.2 Product orders placed by the Plumber must be fully paid in advance via the App.
            {'\n\n'}4.3 Partner pricing will be displayed transparently within the App and may be updated by the Company from time to time.
          </Text>

          <Text style={styles.sectionTitle}>5. Obligations of the Plumber</Text>
          <Text style={styles.text}>
            • Upload valid KYC documents (Aadhar, Plumber License, GST if applicable).
            {'\n'}• Follow all installation manuals and safety guidelines.
            {'\n'}• Maintain professional behavior and integrity with customers.
            {'\n'}• Use own tools, ensure safety, and not misrepresent as an employee of the Company.
            {'\n'}• Not engage in activities that damage the Company's reputation.
          </Text>

          <Text style={styles.sectionTitle}>6. Obligations of the Company</Text>
          <Text style={styles.text}>
            • Provide installation training, product manuals, and technical guidance.
            {'\n'}• Ensure timely processing of orders placed through the App.
            {'\n'}• Provide partner support through the App and customer care.
          </Text>

          <Text style={styles.sectionTitle}>7. Liability & Indemnity</Text>
          <Text style={styles.text}>
            7.1 The Plumber is fully responsible for workmanship, safety, and customer satisfaction.
            {'\n\n'}7.2 The Plumber shall indemnify the Company against all claims, damages, or losses caused by negligence, misconduct, overcharging, or misuse of customer data.
            {'\n\n'}7.3 The Company shall not be liable for indirect or consequential losses arising from the Plumber's actions.
          </Text>

          <Text style={styles.sectionTitle}>8. Termination</Text>
          <Text style={styles.text}>
            Either Party may terminate with 7 days' notice.
            {'\n\n'}The Company may terminate immediately in case of:
            {'\n'}• Installation of non-Rainy products.
            {'\n'}• Overcharging or deviation from approved pricing.
            {'\n'}• Misuse of customer data.
            {'\n'}• Misconduct, fraud, or violation of this Agreement.
          </Text>

          <Text style={styles.sectionTitle}>9. Governing Law & Dispute Resolution</Text>
          <Text style={styles.text}>
            • Governed by the laws of India.
            {'\n'}• Disputes shall be referred to arbitration in Bangalore, Karnataka under the Arbitration and Conciliation Act, 1996.
            {'\n'}• Bangalore courts shall have exclusive jurisdiction.
          </Text>

          <Text style={styles.sectionTitle}>10. Entire Agreement</Text>
          <Text style={styles.text}>
            This Agreement constitutes the entire understanding between the Parties and overrides any previous arrangement.
          </Text>

          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactText}>
              Email: sales@rainyfilters.com
              {'\n'}Phone: +91 9008340790
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Acceptance Section */}
      <View style={styles.acceptanceSection}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <Text style={styles.checkboxText}>
            ✅ By clicking "I Agree", I confirm that I have read, understood, and agree to be legally bound by this Agreement.
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, !accepted && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={!accepted}
          >
            <Text style={styles.acceptButtonText}>I Agree</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  agreementCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  agreementIntro: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactInfo: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  acceptanceSection: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#999',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});