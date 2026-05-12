// src/pages/auth/onboarding/onboarding.tsx
import * as React from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Octicons, MaterialIcons } from '@expo/vector-icons';

import BackgroundWrapper from '../../../components/layout/background/bgscreen';
import { themes } from '../../../global/themes';
import { styles } from './style';
import { Button } from '../../../components/common/button/button';
import { GradientButton } from '../../../components/common/GradientButton/gradientButton';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../../../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { authService } from '../../../components/modules/services/api/authService';

GoogleSignin.configure({
  webClientId: '358855325316-labl2pan8a9qaoq2rbjajfr42d8u0t7s.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function Onboarding() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();

      const result = await GoogleSignin.signIn();
      if (result.type === 'cancelled') return;

      const idToken = result.data?.idToken;
      if (!idToken) return;

      // 1. Autenticar no Firebase
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      // 2. Registar/actualizar no backend
      const res = await authService.loginGoogle({
        uid: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        displayName: firebaseUser.displayName || undefined,
      });

      const { user, isNewUser } = res.data;

      // 3. Guardar sessão localmente
      await authService.salvarSessao({
        ...user,
        idToken: await firebaseUser.getIdToken(),
      });

      // 4. Navegar conforme estado do utilizador
      if (isNewUser || !user.nome) {
        // Utilizador novo pelo Google → completar perfil (nome+telefone)
        navigation.navigate('ClientRegisterEmail');
      } else if (!user.role || user.role === 'client') {
        navigation.navigate('ChoiceMode');
      } else if (user.role === 'client') {
        navigation.navigate('Home');
      } else {
        navigation.navigate('DeliverHomeTab');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      console.warn('Google Sign-In erro:', error);
      Alert.alert('Erro', 'Falha no login com Google. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* CABEÇALHO */}
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

        {/* TEXTO CENTRAL */}
        <View style={styles.centerContent}>
          <Text style={styles.title}>Seu aplicativo de{'\n'}entregas</Text>
          <Text style={styles.subtitle}>Crie e acompanhe entregas em {'\n'} poucos passos</Text>
          <Octicons name="location" size={26} color={themes.colors.text.secondary} />
        </View>

        {/* FOOTER */}
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
            text={loading ? 'A entrar...' : 'Continuar com Google'}
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
              Utilizar o nosso aplicativo significa que você concorda com nossos{' '}
              <Text style={styles.sublime}>Termos de Uso</Text> e{' '}
              <Text style={styles.sublime}>Política de Privacidade</Text>
            </Text>
          </View>
        </View>
      </View>
    </BackgroundWrapper>
  );
}