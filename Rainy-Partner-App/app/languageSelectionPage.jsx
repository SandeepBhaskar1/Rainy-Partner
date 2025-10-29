// screens/LanguageSelectionScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'expo-router';

const LanguageSelectionScreen = ({ navigation }) => {
  const { languages, currentLanguage, changeLanguage, t } = useLanguage();
  const router = useRouter();

  const handleLanguageSelect = async (langCode) => {
    await changeLanguage(langCode);
    router.replace('/onboarding')
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{'Select Your Language'}</Text>

      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.button,
            lang.code === currentLanguage && styles.selectedButton,
          ]}
          onPress={() => handleLanguageSelect(lang.code)}
        >
          <Text
            style={[
              styles.buttonText,
              lang.code === currentLanguage && styles.selectedText,
            ]}
          >
            {lang.nativeName}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default LanguageSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 12,
    marginVertical: 8,
    backgroundColor: '#fff',
    width: '80%',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 18,
    color: '#333',
  },
  selectedText: {
    color: '#fff',
  },
});
