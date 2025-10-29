// components/LanguageSelector.js
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const { height } = Dimensions.get('window');

const LanguageSelector = ({ visible, onClose }) => {
  const { currentLanguage, languages, changeLanguage, t } = useLanguage();

  const handleLanguageSelect = async (languageCode) => {
    await changeLanguage(languageCode);
    // Close modal after a short delay to show selection
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modal}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{t('settings.selectLanguage')}</Text>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Language List */}
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.languageList}>
                  {languages.map((language) => {
                    const isSelected = currentLanguage === language.code;
                    
                    return (
                      <TouchableOpacity
                        key={language.code}
                        style={[
                          styles.languageItem,
                          isSelected && styles.selectedLanguage,
                        ]}
                        onPress={() => handleLanguageSelect(language.code)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.languageInfo}>
                          <Text style={[
                            styles.nativeName,
                            isSelected && styles.selectedText
                          ]}>
                            {language.nativeName}
                          </Text>
                          <Text style={[
                            styles.languageName,
                            isSelected && styles.selectedSubText
                          ]}>
                            {language.name}
                          </Text>
                        </View>
                        
                        {isSelected && (
                          <View style={styles.checkmarkContainer}>
                            <Ionicons 
                              name="checkmark-circle" 
                              size={28} 
                              color="#4A90E2" 
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Footer Note */}
              <View style={styles.footer}>
                <Ionicons name="information-circle-outline" size={16} color="#999" />
                <Text style={styles.footerText}>
                  Changes will apply immediately
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    maxHeight: height * 0.5,
  },
  languageList: {
    paddingVertical: 8,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  selectedLanguage: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  languageInfo: {
    flex: 1,
  },
  nativeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  languageName: {
    fontSize: 14,
    color: '#999',
  },
  selectedText: {
    color: '#4A90E2',
  },
  selectedSubText: {
    color: '#4A90E2',
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default LanguageSelector;