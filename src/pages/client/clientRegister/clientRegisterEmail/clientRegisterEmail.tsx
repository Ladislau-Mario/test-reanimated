// src/pages/client/clientRegister/clientRegisterEmail/clientRegisterEmail.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  ScrollView, Image, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import BackgroundWrapper from '../../../../components/layout/background/bgscreen';
import { themes } from '../../../../global/themes';
import { styles } from './style';
import { InputRegister } from '../../../../components/modules/client/inputRegister/inputRegister';
import { Button } from '../../../../components/common/button/button';
import { ButtonBack } from '../../../../components/common/backButton/backButton';
import { authService } from '../../../../components/modules/services/api/authService';
import { auth } from '../../../../../firebaseConfig';

export default function ClientRegisterEmail() {
  const navigation = useNavigation<any>();

  // Dados vindos do Firebase (utilizador Google)
  const [nomeDisplay, setNomeDisplay] = useState('');
  const [emailDisplay, setEmailDisplay] = useState('');

  // Único campo editável nesta tela
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState({ phone: '' });
  const [loading, setLoading] = useState(false);

  const primaryColor = themes.colors.primary;
  const errorColor = '#FF4D4D';

  // Preenche nome e email a partir da sessão guardada ou do Firebase
  useEffect(() => {
    const carregarDados = async () => {
      const sessao = await authService.obterSessao();
      if (sessao) {
        setNomeDisplay(sessao.nome || sessao.displayName || '');
        setEmailDisplay(sessao.email || '');
      } else {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          setNomeDisplay(firebaseUser.displayName || '');
          setEmailDisplay(firebaseUser.email || '');
        }
      }
    };
    carregarDados();
  }, []);

  const validatePhone = (num: string) => {
    if (!num || num.length === 0) return 'Telefone obrigatório';
    if (!num.startsWith('9')) return 'Deve começar com 9';
    if (num.length < 9) return 'Deve ter 9 dígitos';
    return '';
  };

  const handleConfirmar = async () => {
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setErrors({ phone: phoneErr });
      return;
    }

    setLoading(true);
    try {
      // Actualiza o perfil no backend com o telefone
      await authService.atualizarPerfil({ });

      // Actualiza sessão local com o telefone
      const sessao = await authService.obterSessao();
      await authService.salvarSessao({ ...sessao, telefone: phone });

      // Utilizador Google → vai para ChoiceMode escolher o papel
      navigation.reset({ index: 0, routes: [{ name: 'ChoiceMode' }] });
    } catch (error: any) {
      Alert.alert('Baza', error.response?.data?.message || 'Erro ao actualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerNav}>
            <ButtonBack onPress={() => navigation.goBack()} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>Finalizar Perfil</Text>
            <View style={styles.supportContainer}>
              <Text style={styles.topSupportText}>
                Verifique os dados para continuar no Baza.
              </Text>
            </View>
          </View>

          <View style={styles.groupedInputCard}>
            {/* NOME — desabilitado, vem do Google */}
            <InputRegister
              placeholder="Nome completo"
              value={nomeDisplay}
              editable={false}
              style={{ color: 'rgba(30, 37, 48, 0.4)' }}
              icon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="rgba(30, 37, 48, 0.3)"
                />
              }
            />

            {/* EMAIL — desabilitado, vem do Google */}
            <InputRegister
              placeholder="Endereço de e-mail"
              value={emailDisplay}
              editable={false}
              style={{ color: 'rgba(30, 37, 48, 0.4)' }}
              icon={
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="rgba(30, 37, 48, 0.3)"
                />
              }
            />

            {/* TELEFONE — editável */}
            <InputRegister
              placeholder="9xx xxx xxx"
              keyboardType="numeric"
              maxLength={9}
              value={phone}
              onChangeText={(t: string) => {
                setPhone(t);
                setErrors({ phone: '' });
              }}
              errorMessage={errors.phone}
              isLast
              icon={
                <Image
                  source={require('../../../../assets/bandeira-angola.png')}
                  style={{ width: 22, height: 22, borderRadius: 2 }}
                />
              }
            />
          </View>

          <View style={styles.actionButtonContainer}>
            <Button
              text="Confirmar"
              loading={loading}
              onPress={handleConfirmar}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}