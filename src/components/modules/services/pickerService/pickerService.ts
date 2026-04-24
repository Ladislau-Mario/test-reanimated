import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export const PickerService = {
  // Para a Foto Pessoal
  async pickProfileImage() { 
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permissão", "Precisamos de acesso às fotos.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    return !result.canceled ? result.assets[0].uri : null;
  },

  // Para a Carta de Condução (Aceita PDF e Imagens)
  async pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'], // Aceita PDF e qualquer imagem
      copyToCacheDirectory: true
    });

    return result.assets ? result.assets[0] : null;
  }
};