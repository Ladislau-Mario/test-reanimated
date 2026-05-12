// src/pages/auth/UserMode/userMode.tsx
import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Background from '../../../components/layout/background/bgscreen';
import { ClientCard } from '../../../components/modules/client/clientCard/clientCard';
import { DeliverCard } from '../../../components/modules/deliver/deliverCard/deliverCard';
import { SimpleLineIcons } from '@expo/vector-icons';
import { styles } from './style';
import { authService } from '../../../components/modules/services/api/authService';

export default function ChoiceMode({ navigation }: any) {
  const [loading, setLoading] = useState(false);

  const handleChoice = async (role: 'cliente' | 'deliver') => {
    if (loading) return;
    setLoading(true);

    try {
      // Guarda o role no backend
      await authService.escolherRole(role === 'deliver' ? 'motoqueiro' : 'cliente');

      // Actualiza sessão local
      const sessao = await authService.obterSessao();
      if (sessao) {
        await authService.salvarSessao({
          ...sessao,
          role: role === 'deliver' ? 'deliver' : 'client',
        });
      }

      // Navegar para o registo específico
      if (role === 'cliente') {
        navigation.navigate('ClientRegister');
      } else {
        navigation.navigate('DeliverRegister');
      }
    } catch (error: any) {
      console.warn('Erro ao salvar role:', error.message);
      // Navega mesmo com erro de rede para não bloquear o utilizador
      if (role === 'cliente') {
        navigation.navigate('ClientRegister');
      } else {
        navigation.navigate('DeliverRegister');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <View style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Pronto para{'\n'}começar?</Text>
          <Text style={styles.subtitle}>Tu decides o caminho.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 60 }} />
        ) : (
          <View style={styles.cardsContainer}>
            <ClientCard onPress={() => handleChoice('cliente')} />
            <DeliverCard onPress={() => handleChoice('deliver')} />
          </View>
        )}

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            <SimpleLineIcons name="lock-open" size={12} color="rgba(255,255,255,0.8)" />
            {'  '}Pode mudar esse modo a qualquer momento nas definições.
          </Text>
        </View>
      </View>
    </Background>
  );
}