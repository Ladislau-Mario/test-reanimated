import React, { useState } from 'react';
import { 
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert 
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';

import BackgroundWrapper from '../../../../components/layout/background/bgscreen';
import { themes } from '../../../../global/themes';
import { styles } from './style';

import { InputRegister } from '../../../../components/modules/client/inputRegister/inputRegister';
import { Button } from '../../../../components/common/button/button';
import { ButtonBack } from '../../../../components/common/backButton/backButton';

export default function ClientRegister() {
  const navigation = useNavigation<any>();

  // Estados dos dados (agora com sobrenome separado para o back-end)
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  // Mensagens de erro por campo
  const [errors, setErrors] = useState<any>({});

  const primaryColor = themes.colors.primary;
  const errorColor = '#FF4D4D';

  const handleDataChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    setDataNascimento(formatted);
    if (errors.data) setErrors({ ...errors, data: '' });
  };

  const validateData = (dateStr: string) => {
    if (dateStr.length !== 10) return "Data incompleta";
    const [day, month, year] = dateStr.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();

    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
      return "Data inválida";
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    if (age < 16) return "Idade mínima aceite 16";
    return "";
  };

  const handleConfirmar = () => {
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
    let newErrors: any = {};

    // Validação Nome
    if (nome.trim().length < 3) {
      newErrors.nome = "Nome muito curto";
    } else if (!nameRegex.test(nome)) {
      newErrors.nome = "Apenas letras";
    }

    // Validação Sobrenome (Pedido pelo back-end)
    if (sobrenome.trim().length < 2) {
      newErrors.sobrenome = "Sobrenome muito curto";
    } else if (!nameRegex.test(sobrenome)) {
      newErrors.sobrenome = "Apenas letras";
    }

    // Validação Email
    if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "E-mail inválido";
    }

    // Validação Data
    const dataErr = validateData(dataNascimento);
    if (dataErr) newErrors.data = dataErr;

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Objeto pronto para o Back-end / Próxima tela
      const clientData = {
        nome,
        sobrenome,
        email,
        dataNascimento,
        role: 'client' // Identificador do tipo de usuário
      };

      // Navega para a próxima etapa passando os dados coletados
      navigation.navigate('ClientRegisterEmail', { data: clientData });
    } else {
      Alert.alert("Baza", "Por favor, corrija os erros no formulário.");
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
              placeholder="Nome"
              value={nome}
              autoCapitalize="words"
              onChangeText={(t) => { setNome(t); setErrors((p: any) => ({...p, nome: ''})) }}
              errorMessage={errors.nome}
              icon={<Ionicons name="person-outline" size={18} color={errors.nome ? errorColor : primaryColor} />}
            />

            <InputRegister 
              placeholder="Sobrenome"
              value={sobrenome}
              autoCapitalize="words"
              onChangeText={(t) => { setSobrenome(t); setErrors((p: any) => ({...p, sobrenome: ''})) }}
              errorMessage={errors.sobrenome}
              icon={<Ionicons name="person-outline" size={18} color={errors.sobrenome ? errorColor : primaryColor} />}
            />

            <InputRegister 
              placeholder="Endereço de e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((p: any) => ({...p, email: ''})) }}
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