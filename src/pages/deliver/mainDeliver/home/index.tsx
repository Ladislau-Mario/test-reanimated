import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { TAB_BAR_HEIGHT } from '../../../../components/common/curvedTabs/index';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#303E4D' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1F2933' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3D5166' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F2933' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1F2933' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4A6080' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a2a3a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e3a28' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2A3A4A' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2A3A4A' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
];


export default function DeliverHome() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);


const snapPoints = useMemo(() => {
  const availableHeight = SCREEN_HEIGHT - TAB_BAR_HEIGHT;
  const snap1 = Math.round(availableHeight * 0.28);
  const snap2 = Math.round(availableHeight * 0.52);
  return [snap1, snap2];
}, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão de localização negada');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);
    })();
  }, []);

  if (!location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2D60FF" />
        <Text style={styles.loadingText}>
          {errorMsg ?? 'A obter localização...'}
        </Text>
      </View>
    );
  }

  return (
    // O container principal não ocupa o tab bar
    <View style={styles.container}>

      {/* MAPA — ocupa tudo menos o tab bar */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* BOTÃO ONLINE/OFFLINE */}
      <TouchableOpacity
        style={[styles.statusButton, isOnline ? styles.online : styles.offline]}
        onPress={() => setIsOnline(!isOnline)}
      >
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#B4E7C7' : '#ffffff60' }]} />
        <Text style={styles.statusText}>
          {isOnline ? 'Online' : 'Desligado'}
        </Text>
      </TouchableOpacity>

      {/* BOTÃO MINHA LOCALIZAÇÃO */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          mapRef.current?.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 800);
        }}
      >
        <Ionicons name="navigate" size={20} color="#2D60FF" />
        <Text style={styles.locationText}>A minha localização</Text>
      </TouchableOpacity>

      {/* BOTTOM SHEET — fica dentro do container que já exclui o tab bar */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        detached={false}
        style={{ zIndex: 1, elevation: 1, marginBottom: TAB_BAR_HEIGHT }}
      >
        <BottomSheetScrollView
          style={styles.sheetContent}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={20} color="#85D5EB" />
              <Text style={styles.statLabel}>Rendimento</Text>
              <Text style={styles.statValue}>12 000,00 Kz</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flag-outline" size={20} color="#85D5EB" />
              <Text style={styles.statLabel}>Objectivo</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '45%' }]} />
              </View>
              <Text style={styles.progressText}>9 de 20</Text>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2933',
  },
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2933',
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },

  statusButton: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    elevation: 5,
    zIndex: 10,
  },
  online: { backgroundColor: '#1F2933' },
  offline: { backgroundColor: '#1F2933' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
 locationButton: {
  position: 'absolute',  
  bottom: TAB_BAR_HEIGHT + 16,
  left: 20,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1F2933', 
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 20,
  gap: 8,
  elevation: 20,
  zIndex: 20,
},
  locationText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },

  sheetContainer: {
    marginHorizontal: 0,
    zIndex: 1,
    elevation: 1,
  },
  sheetBackground: {
    backgroundColor: '#1F2933',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetIndicator: {
    backgroundColor: '#ffffff30',
    width: 40,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#303E4D',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  statLabel: {
    color: '#9ca3af',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#ffffff20',
    borderRadius: 3,
    marginTop: 4,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#2D60FF',
    borderRadius: 3,
  },
  progressText: {
    color: '#9ca3af',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    textAlign: 'right',
  },
});