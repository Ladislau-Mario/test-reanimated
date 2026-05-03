import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
  Platform,
  ScrollView,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { TAB_BAR_HEIGHT } from '../../../../components/common/curvedTabs/index';

// Backend — descomentar quando o colega ligar os endpoints:
// import axios from 'axios';
// import api from '../../../../components/modules/services/api/api';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LatLng = { latitude: number; longitude: number };

type DeliveryOrder = {
  id: string;
  clientName: string;
  pickupAddress: string;
  pickupCoords: LatLng;
  deliveryAddress: string;
  deliveryCoords: LatLng;
  distanceKm: number;
  basePrice: number;
  timeoutSeconds: number;
};

type DeliverPhase = 'idle' | 'orders' | 'pickup' | 'delivery' | 'rating';

// ─── Mock (substituir por api.get('/orders/available')) ───────────────────────

const MOCK_ORDERS: DeliveryOrder[] = [
  {
    id: 'ord_001',
    clientName: 'Ladislau Mário',
    pickupAddress: 'Talatona, Luanda Sul',
    pickupCoords: { latitude: -8.9150, longitude: 13.1820 },
    deliveryAddress: 'Kilamba, Luanda',
    deliveryCoords: { latitude: -8.9800, longitude: 13.2200 },
    distanceKm: 1.80,
    basePrice: 1800,
    timeoutSeconds: 40,
  },
  {
    id: 'ord_002',
    clientName: 'Ana Ferreira',
    pickupAddress: 'Viana, Luanda',
    pickupCoords: { latitude: -8.9050, longitude: 13.3700 },
    deliveryAddress: 'Miramar, Luanda',
    deliveryCoords: { latitude: -8.8200, longitude: 13.2300 },
    distanceKm: 4.20,
    basePrice: 2500,
    timeoutSeconds: 40,
  },
  {
    id: 'ord_003',
    clientName: 'Carlos Bento',
    pickupAddress: 'Cazenga, Luanda',
    pickupCoords: { latitude: -8.8350, longitude: 13.2850 },
    deliveryAddress: 'Rangel, Luanda',
    deliveryCoords: { latitude: -8.8150, longitude: 13.2700 },
    distanceKm: 2.30,
    basePrice: 2000,
    timeoutSeconds: 40,
  },
];

// ─── Rota simulada entre dois pontos (interpolação linear) ────────────────────

function buildSimRoute(from: LatLng, to: LatLng, steps = 12): LatLng[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    latitude: from.latitude + (to.latitude - from.latitude) * (i / steps),
    longitude: from.longitude + (to.longitude - from.longitude) * (i / steps),
  }));
}

// ─── Map style ────────────────────────────────────────────────────────────────

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#303E4D' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1F2933' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3D5166' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F2933' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4A6080' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a2a3a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2A3A4A' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2A3A4A' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
];

// ─── Marcadores ───────────────────────────────────────────────────────────────

function PickupMarker() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
      <View style={{
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#FF2D55', borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
      }} />
    </View>
  );
}

function DeliveryMarker() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
      <View style={{
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#2D60FF', borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
      }} />
    </View>
  );
}

// ─── Countdown timer ──────────────────────────────────────────────────────────

function CountdownTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 0, duration: seconds * 1000, useNativeDriver: false }).start();
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(t); onExpire(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <View style={{ alignItems: 'flex-end', gap: 3, minWidth: 52 }}>
      <Text style={{ color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </Text>
      <View style={{ width: 52, height: 3, backgroundColor: '#ffffff20', borderRadius: 2, overflow: 'hidden' }}>
        <Animated.View style={{ height: 3, backgroundColor: '#CB1D00', borderRadius: 2, width: barWidth }} />
      </View>
    </View>
  );
}

// ─── Swipe-to-complete (teu estilo: → Completar ✓) ───────────────────────────

function SwipeComplete({ onComplete }: { onComplete: () => void }) {
  const TRACK_W = SCREEN_WIDTH - 40; // padding horizontal
  const HANDLE_W = 56;
  const MAX_X = TRACK_W - HANDLE_W - 8;

  const translateX = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const bgColor = translateX.interpolate({
    inputRange: [0, MAX_X],
    outputRange: ['#CB1D00', '#16a34a'],
    extrapolate: 'clamp',
  });

  const checkOpacity = translateX.interpolate({
    inputRange: [MAX_X * 0.6, MAX_X],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      translateX.setValue(Math.max(0, Math.min(g.dx, MAX_X)));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx >= MAX_X * 0.75 && !done.current) {
        done.current = true;
        Animated.timing(translateX, { toValue: MAX_X, duration: 120, useNativeDriver: true }).start(() => onComplete());
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
      }
    },
  })).current;

  return (
    <Animated.View style={[sw.track, { backgroundColor: bgColor }]}>
      {/* Label central */}
      <Text style={sw.label}>Completar</Text>
      {/* Check do lado direito */}
      <Animated.View style={[sw.checkIcon, { opacity: checkOpacity }]}>
        <Ionicons name="checkmark" size={20} color="#fff" />
      </Animated.View>
      {/* Handle arrastável */}
      <Animated.View
        style={[sw.handle, { transform: [{ translateX }] }]}
        {...pan.panHandlers}
      >
        <Ionicons name="arrow-forward" size={22} color="#CB1D00" />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Rating modal ─────────────────────────────────────────────────────────────

function RatingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [stars, setStars] = useState(0);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <View style={rm.sheet}>
          <View style={rm.handle} />
          <View style={rm.avatar}>
            <Ionicons name="person" size={38} color="#2D60FF" />
          </View>
          <Text style={rm.title}>Entrega concluída!</Text>
          <Text style={rm.sub}>Como foi a experiência com este cliente?</Text>
          <View style={rm.stars}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => setStars(s)}>
                <Ionicons name={s <= stars ? 'star' : 'star-outline'} size={38} color={s <= stars ? '#f59e0b' : '#ffffff25'} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[rm.btn, !stars && rm.btnDisabled]} disabled={!stars} onPress={onClose}>
            <Text style={rm.btnText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
            <Text style={{ color: '#ffffff30', fontFamily: 'Poppins_400Regular', fontSize: 13 }}>Saltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  isOnline,
  onAccept,
  onIgnore,
}: {
  order: DeliveryOrder;
  isOnline: boolean;
  onAccept: (price: number) => void;
  onIgnore: () => void;
}) {
  const [price, setPrice] = useState(order.basePrice);
  const MIN_PRICE = Math.max(500, order.basePrice - 600);

  return (
    <View style={oc.card}>
      {/* Cabeçalho: avatar + nome + distância + timer + ignorar */}
      <View style={oc.header}>
        <View style={oc.avatar}>
          <Ionicons name="person" size={20} color="#CB1D00" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={oc.name}>{order.clientName}</Text>
          <Text style={oc.dist}>{order.distanceKm.toFixed(2)} km</Text>
        </View>
        <CountdownTimer seconds={order.timeoutSeconds} onExpire={onIgnore} />
        <TouchableOpacity style={oc.ignoreBtn} onPress={onIgnore}>
          <Text style={oc.ignoreTxt}>Ignorar</Text>
        </TouchableOpacity>
      </View>

      {/* Rota */}
      <View style={oc.route}>
        <View style={oc.routeRow}>
          <View style={[oc.dot, { backgroundColor: '#2D60FF' }]} />
          <Text style={oc.routeTxt} numberOfLines={1}>{order.pickupAddress}</Text>
        </View>
        <View style={oc.routeConnector} />
        <View style={oc.routeRow}>
          <View style={[oc.dot, { backgroundColor: '#FF2D55' }]} />
          <Text style={oc.routeTxt} numberOfLines={1}>{order.deliveryAddress}</Text>
        </View>
      </View>

      <View style={oc.divider} />

      {/* Preço ajustável */}
      <View style={oc.priceRow}>
        <TouchableOpacity
          style={oc.priceBtn}
          onPress={() => setPrice(p => Math.max(MIN_PRICE, p - 200))}
        >
          <Text style={oc.priceBtnTxt}>-200</Text>
        </TouchableOpacity>
        <Text style={oc.priceVal}>{price.toLocaleString('pt-AO')} Kz</Text>
        <TouchableOpacity style={oc.priceBtn} onPress={() => setPrice(p => p + 200)}>
          <Text style={oc.priceBtnTxt}>+200</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[oc.acceptBtn, !isOnline && oc.acceptBtnDisabled]}
        disabled={!isOnline}
        onPress={() => isOnline && onAccept(price)}
        activeOpacity={0.85}
      >
        <Text style={oc.acceptTxt}>Aceitar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Delivery phase content ───────────────────────────────────────────────────

function PhaseContent({
  phaseNum,
  order,
  simDistance,
  expanded,
  onToggle,
  onComplete,
}: {
  phaseNum: 1 | 2;
  order: DeliveryOrder;
  simDistance: number;
  expanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const addr = phaseNum === 1 ? order.pickupAddress : order.deliveryAddress;
  const label = phaseNum === 1 ? 'Pegar encomenda' : 'Destino';

  return (
    <View>
      {/* Header */}
      <View style={ph.header}>
        <View style={ph.badge}>
          <Text style={ph.badgeNum}>{phaseNum}</Text>
        </View>
        <Text style={ph.phaseLabel}>{label}</Text>
        <Text style={ph.timer}>{timeStr}</Text>
        <TouchableOpacity style={ph.toggleBtn} onPress={onToggle}>
          <Text style={ph.toggleTxt}>{expanded ? 'Esconder' : 'Mostrar'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <Text style={ph.addr} numberOfLines={1}>{addr}</Text>

      {/* Acções expandidas */}
      {expanded && (
        <View style={ph.actions}>
          <TouchableOpacity style={ph.altRoute}>
            <Text style={ph.altRouteTxt}>Escolha outro caminho</Text>
            <Ionicons name="location-outline" size={13} color="#9ca3af" />
          </TouchableOpacity>
          <View style={ph.grid}>
            <TouchableOpacity style={[ph.gridCard, { backgroundColor: '#f59e0b' }]}>
              <Text style={ph.gridLabel}>Chamada</Text>
              <Ionicons name="call-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[ph.gridCard, { backgroundColor: '#253040', borderWidth: 1, borderColor: '#ffffff12' }]}>
              <Text style={[ph.gridLabel, { color: '#9ca3af' }]}>Pausar</Text>
              <Ionicons name="pause-outline" size={22} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity style={[ph.gridCard, { backgroundColor: '#16a34a' }]}>
              <Text style={ph.gridLabel}>Chat</Text>
              <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Swipe */}
      <View style={{ marginTop: 14 }}>
        <SwipeComplete onComplete={onComplete} />
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DeliverHome() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const [phase, setPhase] = useState<DeliverPhase>('idle');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [simDistance, setSimDistance] = useState(0);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [snapIndex, setSnapIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [ratingVisible, setRatingVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);

  // Snap points: baixo, médio, alto
  const snapPoints = useMemo(() => {
    const avail = SCREEN_HEIGHT - TAB_BAR_HEIGHT;
    return [
      Math.round(avail * 0.22),  // 0 — baixo
      Math.round(avail * 0.50),  // 1 — médio
      Math.round(avail * 0.82),  // 2 — alto
    ];
  }, []);

  // Botão localização — acompanha o sheet (some no snap alto)
  const locBtnBottom = useMemo(() => {
    if (snapIndex === 0) return snapPoints[0] + TAB_BAR_HEIGHT + 10;
    if (snapIndex === 1) return snapPoints[1] + TAB_BAR_HEIGHT + 10;
    return null; // some
  }, [snapIndex, snapPoints]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Permissão negada'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  // Toggle online/offline
  const handleToggleOnline = useCallback(() => {
    if (phase !== 'idle' && phase !== 'orders') return; // não pode desligar a meio de entrega
    const next = !isOnline;
    setIsOnline(next);
    if (next) {
      // TODO backend: api.get('/orders/available').then(r => setOrders(r.data))
      setTimeout(() => {
        setOrders(MOCK_ORDERS);
        setPhase('orders');
        bottomSheetRef.current?.snapToIndex(1);
      }, 800);
    } else {
      setPhase('idle');
      setOrders([]);
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [isOnline, phase]);

  // Aceitar pedido
  const handleAccept = useCallback((order: DeliveryOrder, price: number) => {
    if (!isOnline) return; // segurança extra
    // TODO backend: api.post(`/orders/${order.id}/accept`, { agreedPrice: price })
    setActiveOrder(order);
    setSimDistance(order.distanceKm);
    const route = buildSimRoute(
      location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : order.pickupCoords,
      order.pickupCoords,
    );
    setRouteCoords(route);
    setPhase('pickup');
    setExpanded(false);
    bottomSheetRef.current?.snapToIndex(1);
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [order.pickupCoords, order.deliveryCoords],
        { edgePadding: { top: 80, right: 40, bottom: snapPoints[1] + TAB_BAR_HEIGHT + 20, left: 40 }, animated: true }
      );
    }, 300);
  }, [isOnline, location, snapPoints]);

  // Ignorar pedido
  const handleIgnore = useCallback((id: string) => {
    const rest = orders.filter(o => o.id !== id);
    setOrders(rest);
    if (rest.length === 0) {
      setPhase('idle');
      setIsOnline(false);
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [orders]);

  // Cancelar (só fase pickup)
  const handleCancel = useCallback(() => {
    // TODO backend: api.post(`/orders/${activeOrder?.id}/cancel`)
    setActiveOrder(null);
    setRouteCoords([]);
    setSimDistance(0);
    setOrders(MOCK_ORDERS);
    setPhase('orders');
    bottomSheetRef.current?.snapToIndex(1);
  }, [activeOrder]);

  // Completar fase 1 (pegou a encomenda)
  const handlePickupComplete = useCallback(() => {
    if (!activeOrder) return;
    // TODO backend: api.post(`/orders/${activeOrder.id}/picked`)
    const route = buildSimRoute(activeOrder.pickupCoords, activeOrder.deliveryCoords);
    setRouteCoords(route);
    setSimDistance(activeOrder.distanceKm * 0.8);
    setPhase('delivery');
    setExpanded(false);
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [activeOrder.pickupCoords, activeOrder.deliveryCoords],
        { edgePadding: { top: 80, right: 40, bottom: snapPoints[1] + TAB_BAR_HEIGHT + 20, left: 40 }, animated: true }
      );
    }, 300);
  }, [activeOrder, snapPoints]);

  // Completar fase 2 (entregou)
  const handleDeliveryComplete = useCallback(() => {
    if (!activeOrder) return;
    // TODO backend: api.post(`/orders/${activeOrder.id}/delivered`)
    setPhase('rating');
    setRatingVisible(true);
  }, [activeOrder]);

  // Simular aproximação — REMOVER EM PRODUÇÃO
  const handleSimApproach = useCallback(() => {
    setSimDistance(d => parseFloat(Math.max(0, d - 0.3).toFixed(2)));
  }, []);

  // Fechar rating → reset
  const handleRatingClose = useCallback(() => {
    setRatingVisible(false);
    setActiveOrder(null);
    setRouteCoords([]);
    setSimDistance(0);
    setOrders([]);
    setIsOnline(false);
    setPhase('idle');
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  if (!location) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#CB1D00" />
        <Text style={s.loadingTxt}>{errorMsg ?? 'A obter localização...'}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* ── MAPA ── */}
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={MAP_STYLE}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Rota simulada */}
        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor="#2D60FF" strokeWidth={4} lineDashPattern={[0]} />
        )}
        {/* Marcador de recolha */}
        {activeOrder && (phase === 'pickup' || phase === 'delivery') && (
          <Marker coordinate={activeOrder.pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <PickupMarker />
          </Marker>
        )}
        {/* Marcador de entrega */}
        {activeOrder && (phase === 'pickup' || phase === 'delivery') && (
          <Marker coordinate={activeOrder.deliveryCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <DeliveryMarker />
          </Marker>
        )}
      </MapView>

      {/* ── STATUS BUTTON (centro topo) ── */}
      <TouchableOpacity
        style={[s.statusBtn, isOnline ? s.statusOn : s.statusOff]}
        onPress={handleToggleOnline}
      >
        <View style={[s.statusDot, { backgroundColor: isOnline ? '#4ade80' : '#ffffff50' }]} />
        <Text style={s.statusTxt}>{isOnline ? 'Em linha' : 'Desligado'}</Text>
      </TouchableOpacity>

      {/* ── CANCELAR (esquerda, só pickup) ── */}
      {phase === 'pickup' && (
        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Ionicons name="close" size={13} color="#fff" />
          <Text style={s.cancelTxt}>Cancelar entrega</Text>
        </TouchableOpacity>
      )}

      {/* ── DISTÂNCIA + BOTÃO SIM (direita, fases activas) ── */}
      {(phase === 'pickup' || phase === 'delivery') && (
        <View style={s.distBadge}>
          <Text style={s.distTxt}>{simDistance.toFixed(2)} km</Text>
          {/* BOTÃO DE SIMULAÇÃO — REMOVER EM PRODUÇÃO */}
          <TouchableOpacity style={s.simBtn} onPress={handleSimApproach}>
            <Text style={s.simTxt}>sim →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── BOTÃO MINHA LOCALIZAÇÃO — cola no topo do sheet ── */}
      {locBtnBottom !== null && (
        <TouchableOpacity
          style={[s.locBtn, { bottom: locBtnBottom }]}
          onPress={() => mapRef.current?.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 800)}
        >
          <Ionicons name="navigate" size={17} color="#2D60FF" />
          <Text style={s.locTxt}>A minha localização</Text>
        </TouchableOpacity>
      )}

      {/* ── BOTTOM SHEET ── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
        onChange={setSnapIndex}
        style={{ marginBottom: TAB_BAR_HEIGHT }}
      >
        <BottomSheetScrollView
          style={s.sheetContent}
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >

          {/* IDLE */}
          {phase === 'idle' && (
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Ionicons name="wallet-outline" size={20} color="#85D5EB" />
                <Text style={s.statLabel}>Rendimento hoje</Text>
                <Text style={s.statValue}>12 000,00 Kz</Text>
              </View>
              <View style={s.statCard}>
                <Ionicons name="flag-outline" size={20} color="#85D5EB" />
                <Text style={s.statLabel}>Objectivo</Text>
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: '45%' }]} />
                </View>
                <Text style={s.progressTxt}>9 de 20 entregas</Text>
              </View>
            </View>
          )}

          {/* ORDERS */}
          {phase === 'orders' && (
            <>
              <Text style={s.sectionTitle}>
                {orders.length} {orders.length === 1 ? 'pedido disponível' : 'pedidos disponíveis'}
              </Text>
              {orders.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  isOnline={isOnline}
                  onAccept={price => handleAccept(o, price)}
                  onIgnore={() => handleIgnore(o.id)}
                />
              ))}
              {orders.length === 0 && (
                <Text style={s.emptyTxt}>Nenhum pedido. Aguarda...</Text>
              )}
            </>
          )}

          {/* PICKUP */}
          {phase === 'pickup' && activeOrder && (
            <PhaseContent
              phaseNum={1}
              order={activeOrder}
              simDistance={simDistance}
              expanded={expanded}
              onToggle={() => setExpanded(e => !e)}
              onComplete={handlePickupComplete}
            />
          )}

          {/* DELIVERY */}
          {phase === 'delivery' && activeOrder && (
            <PhaseContent
              phaseNum={2}
              order={activeOrder}
              simDistance={simDistance}
              expanded={expanded}
              onToggle={() => setExpanded(e => !e)}
              onComplete={handleDeliveryComplete}
            />
          )}

        </BottomSheetScrollView>
      </BottomSheet>

      {/* RATING */}
      <RatingModal visible={ratingVisible} onClose={handleRatingClose} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sw = StyleSheet.create({
  track: {
    height: 58, borderRadius: 29,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 0,
  },
  label: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  checkIcon: {
    position: 'absolute',
    right: 18,
  },
  handle: {
    position: 'absolute',
    left: 4,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000085', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1F2933',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 28, paddingBottom: 44, alignItems: 'center',
  },
  handle: { width: 40, height: 4, backgroundColor: '#ffffff30', borderRadius: 2, marginBottom: 22, alignSelf: 'center' },
  avatar: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#2D60FF12', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#2D60FF30',
  },
  title: { fontSize: 19, color: '#fff', fontFamily: 'Poppins_700Bold', marginBottom: 6 },
  sub: { fontSize: 13, color: '#9ca3af', fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 24 },
  stars: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  btn: { width: '100%', backgroundColor: '#CB1D00', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#CB1D0050' },
  btnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
});

const oc = StyleSheet.create({
  card: { backgroundColor: '#253040', borderRadius: 20, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#CB1D0015', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#CB1D0030',
  },
  name: { fontSize: 14, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  dist: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginTop: 1 },
  ignoreBtn: { backgroundColor: '#303E4D', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8 },
  ignoreTxt: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  route: { gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  routeTxt: { flex: 1, fontSize: 13, color: '#c5cdd6', fontFamily: 'Poppins_400Regular' },
  routeConnector: { width: 2, height: 10, backgroundColor: '#ffffff20', marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#ffffff08', marginVertical: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  priceBtn: { backgroundColor: '#303E4D', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  priceBtnTxt: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 13 },
  priceVal: { fontSize: 20, color: '#fff', fontFamily: 'Poppins_700Bold' },
  acceptBtn: { backgroundColor: '#2D60FF', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  acceptBtnDisabled: { backgroundColor: '#2D60FF40' },
  acceptTxt: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});

const ph = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  badge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#CB1D00', alignItems: 'center', justifyContent: 'center',
  },
  badgeNum: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 14 },
  phaseLabel: { flex: 1, fontSize: 15, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  timer: { fontSize: 17, color: '#fff', fontFamily: 'Poppins_700Bold' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  toggleTxt: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  addr: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginBottom: 10 },
  actions: { gap: 10, marginTop: 8 },
  altRoute: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#253040', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  altRouteTxt: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  grid: { flexDirection: 'row', gap: 8 },
  gridCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 8 },
  gridLabel: { fontSize: 12, color: '#fff', fontFamily: 'Poppins_500Medium' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2933' },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2933', gap: 12 },
  loadingTxt: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 14 },

  statusBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -58 }],
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 22, gap: 8, elevation: 8, zIndex: 10,
  },
  statusOn: { backgroundColor: '#162312' },
  statusOff: { backgroundColor: '#1F2933' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 13 },

  cancelBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1F2933', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 9,
    elevation: 6, zIndex: 10,
  },
  cancelTxt: { color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 12 },

  distBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1F2933', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    elevation: 6, zIndex: 10,
  },
  distTxt: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  simBtn: { backgroundColor: '#CB1D00', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  simTxt: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_500Medium' },

  locBtn: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1F2933',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 22, gap: 8,
    elevation: 8, zIndex: 20,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
  },
  locTxt: { color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 13 },

  sheetBg: { backgroundColor: '#1F2933', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  sheetHandle: { backgroundColor: '#ffffff30', width: 40 },
  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  sectionTitle: { fontSize: 14, color: '#fff', fontFamily: 'Poppins_600SemiBold', marginBottom: 14 },
  emptyTxt: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 20 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statCard: { flex: 1, backgroundColor: '#253040', borderRadius: 18, padding: 16, gap: 6 },
  statLabel: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  statValue: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  progressBar: { height: 6, backgroundColor: '#ffffff20', borderRadius: 3, marginTop: 4 },
  progressFill: { height: 6, backgroundColor: '#CB1D00', borderRadius: 3 },
  progressTxt: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 11, textAlign: 'right' },
});
