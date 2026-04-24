import React, { useState } from 'react';
import { 
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Image 
} from 'react-native';
import { useNavigation } from "@react-navigation/native";

import BackgroundWrapper from '../../../../components/layout/background/bgscreen';
import { themes } from '../../../../global/themes';
import { styles } from './style';

import { InputRegister } from '../../../../components/modules/client/inputRegister/inputRegister';
import { Button } from '../../../../components/common/button/button';
import { ButtonBack } from '../../../../components/common/backButton/backButton';
import { Ionicons } from '@expo/vector-icons';

export default function ClientRegisterEmail() {
  const navigation = useNavigation<any>();

  // Estados
  const [nome, setNome] = useState('');
  const [email] = useState('exemplo@gmail.com'); // Simulado como vindo do Google/Auth
  const [phone, setPhone] = useState('');
  
  const [errors, setErrors] = useState({
    nome: '',
    phone: ''
  });

  const primaryColor = themes.colors.primary;
  const errorColor = '#FF4D4D';

  // Validação do Telefone (Padrão Unitel/Movicel/Africell)
  const validatePhone = (num: string) => {
    if (num.length === 0) return "Telefone obrigatório";
    if (!num.startsWith('9')) return "Deve começar com 9";
    if (num.length < 9) return "Deve ter 9 dígitos";
    return "";
  };

  const handleConfirmar = () => {
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
    
    let nomeErr = "";
    if (nome.trim().length < 3) {
      nomeErr = "Nome muito curto";
    } else if (!nameRegex.test(nome)) {
      nomeErr = "O nome deve conter apenas letras";
    }

    const phoneErr = validatePhone(phone);

    setErrors({
      nome: nomeErr,
      phone: phoneErr
    });

    if (!nomeErr && !phoneErr) {
      // Avança para a próxima etapa (ex: Onboarding ou Home)
      navigation.reset({ routes: [{ name: 'Onboarding' }] });
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
              <Text style={styles.topSupportText}>Verifique os dados para continuar no Baza.</Text>
            </View>
          </View>
        
          <View style={styles.groupedInputCard}>
            {/* NOME COMPLETO */}
            <InputRegister 
              placeholder="Nome completo"
              value={nome}
              autoCapitalize="words"
              onChangeText={(t) => { setNome(t); setErrors(p => ({...p, nome: ''})) }}
              errorMessage={errors.nome}
              icon={<Ionicons name="person-outline" size={18} color={errors.nome ? errorColor : primaryColor} />}
            />

            {/* EMAIL (DESABILITADO) */}
            <InputRegister 
              placeholder="Endereço de e-mail"
              value={email}
              editable={false} // Campo não editável
              style={{ color: 'rgba(30, 37, 48, 0.4)' }} // Texto mais claro
              icon={<Ionicons name="mail-outline" size={18} color="rgba(30, 37, 48, 0.3)" />}
            />

            {/* TELEFONE COM BANDEIRA DE ANGOLA */}
            <InputRegister 
              placeholder="9xx xxx xxx"
              keyboardType="numeric"
              maxLength={9}
              value={phone}
              onChangeText={(t) => { setPhone(t); setErrors(p => ({...p, phone: ''})) }}
              errorMessage={errors.phone}
              isLast={true}
              icon={
                <Image 
                  source={require('../../../../assets/bandeira-angola.png')} 
                  style={{ width: 22, height: 22, borderRadius: 2 }} 
                />
              }
            />
          </View>

          <View style={styles.actionButtonContainer}>
            <Button text='Confirmar' onPress={handleConfirmar} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}