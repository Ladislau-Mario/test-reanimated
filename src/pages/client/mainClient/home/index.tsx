import React from 'react';
import { View, StyleSheet, Image, Dimensions, StatusBar } from 'react-native';
import { DeliveryPanel } from '../../../../components/modules/client/mainClient/deliveryPanel/deliveryPanel';
import { themes } from '../../../../global/themes';

const { width, height } = Dimensions.get('window');

export default function Home() {
  return (
    <View style={styles.container}>
      {/* Configuração da barra de status para o tema Dark */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* 1. Imagem do Mapa (Fundo) */}
      <View style={styles.mapContainer}>
        <Image 
          source={require('../../../../assets/maps.png')} 
          style={styles.mapImage}
          resizeMode="cover"
        />
      </View>

      {/* 2. O Painel de Entrega (A nossa Gaveta/Bottom Sheet) */}
      {/* Ele já contém o StepIndicator e a lógica dos passos */}
      <DeliveryPanel />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themes.colors.background,
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // O mapa ocupa tudo, a gaveta desliza por cima
  },
  mapImage: {
    width: width,
    height: height,
  },
});