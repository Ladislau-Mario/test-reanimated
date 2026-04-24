import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView ,  } from 'react-native';
import BackgroundWrapper from '../../../components/layout/background/bgscreen';
import { themes } from '../../../global/themes';
import { styles } from './style';
import { Entypo } from '@expo/vector-icons';
import { InputPhone } from '../../../components/layout/inputPhone/inputPhone';
import { Button } from '../../../components/common/button/button';
import { ClientCard } from '../../../components/modules/client/clientCard/clientCard';
import { ButtonBack } from '../../../components/common/backButton/backButton';
import { useNavigation, NavigationProp } from "@react-navigation/native";

//API do Axios para pegarmos os dados para o Back-End
import axios from 'axios';
import api from '../../../components/modules/services/api/api';



export default function InputPhoneNumber({ navigation }: any) {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    // Agora o erro só aparece se o número for inválido E tiver 9 dígitos 
// OU se o utilizador já escreveu algo mas não começa com 9
    const isDone = phone.length === 9 && phone.startsWith('9');

    const hasError = phone.length > 0 && (
    (phone.length === 9 && !phone.startsWith('9')) || // Tem 9 mas não começa com 9
    (phone.length > 0 && phone[0] !== '9') // O primeiro dígito já está errado
    );

// O estado "digitando" (Branco) será quando isFocused é true e não tem erro

/*
    const handleConfirm = () => {
        setLoading(true);
        // Simulação para o Back-end
        setTimeout(() => {
            setLoading(false);
            alert(`Enviado para o Back: ${phone}`);
        }, 2000);
    };
*/

const handleConfirm = async () => {
    setLoading(true);
    try {
        // 1. Formatamos o número para o padrão internacional (importante para APIs de SMS)
        const fullPhoneNumber = `+244${phone}`;

        // 2. Chamada ao Back-end para gerar e enviar o OTP
        const response = await api.post('/auth/send-otp', {
            phoneNumber: fullPhoneNumber
        });

        console.log("Servidor notificou envio de SMS:", response.data);

        // 3. Navegação passando o número como parâmetro
        navigation.navigate('VerifycationNumber', { 
            phoneNumber: fullPhoneNumber 
        });

    } catch (error) {
        console.log("Erro ao enviar número para o back-end:", error);
        alert("Falha na rede. Verifique se o servidor está ligado no IP 192.168.8.199");
    } finally {
        setLoading(false);
    }
};

    return (
        <BackgroundWrapper>
            <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                  >
            <View style={styles.container}>
                <View style={styles.containerOne}>
                    <View style={styles.header}>
                        <ButtonBack 
                           onPress={() => navigation.reset({routes:[{name:'Onboarding'}]})} 
                           // onPress={() => navigation.goBack()}
                        />
                    </View>
                    
                    <View style={{ width: '100%' }}>
                        <Text style={styles.title}>Digite o seu número{"\n"}de telefone</Text>
                    </View>

                    <InputPhone
                        placeholder='000 000 000'
                        value={phone}
                        onChangeText={setPhone}
                        hasError={hasError}
                        isSuccess={isDone}
                    />
                </View>
                
                <View style={{ marginBottom: 30 }}>
                    <Button 
                        text="Confirmar" 
                        // onPress={handleConfirm}
                        loading={loading}
                        onPress={() => navigation.navigate('VerifycationNumber')}
                        disabled={!isDone || loading}
                        style={{ opacity: isDone ? 1 : 0.5 }}

                    />
                    
                </View>
            </View>
            </KeyboardAvoidingView>
        </BackgroundWrapper>
    );
}