import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import BackgroundWrapper from '../../../components/layout/background/bgscreen';
import { themes } from '../../../global/themes';
import { styles } from './style';
import { InputOTP } from '../../../components/layout/inputOTP/opt';
import { ButtonBack } from '../../../components/common/backButton/backButton';
import { ButtonResend } from '../../../components/layout/buttonResent/ButtonResend';

import AsyncStorage from '@react-native-async-storage/async-storage';

//API do Axios para pegarmos os dados para o Back-End
import axios from 'axios';
import api from '../../../components/modules/services/api/api';


export default function VerifycationNumber({ navigation }: any) {
    const [otpError, setOtpError] = useState(false);

const [isVerifying, setIsVerifying] = useState(false);

const handleVerifyCode = (code: string) => {
    setIsVerifying(true); // Bloqueia novas entradas enquanto valida
    setOtpError(false);   // Reseta qualquer erro anterior

    // Pequeno delay de 600ms para o utilizador ver o último dígito entrar
    setTimeout(async () => {
        
        // --- LÓGICA DE TESTE (CÓDIGO 1234) ---
        // Quando fores conectar ao Back-end, vais substituir este 'if' 
        // pela chamada: const res = await api.post('/verify', { code });
        if (code === '1234') {
            setIsVerifying(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'ChoiceMode' }],
            });
        } else {
            // SE ERRADO:
            setOtpError(true);    // Ativa o vermelho imediatamente
            setIsVerifying(false); 
            
            // Opcional: Um alerta para o utilizador em Luanda saber o que falhou
            // Alert.alert("Erro", "O código inserido está incorreto.");
        }
    }, 600); 
};;

/*
 const handleVerifyCode = async (code: string) => { // 1. Adiciona 'async'
    setIsVerifying(true);
    setOtpError(false);

    try {
        // 2. Faz a chamada real ao teu servidor
        // O axios envia o código e espera a resposta
        const response = await api.post('/auth/verify-otp', { 
            code: code,
            phoneNumber: route.params?.phoneNumber // O número que veio da tela anterior
        });

        // 3. O Back-end responde com sucesso (status 200)
        const { isNewUser, token, user } = response.data;

        // 4. Guarda os dados para o utilizador não precisar de logar de novo
        await AsyncStorage.setItem('@Baza:token', token);
        await AsyncStorage.setItem('@Baza:user', JSON.stringify(user));

        setIsVerifying(false);

        // 5. Decisão de navegação baseada no que o Back-end disse
        if (isNewUser) {
            navigation.reset({ index: 0, routes: [{ name: 'ChoiceMode' }] });
        } else {
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }

    } catch (error) {
        // 6. Se o código estiver errado ou o servidor offline, cai aqui
        console.log("Erro na verificação:", error);
        setOtpError(true); 
        setIsVerifying(false);
    }
};
 */
    return (
        <BackgroundWrapper>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >           
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.containerOne}>
                            <View style={[styles.header]}>
                                <ButtonBack onPress={() => navigation.goBack()} />
                            </View>
                            
                            <View style={styles.textContent}>
                                <Text style={styles.title}>Cód. de verificação</Text>
                                <Text style={styles.subtitle}>
                                    Um código foi enviado por SMS para o +244 9XX XXX XXX
                                </Text>
                            </View>

                            <View style={{ width: '100%', alignItems: 'center' }}>
                                <InputOTP 
                                        codeLength={4} 
                                        hasError={otpError}
                                        onCodeFilled={handleVerifyCode}
                                        onClearError={() => setOtpError(false)}
                                        // Se o teu componente aceitar um estado de 'loading' ou 'disabled'
                                        editable={!isVerifying} 
                                    />
                                <ButtonResend />
                                <View style={{ height: 40, justifyContent: 'center', marginTop: 20 }}>
                                    {isVerifying && (
                                <ActivityIndicator size="small" color={themes.colors.primary} />
                                )}
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </BackgroundWrapper>
    );
}