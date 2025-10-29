// context/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import translationService from '../services/translationService';

const LANGUAGE_KEY = 'app_language';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  const languages = [
    { code: 'ka', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  ];

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        i18n.locale = savedLanguage;
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      setCurrentLanguage(languageCode);
      i18n.locale = languageCode;
      await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  // Helper function to translate static text using i18n
  const t = (key, options) => {
    return i18n.t(key, options);
  };

  // Helper function to translate dynamic text from API
  const translateDynamic = async (text, sourceLang = 'en') => {
    if (currentLanguage === 'en' || !text) {
      return text;
    }
    return await translationService.translateText(text, currentLanguage, sourceLang);
  };

  // Helper function to translate multiple dynamic texts
  const translateDynamicBatch = async (texts, sourceLang = 'en') => {
    if (currentLanguage === 'en' || !texts || texts.length === 0) {
      return texts;
    }
    return await translationService.translateBatch(texts, currentLanguage, sourceLang);
  };

  // Helper function to translate entire objects from API
  const translateDynamicObject = async (obj, sourceLang = 'en') => {
    if (currentLanguage === 'en' || !obj) {
      return obj;
    }
    return await translationService.translateObject(obj, currentLanguage, sourceLang);
  };

  const value = {
    currentLanguage,
    languages,
    changeLanguage,
    t,
    translateDynamic,
    translateDynamicBatch,
    translateDynamicObject,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;