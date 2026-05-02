import React, { useState } from 'react';
import { 
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import BackgroundWrapper from '../../../../components/layout/background/bgscreen';
import { styles } from "./style";
import { Ionicons, Fontisto } from '@expo/vector-icons';
import { CustomInput } from '../../../../components/common/input/input';
import { Button } from '../../../../components/common/button/button';
import { ButtonBack } from '../../../../components/common/backButton/backButton';
import { FilePicker } from '../../../../components/common/filePicker/filePicker';
import { SelectInput } from '../../../../components/common/selectInput/SelectInput';
import { SelectionModal } from '../../../../components/common/selectionModal/selectionModal';
import { PickerService } from '../../../../components/modules/services/pickerService/pickerService';
import { vehicleData } from '../../../../components/modules/services/data/vehicleData';

//API do Axios para pegarmos os dados para o Back-End
import axios from 'axios';
import api from '../../../../components/modules/services/api/api';


export default function DeliverRegisterFour({ navigation, route }: any) { 
  // Adicionado route
  const [loading, setLoading] = useState(false);
  const dataFromStepThree = route.params?.data || {};


  // Estados para Fotos
  const [fotoVeiculo, setFotoVeiculo] = useState<string | null>(null);
  const [certFrente, setCertFrente] = useState<string | null>(null);

  // Estados para Informações do Veículo
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('');
  const [placa, setPlaca] = useState('');

  // Estados de controle dos Modais
  const [modalMarcaVisible, setModalMarcaVisible] = useState(false);
  const [modalModeloVisible, setModalModeloVisible] = useState(false);
  const [modalCorVisible, setModalCorVisible] = useState(false);

  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    let newErrors: any = {};
    
    if (!fotoVeiculo) newErrors.fotoVeiculo = true;
    if (!certFrente) newErrors.certFrente = true;
    if (!marca) newErrors.marca = "Escolha a marca.";
    if (!modelo) newErrors.modelo = "Escolha o modelo.";
    if (!cor) newErrors.cor = "Escolha a cor.";
    
    if (!placa) {
      newErrors.placa = "Informe a placa.";
    } else if (placa.length < 8) {
      newErrors.placa = "Placa inválida.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /*
  const handleFinish = () => {
    if (validate()) {
      navigation.reset({ routes: [{ name: 'Onboarding' }] });
    } else {
      Alert.alert("Baza", "Por favor, preencha todos os dados do veículo.");
    }
  };
  */

  const handleFinish = async () => {
    if (validate()) {
      setLoading(true);
      
      try {
        const formData = new FormData();

        // Juntamos TUDO (Dados das 4 telas)
        const finalData = {
          ...dataFromStepThree,
          marca,
          modelo,
          cor,
          placa,
        };

        // Adicionamos os campos de texto ao FormData
        Object.keys(finalData).forEach(key => {
          if (!key.startsWith('foto') && !key.startsWith('cert')) {
            formData.append(key, finalData[key]);
          }
        });

        // Adicionamos as FOTOS ao FormData (O ponto crítico para o Node.js)
        const appendFile = (name: string, uri: string | null) => {
          if (uri) {
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image`;
            formData.append(name, { uri, name: filename, type } as any);
          }
        };

        appendFile('profilePhoto', finalData.fotoPerfil);
        appendFile('licenseFront', finalData.fotoFrente);
        appendFile('licenseBack', finalData.fotoVerso);
        appendFile('idFront', finalData.fotoFrenteBI);
        appendFile('idBack', finalData.fotoVersoBI);
        appendFile('vehiclePhoto', fotoVeiculo);
        appendFile('platePhoto', certFrente);

        // DISPARO PARA O BACK-END EM LUANDA
        const response = await api.post('/auth/register/driver', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.status === 201 || response.status === 200) {
          // Alert opcional, já que a próxima tela dirá que teve sucesso
          // navigation.reset apaga o histórico de navegação (segurança)
          navigation.reset({
            index: 0,
            routes: [{ name: 'FirstRegistrationStatus' }],
          });
        }
      }
      catch (error: any) {
        console.log("Erro no servidor (Normal em teste):", error.message);
        
        // COMENTA O ALERTA E FORÇA A NAVEGAÇÃO PARA TESTAR O FRONT
        navigation.reset({
          index: 0,
          routes: [{ name: 'FirstRegistrationStatus' }],
        });
      }
      /* 
      catch (error: any) {
        console.log("Erro no registro final:", error.response?.data || error.message);
        Alert.alert("Erro", "Não conseguimos enviar os teus dados. Verifica a tua conexão com o servidor.");
      } 
      */
      finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Baza", "Por favor, preencha todos os dados do veículo.");
    }
  };

  
  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.headerSection}>
            <ButtonBack onPress={() => navigation.goBack()} />
            <View style={styles.main}>
              <Text style={styles.mainTitle}>Cadastro</Text>
              <Text style={styles.mainSubTitle}>Dados do veículo para as tuas entregas.</Text>
            </View>
          </View>

          <View style={styles.whiteContentBlock}>
            <ScrollView contentContainerStyle={styles.internalContainer} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.stepSubtitle}>Fotos e Documentos do Veículo</Text>
              
              {/* FILE PICKERS COM LIMPEZA DE ERRO */}
              <View style={styles.rowInputs}>
                <FilePicker 
                  label={"Foto do veículo"} 
                  hasFile={!!fotoVeiculo} // ADICIONADO: converte o valor para booleano
                  fileUri={fotoVeiculo}
                  onPress={async () => {
                    const doc = await PickerService.pickDocument();
                    if (doc?.uri) {
                      setFotoVeiculo(doc.uri);
                      setErrors((prev: any) => ({ ...prev, fotoVeiculo: false }));
                    }
                  }}
                  error={errors.fotoVeiculo}
                />
                <FilePicker 
                  label={"Foto da placa\ndo veículo"} 
                  hasFile={!!certFrente} // ADICIONADO: converte o valor para booleano
                  fileUri={certFrente}
                  onPress={async () => {
                    const doc = await PickerService.pickDocument();
                    if (doc?.uri) {
                      setCertFrente(doc.uri);
                      setErrors((prev: any) => ({ ...prev, certFrente: false }));
                    }
                  }}
                  error={errors.certFrente}
                />
              </View>

              <View style={{ marginTop: 20 }}>
                {/* SELECTS QUE TINHAM DESAPARECIDO */}
                <SelectInput 
                  label="Marca do veículo"
                  placeholder="Selecione a marca"
                  value={marca}
                  onPress={() => setModalMarcaVisible(true)}
                  errorMessage={errors.marca}
                  icon={<Fontisto name="motorcycle" size={20} color="#808080" />}
                />

                <SelectInput 
                  label="Modelo do veículo"
                  placeholder={marca ? "Selecione o modelo" : "Escolha a marca primeiro"}
                  value={modelo}
                  onPress={() => marca ? setModalModeloVisible(true) : Alert.alert("Baza", "Escolha primeiro a marca.")}
                  errorMessage={errors.modelo}
                  icon={<Ionicons name="filter" size={20} color="#808080" />}
                />

                <View style={[styles.rowInputs, { gap: 15 }]}>
                   <View style={{ flex: 1 }}>
                      <SelectInput 
                        label="Cor"
                        placeholder="Cor"
                        value={cor}
                        onPress={() => setModalCorVisible(true)}
                        icon={<Ionicons name="color-palette-outline" size={20} color="#808080" />}
                        errorMessage={errors.cor}
                      />
                   </View>
                   <View style={{ flex: 1.5 }}>
                      <CustomInput 
                        label="Número da placa"
                        placeholder="LD-00-00-XX"
                        value={placa}
                        onChangeText={(t: string) => {
                          if (t.length <= 11) setPlaca(t.toUpperCase());
                          if (errors.placa) setErrors((prev: any) => ({ ...prev, placa: null }));
                        }}
                        autoCapitalize="characters"
                        errorMessage={errors.placa}
                        maxLength={11}
                      />
                   </View>
                </View>
              </View>

              <View style={styles.footerContent}>
                <View style={styles.pages}>
                    <View style={styles.bottomContent}>
                        {[1, 2, 3, 4].map((i) => (
                          <View key={i} style={styles.blockOne} />
                        ))}
                    </View>
                </View>
                <Button 
                  text={loading ? 'Enviando...' : 'Concluir Registro'} 
                  onPress={handleFinish} 
                  disabled={loading}
                />
                {loading && <ActivityIndicator size="large" color="#0047FF" style={{marginTop: 20}} />}
              </View>

            </ScrollView>
          </View>
        </View>

        {/* MODAIS COM LÓGICA DE LIMPEZA DE ERRO */}
        <SelectionModal 
          visible={modalMarcaVisible}
          title="Selecionar Marca"
          data={vehicleData.marcas.map(m => m.name)}
          onClose={() => setModalMarcaVisible(false)}
          onSelect={(item) => {
            setMarca(item);
            setModelo('');
            setErrors((prev: any) => ({ ...prev, marca: null }));
          }}
        />

        <SelectionModal 
          visible={modalModeloVisible}
          title={`Modelos ${marca}`}
          data={vehicleData.modelos[marca as keyof typeof vehicleData.modelos] || []}
          onClose={() => setModalModeloVisible(false)}
          onSelect={(item) => {
            setModelo(item);
            setErrors((prev: any) => ({ ...prev, modelo: null }));
          }}
        />

        <SelectionModal 
          visible={modalCorVisible}
          title="Selecionar Cor"
          data={vehicleData.cores.map(c => c.name)}
          onClose={() => setModalCorVisible(false)}
          onSelect={(item) => {
            setCor(item);
            setErrors((prev: any) => ({ ...prev, cor: null }));
          }}
        />

      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}