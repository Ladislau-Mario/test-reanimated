import * as React from 'react';
//import React,{ useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert,  } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { Octicons, MaterialIcons } from '@expo/vector-icons';

// Componentes e Estilos do Baza
import BackgroundWrapper from '../../../components/layout/background/bgscreen';
import { themes } from '../../../global/themes';
import { styles } from "./style";
import { Button } from '../../../components/common/button/button';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

//FIREBASE 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../../../firebaseConfig'; 
import { GoogleAuthProvider, onAuthStateChanged,signInWithCredential, signInWithPopup } from "firebase/auth";
import { GradientButton } from '../../../components/common/GradientButton/gradientButton';

//API do Axios para pegarmos os dados para o Back-End
import axios from 'axios';
import api from '../../../components/modules/services/api/api';



  WebBrowser.maybeCompleteAuthSession();

  export default function Onboarding() {

  const navigation = useNavigation<any>();

  const [userInfo, setUserInfo] = React.useState();
  const [request, response, promptAsync] = Google.useAuthRequest({
    // O ID que aparece na tua foto do Firebase (Configuração do SDK da Web)
    webClientId: "645562949183-0jrttkiclip93eqs63lqhrm9nqevd533.apps.googleusercontent.com",
    
    // IDs das plataformas (já tens estes)
    androidClientId: "645562949183-o2nuc9ki2ddpnmbsukic0bpaeppfdco0.apps.googleusercontent.com",
    iosClientId: "645562949183-vo99sqhor5p4h5288mjltkhilpa190mh.apps.googleusercontent.com",
    
    responseType: "id_token",
  });

/*
 React.useEffect(() => {
  if (response?.type === "success") {
    const { id_token } = response.params;
    const credential = GoogleAuthProvider.credential(id_token);
    
    signInWithCredential(auth, credential)
      .then(() => {
        console.log("Login no Firebase com sucesso!");
        navigation.navigate('ChoiceMode'); // Ou a tela que desejas
      })
      .catch((error) => {
        console.log("Erro ao validar no Firebase:", error);
      });
  }
}, [response]);
*/

React.useEffect(() => {
  if (response?.type === "success") {
    const { id_token } = response.params;
    const credential = GoogleAuthProvider.credential(id_token);
    
    signInWithCredential(auth, credential)
      .then(async (userCredential) => {
        const user = userCredential.user;

        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          token: id_token 
        };

        try {
          // CHAMADA AO TEU BACK-END (Usando o IP 192.168.8.199)
          // O back-end deve retornar se o user é novo ou não
          const res = await api.post('/auth/google', userData);
          
          await AsyncStorage.setItem('@Baza:user', JSON.stringify(userData));

          if (res.data.isNewUser) {
            // Se for novo, vai escolher se é Cliente ou Motoqueiro
            navigation.navigate('ChoiceMode');
          } else {
            // Se já tem conta, vai direto para o mapa
            navigation.navigate('Home');
          }
          
        } catch (error) {
          console.log("Erro no servidor de Luanda:", error);
          // Caso o servidor falhe, mandamos para ChoiceMode por segurança
          navigation.navigate('ChoiceMode');
        }
      })
      .catch((error) => {
        console.log("Erro Firebase:", error);
      });
  }
}, [response]);


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
          onPress={() => promptAsync()}
          activeOpacity={0.8}
          // PASSA A IMAGEM COMO ÍCONE
         icon={
        <Image 
          source={require('../../../assets/googleLogo.png')} // Caminho correto
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