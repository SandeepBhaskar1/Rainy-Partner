// services/translationService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Replace with your actual Google Cloud API Key
const GOOGLE_TRANSLATE_API_KEY = 'YOUR_GOOGLE_CLOUD_API_KEY';
const TRANSLATION_CACHE_PREFIX = 'translation_';

class TranslationService {
  constructor() {
    this.cache = new Map();
    this.loadCacheFromStorage();
  }

  // Load cached translations from AsyncStorage
  async loadCacheFromStorage() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const translationKeys = keys.filter(key => 
        key.startsWith(TRANSLATION_CACHE_PREFIX)
      );
      
      const cachedTranslations = await AsyncStorage.multiGet(translationKeys);
      cachedTranslations.forEach(([key, value]) => {
        if (value) {
          this.cache.set(key, JSON.parse(value));
        }
      });
    } catch (error) {
      console.error('Error loading translation cache:', error);
    }
  }

  // Generate cache key
  getCacheKey(text, targetLang, sourceLang = 'en') {
    return `${TRANSLATION_CACHE_PREFIX}${sourceLang}_${targetLang}_${text.substring(0, 50)}`;
  }

  // Translate single text
  async translateText(text, targetLang, sourceLang = 'en') {
    // If text is empty or null, return as is
    if (!text || text.trim() === '') {
      return text;
    }

    // If target language is source language, return original text
    if (targetLang === sourceLang || targetLang === 'en') {
      return text;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text, targetLang, sourceLang);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check AsyncStorage cache
    try {
      const cachedValue = await AsyncStorage.getItem(cacheKey);
      if (cachedValue) {
        const parsed = JSON.parse(cachedValue);
        this.cache.set(cacheKey, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    // Translate using Google Cloud Translation API
    try {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
        {
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }
      );

      const translatedText = response.data.data.translations[0].translatedText;
      
      // Cache the translation
      this.cache.set(cacheKey, translatedText);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(translatedText));
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      // Return original text if translation fails
      return text;
    }
  }

  // Translate multiple texts in batch
  async translateBatch(texts, targetLang, sourceLang = 'en') {
    if (!texts || texts.length === 0) {
      return texts;
    }

    if (targetLang === sourceLang || targetLang === 'en') {
      return texts;
    }

    try {
      // Check which texts are already cached
      const uncachedTexts = [];
      const results = [];

      for (const text of texts) {
        if (!text || text.trim() === '') {
          results.push(text);
          continue;
        }

        const cacheKey = this.getCacheKey(text, targetLang, sourceLang);
        
        if (this.cache.has(cacheKey)) {
          results.push(this.cache.get(cacheKey));
        } else {
          const cachedValue = await AsyncStorage.getItem(cacheKey);
          if (cachedValue) {
            const parsed = JSON.parse(cachedValue);
            this.cache.set(cacheKey, parsed);
            results.push(parsed);
          } else {
            uncachedTexts.push({ text, index: results.length });
            results.push(null); // Placeholder
          }
        }
      }

      // Translate uncached texts
      if (uncachedTexts.length > 0) {
        const response = await axios.post(
          `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
          {
            q: uncachedTexts.map(item => item.text),
            source: sourceLang,
            target: targetLang,
            format: 'text',
          }
        );

        const translations = response.data.data.translations;
        
        for (let i = 0; i < uncachedTexts.length; i++) {
          const translatedText = translations[i].translatedText;
          const originalText = uncachedTexts[i].text;
          const resultIndex = uncachedTexts[i].index;
          
          // Update result array
          results[resultIndex] = translatedText;
          
          // Cache the translation
          const cacheKey = this.getCacheKey(originalText, targetLang, sourceLang);
          this.cache.set(cacheKey, translatedText);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(translatedText));
        }
      }

      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts; // Return original texts if translation fails
    }
  }

  // Translate an object's values recursively
  async translateObject(obj, targetLang, sourceLang = 'en') {
    if (targetLang === sourceLang || targetLang === 'en') {
      return obj;
    }

    if (typeof obj === 'string') {
      return await this.translateText(obj, targetLang, sourceLang);
    }

    if (Array.isArray(obj)) {
      return await Promise.all(
        obj.map(item => this.translateObject(item, targetLang, sourceLang))
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      const translated = {};
      for (const [key, value] of Object.entries(obj)) {
        translated[key] = await this.translateObject(value, targetLang, sourceLang);
      }
      return translated;
    }

    return obj;
  }

  // Clear cache
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const translationKeys = keys.filter(key => 
        key.startsWith(TRANSLATION_CACHE_PREFIX)
      );
      await AsyncStorage.multiRemove(translationKeys);
      this.cache.clear();
      console.log('Translation cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache size
  getCacheSize() {
    return this.cache.size;
  }
}

export default new TranslationService();