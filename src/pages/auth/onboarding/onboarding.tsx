import * as React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { Octicons, MaterialIcons } from '@expo/vector-icons';

// Componentes e Estilos do Baza
import BackgroundWrapper from '../../../components/layout/background/bgscreen';
import { themes } from '../../../global/themes';
import { styles } from "./style";
import { Button } from '../../../components/common/button/button';
import { GradientButton } from '../../../components/common/GradientButton/gradientButton';

// Google Sign-In 2025
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Firebase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../../../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

// API
import api from '../../../components/modules/services/api/api';

// Configura o Google Sign-In uma vez
GoogleSignin.configure({
  webClientId: "358855325316-labl2pan8a9qaoq2rbjajfr42d8u0t7s.apps.googleusercontent.com",
  offlineAccess: true,
});

export default function Onboarding() {
  const navigation = useNavigation<any>();

  /*
  const handleGoogleSignIn = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    console.log("Play Services OK");
    
    const userInfo = await GoogleSignin.signIn();
    console.log("USER INFO:", JSON.stringify(userInfo));
    
    // ✅ Sem servidor — navega directamente
    navigation.navigate('ChoiceMode');

  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log("Cancelado");
    } else {
      console.log("Erro Google Sign-In:", error);
    }
  }
};
 */  
  const handleGoogleSignIn = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    console.log("Play Services OK");
    
    const userInfo = await GoogleSignin.signIn();
    console.log("USER INFO:", JSON.stringify(userInfo));
    
    const { idToken } = await GoogleSignin.getTokens();
      
      // Pega o token e autentica no Firebase
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        token: idToken,
      };

      try {
        const res = await api.post('/auth/google', userData);
        await AsyncStorage.setItem('@Baza:user', JSON.stringify(userData));

        if (res.data.isNewUser) {
          navigation.navigate('ChoiceMode');
        } else {
          navigation.navigate('Home');
        }
      } catch (error) {
        console.log("Erro no servidor:", error);
        navigation.navigate('ChoiceMode');
      }

    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("Utilizador cancelou o login");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Login já em progresso");
      } else {
        console.log("Erro Google Sign-In:", error);
      }
    }
  };
 
  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        
        {/* 1. CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.themeContent}>
            <TouchableOpacity style={styles.themeButton}>
              <MaterialIcons name="light" size={20} color={themes.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.logoContent}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View> 
        </View>

        {/* 2. TEXTO CENTRAL */}
        <View style={styles.centerContent}>
          <Text style={styles.title}>Seu aplicativo de{"\n"}entregas</Text>
          <Text style={styles.subtitle}>
            Crie e acompanhe entregas em {'\n'} poucos passos
          </Text>
          <Octicons name="location" size={26} color={themes.colors.text.secondary} />
        </View>
    
        {/* 3. FOOTER E BOTÕES */}
        <View style={styles.footer}>
          <View style={styles.bottomContent}>
            <View style={styles.blockOne} />
            <View style={styles.blockTwo} />
          </View>

          <Button 
            text="Continuar com Telefone"
            onPress={() => navigation.navigate('InputPhoneNumber')} 
          />

          <GradientButton 
            text='Continuar com Google'
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
            icon={
              <Image 
                source={require('../../../assets/googleLogo.png')}
                style={styles.googleLogo} 
                resizeMode="contain"
              />
            }
          />

          <View style={styles.footerTextContent}>
            <Text style={styles.footerText}>
              Utilizar o nosso aplicativo significa que você concorda com nossos{" "}
              <Text style={styles.sublime}>Termos de Uso</Text> e{" "}
              <Text style={styles.sublime}>Política de Privacidade</Text>
            </Text>       
          </View>
        </View>

      </View>
    </BackgroundWrapper>
  );
}