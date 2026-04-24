import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Background from '../../../components/layout/background/bgscreen';
import { ClientCard } from '../../../components/modules/client/clientCard/clientCard'; 
import { themes } from '../../../global/themes'; // Para usares as cores e fontes do BAZA
import { DeliverCard } from '../../../components/modules/deliver/deliverCard/deliverCard';
import { MaterialIcons, Octicons, SimpleLineIcons } from '@expo/vector-icons';
import { styles } from './style';
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { CommonActions } from '@react-navigation/native'

import AsyncStorage from '@react-native-async-storage/async-storage';

//API do Axios para pegarmos os dados para o Back-End
import axios from 'axios';
import api from '../../../components/modules/services/api/api';

export default function ChoiceMode({ navigation }: any) {

  // Função genérica para salvar a escolha no Back-end
  const handleChoice = async (role: 'client' | 'deliver') => {
    try {
      // 1. Recuperamos o utilizador que guardámos no Onboarding/Verify
      const storedUser = await AsyncStorage.getItem('@Baza:user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      if (user) {
        // 2. Enviamos a "String" para o Back-end
        // O back-end vai atualizar o campo 'role' deste utilizador
        await api.patch(`/users/update-role/${user.uid}`, { 
          role: role // Aqui vai a string: "client" ou "deliver"
        });

        // 3. Guardamos também localmente para o App saber que layout mostrar
        const updatedUser = { ...user, role: role };
        await AsyncStorage.setItem('@Baza:user', JSON.stringify(updatedUser));
      }

      // 4. Navegamos para o registo específico
      if (role === 'client') {
        navigation.navigate('ClientRegister');
      } else {
        navigation.navigate('DeliverRegister');
      }

    } catch (error) {
      console.log("Erro ao salvar modo:", error);
      // Mesmo com erro de rede, deixamos navegar para não travar a tua demo na PT
      role === 'client' ? navigation.navigate('ClientRegister') : navigation.navigate('DeliverRegister');
    }
  };

  return (
    <Background>
      <View style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Pronto para{"\n"}começar?</Text>
          <Text style={styles.subtitle}>Tu decides o caminho.</Text>
        </View>

        <View style={styles.cardsContainer}>
          <ClientCard 
            onPress={() => handleChoice('client')} // Envia a string "client"
          />
          <DeliverCard
            onPress={() => handleChoice('deliver')} // Envia a string "driver"
          />
        </View>

        <View style={styles.footerInfo}>   
          <Text style={styles.footerText}>
            <SimpleLineIcons name="lock-open" size={12} color="rgba(255,255,255,0.8)" />  
            {"  "}Pode mudar esse modo a qualquer momento nas definições.
          </Text>
        </View>
      </View>
    </Background>
  );
}