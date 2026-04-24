import React, { useState } from 'react';
import { 
  View, Text, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { useNavigation } from "@react-navigation/native";

import BackgroundWrapper from '../../../../components/layout/background/bgscreen';
import { themes } from '../../../../global/themes';
import { styles } from './style';

import { InputRegister } from '../../../../components/modules/client/inputRegister/inputRegister';
import { Button } from '../../../../components/common/button/button';
import { ButtonBack } from '../../../../components/common/backButton/backButton';
import { Ionicons } from '@expo/vector-icons';

export default function ClientRegister() {
  const navigation = useNavigation<any>();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  // Agora armazenamos a MENSAGEM de erro
  const [errors, setErrors] = useState({
    nome: '',
    email: '',
    data: ''
  });

  const primaryColor = themes.colors.primary;
  const errorColor = '#FF4D4D';

  const handleDataChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    setDataNascimento(formatted);
    setErrors(prev => ({ ...prev, data: '' }));
  };

  // VALIDAÇÃO DE DATA E IDADE (Mínimo 16 anos)
  const validateData = (dateStr: string) => {
    if (dateStr.length !== 10) return "Data incompleta";

    const [day, month, year] = dateStr.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();

    // Verifica se a data é válida (ex: evita 31/02)
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
      return "Data inválida";
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    if (age < 16) return "Idade mímima aceite 16";
    return "";
  };

 const handleConfirmar = () => {
    // Regex: Permite letras maiúsculas, minúsculas, acentos e espaços.
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;

    const emailErr = /\S+@\S+\.\S+/.test(email) ? "" : "E-mail inválido";
    
    // Validação do Nome
    let nomeErr = "";
    if (nome.trim().length < 3) {
      nomeErr = "Nome muito curto";
    } else if (!nameRegex.test(nome)) {
      nomeErr = "O nome deve conter apenas letras";
    }

    const dataErr = validateData(dataNascimento);

    setErrors({ nome: nomeErr, email: emailErr, data: dataErr });

    if (!nomeErr && !emailErr && !dataErr) {
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
            <Text style={styles.mainTitle}>Boas Vindas</Text>
            <View style={styles.supportContainer}>
              <Text style={styles.topSupportText}>Preencha seus dados para validar o perfil.</Text>
            </View>
          </View>
        
          <View style={styles.groupedInputCard}>
            <InputRegister 
                placeholder="Nome completo"
                value={nome}
                autoCapitalize="words" // Coloca a primeira letra de cada nome em maiúscula
                textContentType="name" // Otimiza o teclado para nomes
                onChangeText={(t) => { setNome(t); setErrors(p => ({...p, nome: ''})) }}
                errorMessage={errors.nome}
                icon={<Ionicons name="person-outline" size={18} color={errors.nome ? errorColor : primaryColor} />}
              />

            <InputRegister 
              placeholder="Endereço de e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors(p => ({...p, email: ''})) }}
              errorMessage={errors.email}
              icon={<Ionicons name="mail-outline" size={18} color={errors.email ? errorColor : primaryColor} />}
            />

            <InputRegister 
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
              value={dataNascimento}
              onChangeText={handleDataChange}
              errorMessage={errors.data}
              icon={<Ionicons name="calendar-outline" size={18} color={errors.data ? errorColor : primaryColor} />}
              isLast={true}
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