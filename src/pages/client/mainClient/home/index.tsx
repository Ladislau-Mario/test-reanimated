import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { weightRanges, deliveryTypes, calcPrice, WeightRange, DeliveryType } from '../../../../components/modules/services/data/deliveryData';

const GOOGLE_API_KEY = 'AIzaSyAfv049haZyKRIa_xdksJxRFYD3od9fw-w';

type LatLng = { latitude: number; longitude: number };
type Step = 1 | 2;

// ─── Map style ────────────────────────────────────────────────────────────────
const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#303E4D' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1F2933' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3D5166' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F2933' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4A6080' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a2a3a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2A3A4A' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CustomMarker() {
  return (
    <View style={markerStyles.wrapper}>
      <View style={markerStyles.pulse} />
      <View style={markerStyles.dot} />
    </View>
  );
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Localização' },
    { n: 2, label: 'Detalhes' },
  ];
  return (
    <View style={si.row}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <View style={si.item}>
            <View style={[si.circle, current >= s.n && si.circleActive]}>
              {current > s.n
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Text style={[si.num, current >= s.n && si.numActive]}>{s.n}</Text>
              }
            </View>
            <Text style={[si.label, current >= s.n && si.labelActive]}>{s.label}</Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[si.line, current > s.n && si.lineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Info modal (imagem 4 style) ──────────────────────────────────────────────

type InfoModalProps = {
  visible: boolean;
  onClose: () => void;
  step: Step;
};

function InfoModal({ visible, onClose, step }: InfoModalProps) {
  const content = step === 1 ? {
    title: 'Como funciona a localização',
    icon: 'navigate-circle-outline' as const,
    iconColor: '#2D60FF',
    items: [
      { icon: 'location-outline' as const, text: 'O ponto de Recolha é onde o estafeta vai buscar o teu pacote — pode ser a tua casa, escritório ou outro local.' },
      { icon: 'flag-outline' as const, text: 'A Morada de Entrega é o destino final onde o pacote deve ser entregue.' },
      { icon: 'navigate-outline' as const, text: 'Podes usar a tua localização actual como ponto de recolha ou escrever um endereço manualmente.' },
      { icon: 'map-outline' as const, text: 'A rota no mapa é calculada automaticamente assim que confirmares os dois pontos.' },
    ],
  } : {
    title: 'Detalhes da encomenda',
    icon: 'cube-outline' as const,
    iconColor: '#2D60FF',
    items: [
      { icon: 'layers-outline' as const, text: 'O tipo de encomenda ajuda o estafeta a saber o que vai transportar e a tratar com o cuidado certo.' },
      { icon: 'fitness-outline' as const, text: 'O peso máximo por entrega é de 10 kg. Para itens acima disto, precisarás de combinar directamente.' },
      { icon: 'shield-checkmark-outline' as const, text: 'Itens frágeis ou de alto valor devem ser embalados antes da recolha. O Bazza não se responsabiliza por embalagens inadequadas.' },
      { icon: 'chatbubble-outline' as const, text: 'As observações são opcionais mas úteis — por exemplo: "apartamento 3º andar" ou "liga antes de entregar".' },
    ],
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={im.overlay}>
        <View style={im.sheet}>
          <View style={im.handle} />
          <View style={im.iconWrap}>
            <Ionicons name={content.icon} size={48} color={content.iconColor} />
          </View>
          <Text style={im.title}>{content.title}</Text>
          <View style={im.divider} />
          {content.items.map((item, i) => (
            <View key={i} style={im.row}>
              <View style={im.iconCircle}>
                <Ionicons name={item.icon} size={18} color="#2D60FF" />
              </View>
              <Text style={im.itemText}>{item.text}</Text>
            </View>
          ))}
          <TouchableOpacity style={im.closeBtn} onPress={onClose}>
            <Text style={im.closeBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Weight selector ──────────────────────────────────────────────────────────

function WeightSelector({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <View style={ws.row}>
      {weightRanges.map((w) => (
        <TouchableOpacity
          key={w.id}
          style={[ws.card, selected === w.id && ws.cardActive]}
          onPress={() => onSelect(w.id)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={w.icon as any}
            size={22}
            color={selected === w.id ? '#2D60FF' : '#9ca3af'}
          />
          <Text style={[ws.label, selected === w.id && ws.labelActive]}>{w.label}</Text>
          <Text style={ws.sub}>{w.sublabel}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Delivery type selector ───────────────────────────────────────────────────

function TypeSelector({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <View style={ts.grid}>
      {deliveryTypes.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={[ts.card, selected === t.id && ts.cardActive]}
          onPress={() => onSelect(t.id)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={t.icon as any}
            size={20}
            color={selected === t.id ? '#2D60FF' : '#9ca3af'}
          />
          <Text style={[ts.label, selected === t.id && ts.labelActive]} numberOfLines={1}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ClientHome() {
  const navigation = useNavigation<any>();

  // Location
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Route
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationName, setDestinationName] = useState('');
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [distanceMeters, setDistanceMeters] = useState(0);

  // Flow
  const [step, setStep] = useState<Step>(1);
  const [infoVisible, setInfoVisible] = useState(false);

  // Step 2 state
  const [selectedWeight, setSelectedWeight] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['18%', '55%', '90%'], []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Permissão negada'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  const fetchRoute = async (dest: LatLng) => {
    if (!location) return;
    try {
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const dest_ = `${dest.latitude},${dest.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest_}&key=${GOOGLE_API_KEY}&language=pt`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoords(points);
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);
        setDistanceMeters(leg.distance.value);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 80, right: 40, bottom: 320, left: 40 },
          animated: true,
        });
        bottomSheetRef.current?.snapToIndex(1);
      }
    } catch (e) {
      console.log('Erro ao buscar rota:', e);
    }
  };

  const handleSelectPlace = (data: any, details: any) => {
    if (!details) return;
    const dest = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    };
    setDestination(dest);
    setDestinationName(data.description);
    fetchRoute(dest);
  };

  const handleClearDestination = () => {
    setDestination(null);
    setDestinationName('');
    setRouteCoords([]);
    setDistance('');
    setDuration('');
    setDistanceMeters(0);
    setStep(1);
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600);
    }
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleNextStep = () => {
    if (!destination) return;
    setStep(2);
    bottomSheetRef.current?.snapToIndex(2);
  };

  const handleBackStep = () => {
    setStep(1);
    bottomSheetRef.current?.snapToIndex(1);
  };

  const canConfirm = selectedWeight && selectedType;
  const estimatedPrice = canConfirm ? calcPrice(distanceMeters, selectedWeight) : null;

  if (!location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2D60FF" />
        <Text style={styles.loadingText}>{errorMsg ?? 'A obter localização...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      >
        {destination && (
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
            <CustomMarker />
          </Marker>
        )}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#2D60FF" strokeWidth={4} />
        )}
      </MapView>

      {/* Botão menu */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      >
        <Ionicons name="menu" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Botão minha localização */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 800)}
      >
        <Ionicons name="navigate" size={20} color="#2D60FF" />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        keyboardBehavior="extend"
      >
        <BottomSheetScrollView
          style={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Enviar o Pacote</Text>
              {(distance || duration) && step === 1 && (
                <Text style={styles.sheetSub}>{distance} · {duration}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.infoBtn}
              onPress={() => setInfoVisible(true)}
            >
              <Ionicons name="information-circle-outline" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <StepIndicator current={step} />

          <View style={styles.divider} />

          {/* ── PASSO 1: Localização ── */}
          {step === 1 && (
            <>
              {/* Campo Recolha (localização actual) */}
              <TouchableOpacity style={styles.fieldRow} activeOpacity={0.75}>
                <View style={[styles.fieldIcon, { backgroundColor: '#2D60FF20' }]}>
                  <Ionicons name="location" size={18} color="#2D60FF" />
                </View>
                <View style={styles.fieldTexts}>
                  <Text style={styles.fieldLabel}>Recolha</Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>
                    {location ? 'Minha localização actual' : 'A obter localização...'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ffffff30" />
              </TouchableOpacity>

              <View style={styles.fieldSep} />

              {/* Campo Morada de Entrega */}
              <View style={styles.fieldRow}>
                <View style={[styles.fieldIcon, { backgroundColor: '#EB575720' }]}>
                  <Ionicons name="flag" size={18} color="#EB5757" />
                </View>
                <View style={[styles.fieldTexts, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Morada de entrega</Text>
                  {destinationName ? (
                    <Text style={styles.fieldValue} numberOfLines={1}>{destinationName}</Text>
                  ) : (
                    <GooglePlacesAutocomplete
                      placeholder="Para onde vai o pacote?"
                      onPress={handleSelectPlace}
                      fetchDetails={true}
                      query={{
                        key: GOOGLE_API_KEY,
                        language: 'pt',
                        location: `${location.coords.latitude},${location.coords.longitude}`,
                        radius: 50000,
                      }}
                      styles={{
                        container: { flex: 0 },
                        textInput: {
                          backgroundColor: 'transparent',
                          color: '#FFFFFF',
                          fontFamily: 'Poppins_400Regular',
                          fontSize: 14,
                          height: 36,
                          paddingHorizontal: 0,
                          paddingVertical: 0,
                        },
                        listView: {
                          backgroundColor: '#253040',
                          borderRadius: 12,
                          marginTop: 4,
                          marginLeft: -52,
                          width: '120%',
                        },
                        row: { backgroundColor: '#253040', paddingVertical: 12 },
                        description: { color: '#FFFFFF', fontFamily: 'Poppins_400Regular', fontSize: 13 },
                        separator: { backgroundColor: '#ffffff10' },
                      }}
                      textInputProps={{ placeholderTextColor: '#9ca3af' }}
                      enablePoweredByContainer={false}
                    />
                  )}
                </View>
                {destinationName && (
                  <TouchableOpacity onPress={handleClearDestination} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color="#ffffff40" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Route summary card */}
              {destination && distance && (
                <View style={styles.routeCard}>
                  <View style={styles.routeRow}>
                    <View style={styles.routeItem}>
                      <Ionicons name="navigate-outline" size={16} color="#85D5EB" />
                      <Text style={styles.routeLabel}>Distância</Text>
                      <Text style={styles.routeValue}>{distance}</Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeItem}>
                      <Ionicons name="time-outline" size={16} color="#85D5EB" />
                      <Text style={styles.routeLabel}>Tempo est.</Text>
                      <Text style={styles.routeValue}>{duration}</Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeItem}>
                      <Ionicons name="wallet-outline" size={16} color="#85D5EB" />
                      <Text style={styles.routeLabel}>A partir de</Text>
                      <Text style={styles.routeValue}>{calcPrice(distanceMeters, 'light')}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Próximo */}
              {destination && (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleNextStep}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Próximo</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              )}

              {!destination && (
                <Text style={styles.hint}>
                  Escreve o endereço de entrega para continuar
                </Text>
              )}
            </>
          )}

          {/* ── PASSO 2: Detalhes ── */}
          {step === 2 && (
            <>
              {/* Tipo de entrega */}
              <Text style={styles.sectionLabel}>Tipo de encomenda</Text>
              <TypeSelector selected={selectedType} onSelect={setSelectedType} />

              <View style={{ height: 20 }} />

              {/* Peso */}
              <Text style={styles.sectionLabel}>Peso aproximado</Text>
              <WeightSelector selected={selectedWeight} onSelect={setSelectedWeight} />

              {/* Observações */}
              <View style={{ height: 20 }} />
              <Text style={styles.sectionLabel}>Observações <Text style={styles.optional}>(opcional)</Text></Text>
              <TouchableOpacity style={styles.notesField} activeOpacity={0.75}>
                <Ionicons name="chatbubble-outline" size={18} color="#9ca3af" />
                <Text style={styles.notesPlaceholder}>Ex: "Toca o portão 2 vezes"</Text>
              </TouchableOpacity>

              {/* Preço estimado */}
              {estimatedPrice && (
                <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>Preço estimado</Text>
                  <Text style={styles.priceValue}>{estimatedPrice}</Text>
                  <Text style={styles.priceSub}>O valor final pode variar conforme disponibilidade</Text>
                </View>
              )}

              {/* Botões */}
              <TouchableOpacity
                style={[styles.primaryBtn, !canConfirm && styles.primaryBtnDisabled]}
                disabled={!canConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Confirmar Entrega</Text>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackStep}>
                <Ionicons name="arrow-back" size={16} color="#9ca3af" />
                <Text style={styles.secondaryBtnText}>Voltar</Text>
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Info modal */}
      <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} step={step} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const markerStyles = StyleSheet.create({
  wrapper: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#EB5757', opacity: 0.2 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF2D55', borderWidth: 3, borderColor: '#FFFFFF' },
});

// Step indicator styles
const si = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  item: { alignItems: 'center', gap: 4 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#303E4D',
    borderWidth: 1.5, borderColor: '#ffffff20',
    alignItems: 'center', justifyContent: 'center',
  },
  circleActive: { backgroundColor: '#2D60FF', borderColor: '#2D60FF' },
  num: { fontSize: 13, color: '#9ca3af', fontFamily: 'Poppins_500Medium' },
  numActive: { color: '#fff' },
  label: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  labelActive: { color: '#fff' },
  line: { flex: 1, height: 1.5, backgroundColor: '#ffffff15', marginBottom: 14, marginHorizontal: 8 },
  lineActive: { backgroundColor: '#2D60FF' },
});

// Info modal styles
const im = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1F2933',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: '#ffffff30', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  iconWrap: { alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, color: '#fff', fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#ffffff10', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2D60FF15',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  itemText: { flex: 1, color: '#c5cdd6', fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20 },
  closeBtn: {
    marginTop: 24, backgroundColor: '#303E4D',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  closeBtnText: { color: '#9ca3af', fontFamily: 'Poppins_500Medium', fontSize: 14 },
});

// Weight selector styles
const ws = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: '#303E4D',
    borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cardActive: { borderColor: '#2D60FF', backgroundColor: '#2D60FF12' },
  label: { fontSize: 13, color: '#9ca3af', fontFamily: 'Poppins_500Medium' },
  labelActive: { color: '#fff' },
  sub: { fontSize: 10, color: '#ffffff40', fontFamily: 'Poppins_400Regular', textAlign: 'center' },
});

// Type selector styles
const ts = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    width: '22%',
    alignItems: 'center', gap: 5,
    backgroundColor: '#303E4D',
    borderRadius: 12, padding: 10,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cardActive: { borderColor: '#2D60FF', backgroundColor: '#2D60FF12' },
  label: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  labelActive: { color: '#fff' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2933', gap: 12 },
  loadingText: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 14 },

  menuButton: {
    position: 'absolute', top: 50, left: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1F2933', alignItems: 'center', justifyContent: 'center',
    elevation: 5, zIndex: 10,
  },
  locationButton: {
    position: 'absolute', bottom: 220, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1F2933', alignItems: 'center', justifyContent: 'center',
    elevation: 5, zIndex: 10,
  },

  sheetBackground: { backgroundColor: '#1F2933', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetIndicator: { backgroundColor: '#ffffff30', width: 40 },
  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },

  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sheetTitle: { fontSize: 18, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  sheetSub: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginTop: 2 },
  infoBtn: { padding: 4 },

  divider: { height: 1, backgroundColor: '#ffffff10', marginBottom: 16 },

  // Fields
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#303E4D', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 60,
  },
  fieldSep: { height: 4 },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldTexts: { flex: 1 },
  fieldLabel: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginBottom: 2 },
  fieldValue: { fontSize: 14, color: '#fff', fontFamily: 'Poppins_400Regular' },

  // Route card
  routeCard: { backgroundColor: '#303E4D', borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 4 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeItem: { flex: 1, alignItems: 'center', gap: 4 },
  routeDivider: { width: 1, height: 36, backgroundColor: '#ffffff15' },
  routeLabel: { color: '#9ca3af', fontSize: 10, fontFamily: 'Poppins_400Regular' },
  routeValue: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#2D60FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    marginTop: 16,
  },
  primaryBtnDisabled: { backgroundColor: '#2D60FF60' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  secondaryBtn: {
    borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#ffffff15', marginTop: 10,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  secondaryBtnText: { color: '#9ca3af', fontSize: 14, fontFamily: 'Poppins_400Regular' },

  hint: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 16 },

  // Step 2
  sectionLabel: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_500Medium', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontSize: 11, color: '#ffffff30', fontFamily: 'Poppins_400Regular', textTransform: 'none', letterSpacing: 0 },
  notesField: {
    backgroundColor: '#303E4D', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  notesPlaceholder: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 14 },
  priceCard: {
    backgroundColor: '#2D60FF15', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 16,
    borderWidth: 1, borderColor: '#2D60FF30',
  },
  priceLabel: { color: '#9ca3af', fontSize: 11, fontFamily: 'Poppins_400Regular', marginBottom: 4 },
  priceValue: { color: '#2D60FF', fontSize: 22, fontFamily: 'Poppins_700Bold' },
  priceSub: { color: '#ffffff30', fontSize: 10, fontFamily: 'Poppins_400Regular', marginTop: 4, textAlign: 'center' },
});
