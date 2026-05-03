import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, LongPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import {
  weightRanges,
  deliveryTypes,
  calcPrice,
} from '../../../../components/modules/services/data/deliveryData';

const GOOGLE_API_KEY = 'AIzaSyAfv049haZyKRIa_xdksJxRFYD3od9fw-w';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Altura do rodapé fixo (método de pagamento + botão avançar)
const FOOTER_HEIGHT = 80;

// Snap points: baixo (só handle visível), médio (meia tela ~imagem 5/6), alto (nunca cobre tudo)
const SNAP_LOW = 160;
const SNAP_MID = SCREEN_HEIGHT * 0.48;
const SNAP_HIGH = SCREEN_HEIGHT * 0.72;

type LatLng = { latitude: number; longitude: number };
type Step = 1 | 2 | 3;
type PaymentMethod = 'cash' | 'card';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function reverseGeocode(coords: LatLng): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_API_KEY}&language=pt`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results?.length > 0) {
      return data.results[0].formatted_address;
    }
  } catch (_) {}
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

// ─── Marcadores ──────────────────────────────────────────────────────────────

function DestinationMarker() {
  return (
    <View style={mk.wrapper}>
      <View style={mk.pulse} />
      <View style={mk.dot} />
    </View>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ['Localização', 'Detalhes', 'Confirmar'];

function StepIndicator({ current }: { current: Step }) {
  return (
    <View style={si.row}>
      {([1, 2, 3] as Step[]).map((n, i) => (
        <React.Fragment key={n}>
          <View style={si.item}>
            <View style={[si.circle, current >= n && si.circleActive]}>
              {current > n
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[si.num, current >= n && si.numActive]}>{n}</Text>
              }
            </View>
            <Text style={[si.label, current >= n && si.labelActive]}>{STEP_LABELS[n - 1]}</Text>
          </View>
          {i < 2 && <View style={[si.line, current > n && si.lineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Info modal ───────────────────────────────────────────────────────────────

function InfoModal({ visible, onClose, step }: { visible: boolean; onClose: () => void; step: Step }) {
  const items = step === 1 ? [
    { icon: 'location-outline' as const, text: 'O ponto de Recolha é onde o estafeta vai buscar o teu pacote.' },
    { icon: 'flag-outline' as const, text: 'A Morada de Entrega é o destino final do pacote.' },
    { icon: 'hand-left-outline' as const, text: 'Pressiona o mapa por 3 segundos para marcar um ponto de entrega directamente.' },
    { icon: 'map-outline' as const, text: 'A rota é calculada automaticamente após confirmares os dois pontos.' },
  ] : step === 2 ? [
    { icon: 'layers-outline' as const, text: 'O tipo de encomenda ajuda o estafeta a tratar o pacote com o cuidado certo.' },
    { icon: 'fitness-outline' as const, text: 'O peso máximo por entrega é 10 kg.' },
    { icon: 'shield-checkmark-outline' as const, text: 'Itens frágeis devem ser embalados antes da recolha.' },
    { icon: 'chatbubble-outline' as const, text: 'As observações são opcionais mas úteis — ex: "3º andar".' },
  ] : [
    { icon: 'time-outline' as const, text: 'Estamos a procurar o motoqueiro mais próximo de ti.' },
    { icon: 'cash-outline' as const, text: 'Escolhe o método de pagamento antes de confirmar.' },
    { icon: 'shield-outline' as const, text: 'O pagamento com cartão é processado de forma segura via Stripe.' },
  ];

  const title = step === 1 ? 'Como funciona a localização' : step === 2 ? 'Detalhes da encomenda' : 'Confirmação da entrega';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={im.overlay}>
        <View style={im.sheet}>
          <View style={im.handle} />
          <Ionicons name="information-circle-outline" size={44} color="#2D60FF" style={{ alignSelf: 'center', marginBottom: 10 }} />
          <Text style={im.title}>{title}</Text>
          <View style={im.divider} />
          {items.map((item, i) => (
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

// ─── Payment modal ────────────────────────────────────────────────────────────

function PaymentModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: PaymentMethod;
  onSelect: (m: PaymentMethod) => void;
  onClose: () => void;
}) {
  const options: { id: PaymentMethod; label: string; icon: any; sub: string }[] = [
    { id: 'cash', label: 'Numerário', icon: 'cash-outline', sub: 'Paga em mãos ao estafeta' },
    { id: 'card', label: 'Cartão / Stripe', icon: 'card-outline', sub: 'Pagamento seguro por cartão' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.handle} />
          <Text style={pm.title}>Método de pagamento</Text>
          <View style={pm.divider} />
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={pm.row}
              onPress={() => { onSelect(opt.id); onClose(); }}
              activeOpacity={0.75}
            >
              <View style={[pm.iconCircle, selected === opt.id && pm.iconCircleActive]}>
                <Ionicons name={opt.icon} size={22} color={selected === opt.id ? '#2D60FF' : '#9ca3af'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[pm.label, selected === opt.id && pm.labelActive]}>{opt.label}</Text>
                <Text style={pm.sub}>{opt.sub}</Text>
              </View>
              {selected === opt.id && (
                <View style={pm.check}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={pm.doneBtn} onPress={onClose}>
            <Text style={pm.doneBtnText}>Feito</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Search modal (autocomplete fullscreen) ───────────────────────────────────

function DestinationModal({
  visible,
  onClose,
  onSelect,
  currentLocation,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string, coords: LatLng) => void;
  currentLocation: Location.LocationObject | null;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={dm.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={dm.header}>
            <TouchableOpacity onPress={onClose} style={dm.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={dm.headerTitle}>Morada de entrega</Text>
          </View>
          <GooglePlacesAutocomplete
            placeholder="Escreve o endereço..."
            onPress={(data, details) => {
              if (!details) return;
              onSelect(data.description, {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
              });
              onClose();
            }}
            fetchDetails={true}
            query={{
              key: GOOGLE_API_KEY,
              language: 'pt',
              ...(currentLocation && {
                location: `${currentLocation.coords.latitude},${currentLocation.coords.longitude}`,
                radius: 50000,
              }),
            }}
            styles={{
              container: { flex: 1 },
              textInputContainer: {
                backgroundColor: '#303E4D',
                marginHorizontal: 16,
                borderRadius: 14,
                paddingHorizontal: 4,
                marginBottom: 8,
              },
              textInput: {
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                fontFamily: 'Poppins_400Regular',
                fontSize: 15,
                height: 50,
              },
              listView: { backgroundColor: '#1F2933', marginHorizontal: 16, borderRadius: 14 },
              row: { backgroundColor: '#1F2933', paddingVertical: 14, paddingHorizontal: 16 },
              description: { color: '#FFFFFF', fontFamily: 'Poppins_400Regular', fontSize: 14 },
              separator: { backgroundColor: '#ffffff10', height: 1 },
            }}
            textInputProps={{ placeholderTextColor: '#9ca3af', autoFocus: true }}
            enablePoweredByContainer={false}
            renderLeftButton={() => (
              <View style={dm.searchIcon}>
                <Ionicons name="search-outline" size={18} color="#9ca3af" />
              </View>
            )}
          />
        </KeyboardAvoidingView>
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
          <Ionicons name={w.icon as any} size={22} color={selected === w.id ? '#2D60FF' : '#9ca3af'} />
          <Text style={[ws.label, selected === w.id && ws.labelActive]}>{w.label}</Text>
          <Text style={ws.sub}>{w.sublabel}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Type selector ────────────────────────────────────────────────────────────

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
          <Ionicons name={t.icon as any} size={20} color={selected === t.id ? '#2D60FF' : '#9ca3af'} />
          <Text style={[ts.label, selected === t.id && ts.labelActive]} numberOfLines={1}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Searching animation (passo 3) ────────────────────────────────────────────

function SearchingScreen({ onFound }: { onFound: () => void }) {
  const [seconds, setSeconds] = useState(10);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Spin contínuo
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Countdown
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(interval); onFound(); return 0; }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={ss.container}>
      <Animated.View style={[ss.ring, { transform: [{ rotate: spin }, { scale: scaleAnim }] }]}>
        <Ionicons name="bicycle" size={36} color="#2D60FF" />
      </Animated.View>
      <Text style={ss.title}>À procura de motoqueiro...</Text>
      <Text style={ss.sub}>Aguarda {seconds}s enquanto encontramos o mais próximo</Text>
      <View style={ss.progress}>
        <View style={[ss.progressBar, { width: `${(10 - seconds) * 10}%` }]} />
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClientHome() {
  const navigation = useNavigation<any>();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationName, setDestinationName] = useState('');
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [distanceMeters, setDistanceMeters] = useState(0);

  const [step, setStep] = useState<Step>(1);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [riderFound, setRiderFound] = useState(false);

  const [selectedWeight, setSelectedWeight] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Para rastrear snap index e mover o botão de localização
  const [snapIndex, setSnapIndex] = useState(1);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);

  const snapPoints = useMemo(() => [SNAP_LOW, SNAP_MID, SNAP_HIGH], []);

  // Posição do botão de localização acompanha a altura do sheet
  const locationBtnBottom = useMemo(() => {
    if (snapIndex === 0) return SNAP_LOW + 16;
    if (snapIndex === 1) return SNAP_MID + 16;
    return undefined; // esconde no snap alto
  }, [snapIndex]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Permissão negada'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  const fetchRoute = useCallback(async (dest: LatLng) => {
    if (!location) return;
    try {
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const destStr = `${dest.latitude},${dest.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destStr}&key=${GOOGLE_API_KEY}&language=pt`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const leg = data.routes[0].legs[0];
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoords(points);
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);
        setDistanceMeters(leg.distance.value);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 80, right: 40, bottom: SNAP_MID + 40, left: 40 },
          animated: true,
        });
        bottomSheetRef.current?.snapToIndex(1);
      }
    } catch (e) {
      console.log('Erro rota:', e);
    }
  }, [location]);

  const handleSelectDestination = useCallback((name: string, coords: LatLng) => {
    setDestination(coords);
    setDestinationName(name);
    fetchRoute(coords);
  }, [fetchRoute]);

  // Long press no mapa → marca destino
  const handleMapLongPress = useCallback(async (e: LongPressEvent) => {
    const coords = e.nativeEvent.coordinate;
    const name = await reverseGeocode(coords);
    setDestination(coords);
    setDestinationName(name);
    fetchRoute(coords);
  }, [fetchRoute]);

  const handleClear = useCallback(() => {
    setDestination(null);
    setDestinationName('');
    setRouteCoords([]);
    setDistance('');
    setDuration('');
    setDistanceMeters(0);
    setStep(1);
    setSelectedWeight(null);
    setSelectedType(null);
    setNotes('');
    setRiderFound(false);
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600);
    }
    bottomSheetRef.current?.snapToIndex(1);
  }, [location]);

  const goToStep = useCallback((s: Step, snap: number) => {
    setStep(s);
    bottomSheetRef.current?.snapToIndex(snap);
  }, []);

  const canAdvanceStep1 = !!destination;
  const canAdvanceStep2 = !!selectedWeight && !!selectedType;
  const estimatedPrice = distanceMeters > 0 && selectedWeight
    ? calcPrice(distanceMeters, selectedWeight)
    : distanceMeters > 0 ? calcPrice(distanceMeters, 'light') : null;

  const paymentLabel = paymentMethod === 'cash' ? 'Numerário' : 'Cartão / Stripe';
  const paymentIcon = paymentMethod === 'cash' ? 'cash-outline' : 'card-outline';

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
      {/* MAP */}
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
        onLongPress={handleMapLongPress}
      >
        {destination && (
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
            <DestinationMarker />
          </Marker>
        )}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#2D60FF" strokeWidth={4} />
        )}
      </MapView>

      {/* MENU BUTTON */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      >
        <Ionicons name="menu" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* LOCATION BUTTON — acompanha a altura do sheet, some no snap alto */}
      {snapIndex < 2 && (
        <TouchableOpacity
          style={[styles.locationButton, { bottom: locationBtnBottom! + FOOTER_HEIGHT }]}
          onPress={() => mapRef.current?.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 800)}
        >
          <Ionicons name="navigate" size={20} color="#2D60FF" />
        </TouchableOpacity>
      )}

      {/* BOTTOM SHEET */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        onChange={setSnapIndex}
      >
        <BottomSheetScrollView
          style={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Padding extra em baixo para o rodapé fixo não tapar conteúdo
          contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 16 }}
        >
          {/* HEADER */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Enviar o Pacote</Text>
            </View>
            <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoVisible(true)}>
              <Ionicons name="information-circle-outline" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <StepIndicator current={step} />
          <View style={styles.divider} />

          {/* ══ PASSO 1 — Localização ══ */}
          {step === 1 && (
            <>
              {/* Container estilo Yango (imagem 5/6) */}
              <View style={styles.locationCard}>
                {/* Recolha */}
                <View style={styles.locRow}>
                  <View style={[styles.locDot, { backgroundColor: '#2D60FF' }]} />
                  <View style={styles.locTexts}>
                    <Text style={styles.locLabel}>Recolha</Text>
                    <Text style={styles.locValue} numberOfLines={1}>Minha localização actual</Text>
                  </View>
                </View>

                {/* Linha tracejada */}
                <View style={styles.locConnector}>
                  <View style={styles.locLine} />
                </View>

                {/* Destino */}
                <TouchableOpacity
                  style={styles.locRow}
                  onPress={() => { if (!destinationName) setSearchModalVisible(true); }}
                  activeOpacity={destinationName ? 1 : 0.7}
                >
                  <View style={[styles.locDot, { backgroundColor: '#EB5757' }]} />
                  <View style={styles.locTexts}>
                    <Text style={styles.locLabel}>Destino</Text>
                    {destinationName
                      ? <Text style={styles.locValue} numberOfLines={1}>{destinationName}</Text>
                      : <Text style={styles.locPlaceholder}>Morada de entrega</Text>
                    }
                  </View>
                  {!destinationName && (
                    <TouchableOpacity style={styles.mapPinBtn} onPress={() => setSearchModalVisible(true)}>
                      <Text style={styles.mapPinText}>Mapa</Text>
                    </TouchableOpacity>
                  )}
                  {destinationName && (
                    <TouchableOpacity onPress={handleClear} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <Ionicons name="close-circle" size={20} color="#ffffff40" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              {/* Sugestão long press no mapa */}
              {!destination && (
                <View style={styles.tipRow}>
                  <Ionicons name="hand-left-outline" size={14} color="#9ca3af" />
                  <Text style={styles.tipText}>Pressiona o mapa 3s para marcar o destino directamente</Text>
                </View>
              )}

              {/* Route summary */}
              {destination && distance && (
                <View style={styles.routeCard}>
                  <View style={styles.routeRow}>
                    <View style={styles.routeItem}>
                      <Ionicons name="navigate-outline" size={15} color="#85D5EB" />
                      <Text style={styles.routeLabel}>Distância</Text>
                      <Text style={styles.routeValue}>{distance}</Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeItem}>
                      <Ionicons name="time-outline" size={15} color="#85D5EB" />
                      <Text style={styles.routeLabel}>Tempo est.</Text>
                      <Text style={styles.routeValue}>{duration}</Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeItem}>
                      <Ionicons name="wallet-outline" size={15} color="#85D5EB" />
                      <Text style={styles.routeLabel}>A partir de</Text>
                      <Text style={styles.routeValue}>{calcPrice(distanceMeters, 'light')}</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ══ PASSO 2 — Detalhes ══ */}
          {step === 2 && (
            <>
              <Text style={styles.sectionLabel}>Tipo de encomenda</Text>
              <TypeSelector selected={selectedType} onSelect={setSelectedType} />

              <View style={{ height: 20 }} />

              <Text style={styles.sectionLabel}>Peso aproximado</Text>
              <WeightSelector selected={selectedWeight} onSelect={setSelectedWeight} />

              <View style={{ height: 20 }} />

              <Text style={styles.sectionLabel}>
                Observações <Text style={styles.optional}>(opcional)</Text>
              </Text>
              <View style={styles.notesField}>
                <Ionicons name="chatbubble-outline" size={18} color="#9ca3af" />
                <TextInput
                  style={styles.notesInput}
                  placeholder='Ex: "Toca o portão 2 vezes"'
                  placeholderTextColor="#9ca3af"
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => goToStep(1, 1)}
              >
                <Ionicons name="arrow-back" size={15} color="#9ca3af" />
                <Text style={styles.backLinkText}>Voltar</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══ PASSO 3 — Confirmar ══ */}
          {step === 3 && (
            <>
              {!riderFound ? (
                <SearchingScreen onFound={() => setRiderFound(true)} />
              ) : (
                <>
                  {/* Rider encontrado */}
                  <View style={styles.riderCard}>
                    <View style={styles.riderAvatar}>
                      <Ionicons name="person" size={28} color="#2D60FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.riderName}>João M.</Text>
                      <View style={styles.riderStars}>
                        {[1,2,3,4,5].map(s => (
                          <Ionicons key={s} name="star" size={12} color="#f59e0b" />
                        ))}
                        <Text style={styles.riderRating}>4.9</Text>
                      </View>
                    </View>
                    <View style={styles.riderEta}>
                      <Text style={styles.riderEtaNum}>~3 min</Text>
                      <Text style={styles.riderEtaLabel}>chegada</Text>
                    </View>
                  </View>

                  {/* Resumo do pedido */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Recolha</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>Localização actual</Text>
                    </View>
                    <View style={styles.summarySep} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Entrega</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>{destinationName}</Text>
                    </View>
                    <View style={styles.summarySep} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Distância</Text>
                      <Text style={styles.summaryValue}>{distance}</Text>
                    </View>
                    <View style={styles.summarySep} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Tempo est.</Text>
                      <Text style={styles.summaryValue}>{duration}</Text>
                    </View>
                    <View style={styles.summarySep} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Preço</Text>
                      <Text style={[styles.summaryValue, { color: '#2D60FF', fontFamily: 'Poppins_600SemiBold' }]}>
                        {estimatedPrice}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.cancelLink}
                    onPress={handleClear}
                  >
                    <Text style={styles.cancelLinkText}>Cancelar solicitação</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </BottomSheetScrollView>

        {/* ─── RODAPÉ FIXO ─── */}
        <View style={styles.footer}>
          {/* Método de pagamento */}
          <TouchableOpacity style={styles.footerPayment} onPress={() => setPaymentModalVisible(true)}>
            <Ionicons name={paymentIcon as any} size={22} color="#2D60FF" />
            <Text style={styles.footerPaymentText}>{paymentLabel}</Text>
            <Ionicons name="chevron-down" size={14} color="#9ca3af" />
          </TouchableOpacity>

          {/* Botão avançar / confirmar */}
          {step === 1 && (
            <TouchableOpacity
              style={[styles.footerBtn, !canAdvanceStep1 && styles.footerBtnDisabled]}
              disabled={!canAdvanceStep1}
              onPress={() => goToStep(2, 2)}
              activeOpacity={0.85}
            >
              <Text style={styles.footerBtnText}>Introduzir dados</Text>
            </TouchableOpacity>
          )}
          {step === 2 && (
            <TouchableOpacity
              style={[styles.footerBtn, !canAdvanceStep2 && styles.footerBtnDisabled]}
              disabled={!canAdvanceStep2}
              onPress={() => goToStep(3, 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.footerBtnText}>Confirmar entrega</Text>
            </TouchableOpacity>
          )}
          {step === 3 && riderFound && (
            <TouchableOpacity
              style={styles.footerBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.footerBtnText}>Pagar agora</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>

      {/* MODALS */}
      <DestinationModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSelect={handleSelectDestination}
        currentLocation={location}
      />
      <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} step={step} />
      <PaymentModal
        visible={paymentModalVisible}
        selected={paymentMethod}
        onSelect={setPaymentMethod}
        onClose={() => setPaymentModalVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const mk = StyleSheet.create({
  wrapper: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#EB5757', opacity: 0.2 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF2D55', borderWidth: 3, borderColor: '#FFFFFF' },
});

const si = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  item: { alignItems: 'center', gap: 4 },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#303E4D', borderWidth: 1.5, borderColor: '#ffffff20', alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: '#2D60FF', borderColor: '#2D60FF' },
  num: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_500Medium' },
  numActive: { color: '#fff' },
  label: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  labelActive: { color: '#fff' },
  line: { flex: 1, height: 1.5, backgroundColor: '#ffffff15', marginBottom: 14, marginHorizontal: 6 },
  lineActive: { backgroundColor: '#2D60FF' },
});

const im = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1F2933', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#ffffff30', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 17, color: '#fff', fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#ffffff10', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2D60FF15', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemText: { flex: 1, color: '#c5cdd6', fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20 },
  closeBtn: { marginTop: 24, backgroundColor: '#303E4D', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { color: '#9ca3af', fontFamily: 'Poppins_500Medium', fontSize: 14 },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1F2933', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#ffffff30', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 17, color: '#fff', fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#ffffff10', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ffffff08' },
  iconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#303E4D', alignItems: 'center', justifyContent: 'center' },
  iconCircleActive: { backgroundColor: '#2D60FF15', borderWidth: 1.5, borderColor: '#2D60FF40' },
  label: { fontSize: 15, color: '#9ca3af', fontFamily: 'Poppins_500Medium' },
  labelActive: { color: '#fff' },
  sub: { fontSize: 12, color: '#ffffff40', fontFamily: 'Poppins_400Regular', marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2D60FF', alignItems: 'center', justifyContent: 'center' },
  doneBtn: { marginTop: 24, backgroundColor: '#2D60FF', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});

const dm = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2933', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#303E4D', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  searchIcon: { justifyContent: 'center', paddingLeft: 14 },
});

const ws = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: '#303E4D', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: 'transparent' },
  cardActive: { borderColor: '#2D60FF', backgroundColor: '#2D60FF12' },
  label: { fontSize: 13, color: '#9ca3af', fontFamily: 'Poppins_500Medium' },
  labelActive: { color: '#fff' },
  sub: { fontSize: 10, color: '#ffffff40', fontFamily: 'Poppins_400Regular', textAlign: 'center' },
});

const ts = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '22%', alignItems: 'center', gap: 5, backgroundColor: '#303E4D', borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: 'transparent' },
  cardActive: { borderColor: '#2D60FF', backgroundColor: '#2D60FF12' },
  label: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  labelActive: { color: '#fff' },
});

const ss = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24 },
  ring: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#2D60FF40', borderTopColor: '#2D60FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 16, color: '#fff', fontFamily: 'Poppins_600SemiBold', marginBottom: 6 },
  sub: { fontSize: 13, color: '#9ca3af', fontFamily: 'Poppins_400Regular', textAlign: 'center', paddingHorizontal: 20, marginBottom: 20 },
  progress: { width: '80%', height: 4, backgroundColor: '#303E4D', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: 4, backgroundColor: '#2D60FF', borderRadius: 4 },
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
    position: 'absolute', right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1F2933', alignItems: 'center', justifyContent: 'center',
    elevation: 5, zIndex: 10,
  },

  sheetBackground: { backgroundColor: '#1F2933', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetIndicator: { backgroundColor: '#ffffff30', width: 40 },
  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  infoBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: '#ffffff10', marginBottom: 16 },

  // Passo 1 — card localização estilo Yango
  locationCard: {
    backgroundColor: '#253040',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  locDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  locTexts: { flex: 1 },
  locLabel: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  locValue: { fontSize: 14, color: '#fff', fontFamily: 'Poppins_500Medium', marginTop: 1 },
  locPlaceholder: { fontSize: 14, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginTop: 1 },
  locConnector: { paddingLeft: 5, paddingVertical: 2 },
  locLine: { width: 2, height: 18, backgroundColor: '#ffffff20', marginLeft: 0, borderRadius: 1 },
  mapPinBtn: { backgroundColor: '#303E4D', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  mapPinText: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_500Medium' },

  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4 },
  tipText: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular', flex: 1 },

  routeCard: { backgroundColor: '#253040', borderRadius: 14, padding: 14, marginTop: 12 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeItem: { flex: 1, alignItems: 'center', gap: 4 },
  routeDivider: { width: 1, height: 36, backgroundColor: '#ffffff15' },
  routeLabel: { color: '#9ca3af', fontSize: 10, fontFamily: 'Poppins_400Regular' },
  routeValue: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  // Passo 2
  sectionLabel: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_500Medium', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontSize: 11, color: '#ffffff30', fontFamily: 'Poppins_400Regular', textTransform: 'none', letterSpacing: 0 },
  notesField: { backgroundColor: '#253040', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  notesInput: { flex: 1, color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 14, minHeight: 40 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, alignSelf: 'flex-start' },
  backLinkText: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 13 },

  // Passo 3
  riderCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#253040', borderRadius: 16, padding: 16, marginBottom: 14 },
  riderAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2D60FF15', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2D60FF30' },
  riderName: { fontSize: 15, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  riderStars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  riderRating: { fontSize: 11, color: '#f59e0b', fontFamily: 'Poppins_500Medium', marginLeft: 4 },
  riderEta: { alignItems: 'center' },
  riderEtaNum: { fontSize: 16, color: '#2D60FF', fontFamily: 'Poppins_700Bold' },
  riderEtaLabel: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },

  summaryCard: { backgroundColor: '#253040', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  summarySep: { height: 1, backgroundColor: '#ffffff08' },
  summaryLabel: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  summaryValue: { fontSize: 13, color: '#fff', fontFamily: 'Poppins_500Medium', maxWidth: '60%', textAlign: 'right' },
  cancelLink: { alignSelf: 'center', paddingVertical: 8 },
  cancelLinkText: { color: '#EB5757', fontFamily: 'Poppins_400Regular', fontSize: 13 },

  // Rodapé fixo
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
    backgroundColor: '#1F2933',
    height: FOOTER_HEIGHT,
  },
  footerPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#253040',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerPaymentText: { fontSize: 12, color: '#fff', fontFamily: 'Poppins_500Medium' },
  footerBtn: {
    flex: 1,
    backgroundColor: '#2D60FF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  footerBtnDisabled: { backgroundColor: '#2D60FF55' },
  footerBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
});
