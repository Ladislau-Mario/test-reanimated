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
  FlatList,
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

// Estado do estafeta (para o backend saber em que fase está)
type DeliverStatus = 'offline' | 'online' | 'pickup' | 'delivering';

type DeliveryOrder = {
  id: string;
  clientName: string;
  clientPhone: string;
  pickupAddress: string;
  pickupCoords: LatLng;
  deliveryAddress: string;
  deliveryCoords: LatLng;
  distanceKm: number;
  basePrice: number;
  timeoutSeconds: number;
  packageType: string;
};

type DeliverPhase = 'idle' | 'orders' | 'pickup' | 'delivery' | 'rating';

// ─── Mock (backend substituirá via api.get('/orders/available')) ──────────────

const MOCK_ORDERS: DeliveryOrder[] = [
  {
    id: 'ord_001',
    clientName: 'Ladislau Mário',
    clientPhone: '+244 923 456 789',
    pickupAddress: 'Talatona, Luanda Sul',
    pickupCoords: { latitude: -8.9150, longitude: 13.1820 },
    deliveryAddress: 'Kilamba, Luanda',
    deliveryCoords: { latitude: -8.9800, longitude: 13.2200 },
    distanceKm: 1.80,
    basePrice: 1800,
    timeoutSeconds: 40,
    packageType: 'Documento',
  },
  {
    id: 'ord_002',
    clientName: 'Ana Ferreira',
    clientPhone: '+244 912 345 678',
    pickupAddress: 'Viana, Luanda',
    pickupCoords: { latitude: -8.9050, longitude: 13.3700 },
    deliveryAddress: 'Miramar, Luanda',
    deliveryCoords: { latitude: -8.8200, longitude: 13.2300 },
    distanceKm: 4.20,
    basePrice: 2500,
    timeoutSeconds: 40,
    packageType: 'Comida',
  },
  {
    id: 'ord_003',
    clientName: 'Carlos Bento',
    clientPhone: '+244 934 567 890',
    pickupAddress: 'Cazenga, Luanda',
    pickupCoords: { latitude: -8.8350, longitude: 13.2850 },
    deliveryAddress: 'Rangel, Luanda',
    deliveryCoords: { latitude: -8.8150, longitude: 13.2700 },
    distanceKm: 2.30,
    basePrice: 2000,
    timeoutSeconds: 40,
    packageType: 'Roupa',
  },
];

// ─── Rota simulada (interpolação linear) ─────────────────────────────────────

function buildSimRoute(from: LatLng, to: LatLng, steps = 14): LatLng[] {
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

// ─── Label do estado do estafeta ─────────────────────────────────────────────

function getStatusLabel(phase: DeliverPhase, isOnline: boolean): string {
  if (!isOnline) return 'Desligado';
  if (phase === 'orders' || phase === 'idle') return 'Em linha';
  if (phase === 'pickup') return 'A caminho';
  if (phase === 'delivery') return 'A entregar';
  return 'Em linha';
}

function getStatusColor(phase: DeliverPhase, isOnline: boolean): string {
  if (!isOnline) return '#ffffff40';
  if (phase === 'pickup') return '#f59e0b';
  if (phase === 'delivery') return '#CB1D00';
  return '#4ade80';
}

// ─── Marcadores ───────────────────────────────────────────────────────────────

function PickupMarker() {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: '#FF2D55', borderWidth: 3, borderColor: '#fff',
        elevation: 6,
      }} />
    </View>
  );
}

function DeliveryMarker() {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: '#2D60FF', borderWidth: 3, borderColor: '#fff',
        elevation: 6,
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
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <View style={{ alignItems: 'flex-end', gap: 4 }}>
      <Text style={{ color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 }}>
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </Text>
      <View style={{ width: 56, height: 3, backgroundColor: '#ffffff20', borderRadius: 2, overflow: 'hidden' }}>
        <Animated.View style={{ height: 3, backgroundColor: '#CB1D00', borderRadius: 2, width: barWidth }} />
      </View>
    </View>
  );
}

// ─── Swipe to complete ────────────────────────────────────────────────────────
// Estilo: handle branco com seta, fundo vermelho escuro, "Completar" centrado, ✓ à direita

function SwipeComplete({ onComplete }: { onComplete: () => void }) {
  const HANDLE_W = 52;
  const TRACK_W = SCREEN_WIDTH - 40;
  const MAX_X = TRACK_W - HANDLE_W - 8;

  const tx = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const bgColor = tx.interpolate({
    inputRange: [0, MAX_X],
    outputRange: ['#9B1500', '#9B1500'],
    extrapolate: 'clamp',
  });
  const checkOpacity = tx.interpolate({
    inputRange: [MAX_X * 0.55, MAX_X],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const labelOpacity = tx.interpolate({
    inputRange: [0, MAX_X * 0.3],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      tx.setValue(Math.max(0, Math.min(g.dx, MAX_X)));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx >= MAX_X * 0.72 && !done.current) {
        done.current = true;
        Animated.timing(tx, { toValue: MAX_X, duration: 110, useNativeDriver: true }).start(() => onComplete());
      } else {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
      }
    },
  })).current;

  return (
    <Animated.View style={[sw.track, { backgroundColor: bgColor }]}>
      <Animated.Text style={[sw.label, { opacity: labelOpacity }]}>Completar</Animated.Text>
      <Animated.View style={[sw.checkWrap, { opacity: checkOpacity }]}>
        <Ionicons name="checkmark" size={20} color="#ffffff80" />
      </Animated.View>
      <Animated.View style={[sw.handle, { transform: [{ translateX: tx }] }]} {...pan.panHandlers}>
        <Ionicons name="arrow-forward" size={22} color="#CB1D00" />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Rating modal (sofisticado, fullscreen modal) ─────────────────────────────

function RatingModal({ visible, clientName, onClose }: {
  visible: boolean;
  clientName: string;
  onClose: (rating: number) => void;
}) {
  const [stars, setStars] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 6 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      setStars(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(stars)}>
      <Animated.View style={[rmx.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[rmx.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Ícone de sucesso */}
          <View style={rmx.successRing}>
            <View style={rmx.successInner}>
              <Ionicons name="checkmark" size={36} color="#CB1D00" />
            </View>
          </View>

          <Text style={rmx.title}>Entrega concluída!</Text>
          <Text style={rmx.sub}>
            Como foi a experiência{'\n'}com <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold' }}>{clientName}</Text>?
          </Text>

          {/* Estrelas */}
          <View style={rmx.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => setStars(s)} activeOpacity={0.7}>
                <Animated.View>
                  <Ionicons
                    name={s <= stars ? 'star' : 'star-outline'}
                    size={40}
                    color={s <= stars ? '#f59e0b' : '#ffffff20'}
                  />
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>

          {stars > 0 && (
            <Text style={rmx.ratingLabel}>
              {stars === 1 ? 'Muito mau' : stars === 2 ? 'Mau' : stars === 3 ? 'Razoável' : stars === 4 ? 'Bom' : 'Excelente!'}
            </Text>
          )}

          {/* Ganho desta entrega */}
          <View style={rmx.earningCard}>
            <Text style={rmx.earningLabel}>Ganhou nesta entrega</Text>
            <Text style={rmx.earningValue}>1 800 Kz</Text>
          </View>

          <TouchableOpacity
            style={[rmx.btn, !stars && rmx.btnDisabled]}
            disabled={!stars}
            onPress={() => onClose(stars)}
            activeOpacity={0.85}
          >
            <Text style={rmx.btnTxt}>Confirmar</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onClose(0)} style={{ marginTop: 14 }}>
            <Text style={rmx.skip}>Saltar</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Order card (scroll horizontal, estilo sofisticado) ──────────────────────

const ORDER_CARD_WIDTH = SCREEN_WIDTH * 0.82;

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
  const MIN = Math.max(500, order.basePrice - 600);

  return (
    <View style={oc.card}>
      {/* Header */}
      <View style={oc.header}>
        <View style={oc.avatarWrap}>
          <Ionicons name="person" size={18} color="#CB1D00" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={oc.name}>{order.clientName}</Text>
          <View style={oc.metaRow}>
            <View style={oc.tag}>
              <Text style={oc.tagTxt}>{order.packageType}</Text>
            </View>
            <Text style={oc.dist}>{order.distanceKm.toFixed(2)} km</Text>
          </View>
        </View>
        <CountdownTimer seconds={order.timeoutSeconds} onExpire={onIgnore} />
      </View>

      {/* Rota */}
      <View style={oc.routeBlock}>
        <View style={oc.routeRow}>
          <View style={oc.routeDot}>
            <View style={[oc.dot, { backgroundColor: '#2D60FF' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={oc.routeLabel}>Recolha</Text>
            <Text style={oc.routeAddr} numberOfLines={1}>{order.pickupAddress}</Text>
          </View>
        </View>
        <View style={oc.connector}>
          <View style={oc.connectorLine} />
        </View>
        <View style={oc.routeRow}>
          <View style={oc.routeDot}>
            <View style={[oc.dot, { backgroundColor: '#FF2D55' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={oc.routeLabel}>Entrega</Text>
            <Text style={oc.routeAddr} numberOfLines={1}>{order.deliveryAddress}</Text>
          </View>
        </View>
      </View>

      <View style={oc.divider} />

      {/* Preço */}
      <View style={oc.priceRow}>
        <TouchableOpacity style={oc.priceBtn} onPress={() => setPrice(p => Math.max(MIN, p - 200))}>
          <Text style={oc.priceBtnTxt}>−200</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={oc.priceVal}>{price.toLocaleString('pt-AO')} Kz</Text>
          <Text style={oc.priceHint}>Valor acordado</Text>
        </View>
        <TouchableOpacity style={oc.priceBtn} onPress={() => setPrice(p => p + 200)}>
          <Text style={oc.priceBtnTxt}>+200</Text>
        </TouchableOpacity>
      </View>

      {/* Acções */}
      <View style={oc.actions}>
        <TouchableOpacity style={oc.ignoreBtn} onPress={onIgnore}>
          <Text style={oc.ignoreTxt}>Ignorar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[oc.acceptBtn, !isOnline && oc.acceptBtnOff]}
          disabled={!isOnline}
          onPress={() => isOnline && onAccept(price)}
          activeOpacity={0.85}
        >
          <Text style={oc.acceptTxt}>Aceitar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Phase content ────────────────────────────────────────────────────────────

function PhaseContent({
  phaseNum,
  order,
  expanded,
  onToggle,
  onComplete,
}: {
  phaseNum: 1 | 2;
  order: DeliveryOrder;
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
  const label = phaseNum === 1 ? 'Pegar encomenda' : 'Destino';
  const addr = phaseNum === 1 ? order.pickupAddress : order.deliveryAddress;

  return (
    <View>
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

      <View style={{ marginTop: 16 }}>
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
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [simDistance, setSimDistance] = useState(0);
  const [snapIndex, setSnapIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [ratingVisible, setRatingVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);

  const snapPoints = useMemo(() => {
    const avail = SCREEN_HEIGHT - TAB_BAR_HEIGHT;
    return [
      Math.round(avail * 0.20),
      Math.round(avail * 0.50),
      Math.round(avail * 0.80),
    ];
  }, []);

  // Botão localização: cola ao topo do sheet, some no snap alto (index 2)
  const locBtnBottom = useMemo(() => {
    if (snapIndex === 0) return snapPoints[0] + TAB_BAR_HEIGHT + 12;
    if (snapIndex === 1) return snapPoints[1] + TAB_BAR_HEIGHT + 12;
    return null;
  }, [snapIndex, snapPoints]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Permissão negada'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  const handleToggleOnline = useCallback(() => {
    // Não pode desligar a meio de entrega
    if (phase === 'pickup' || phase === 'delivery') return;
    const next = !isOnline;
    setIsOnline(next);
    if (next) {
      // TODO backend: api.get('/orders/available').then(r => setOrders(r.data))
      setTimeout(() => {
        setOrders(MOCK_ORDERS);
        setPhase('orders');
        bottomSheetRef.current?.snapToIndex(1);
      }, 600);
    } else {
      setPhase('idle');
      setOrders([]);
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [isOnline, phase]);

  const handleAccept = useCallback((order: DeliveryOrder, price: number) => {
    if (!isOnline) return;
    // TODO backend: api.post(`/orders/${order.id}/accept`, { agreedPrice: price })
    // Estado para backend: 'pickup'
    setActiveOrder(order);
    setSimDistance(order.distanceKm);
    const from = location
      ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
      : order.pickupCoords;
    setRouteCoords(buildSimRoute(from, order.pickupCoords));
    setPhase('pickup');
    setExpanded(false);
    bottomSheetRef.current?.snapToIndex(1);
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [order.pickupCoords, order.deliveryCoords],
        { edgePadding: { top: 80, right: 40, bottom: snapPoints[1] + TAB_BAR_HEIGHT + 30, left: 40 }, animated: true }
      );
    }, 350);
  }, [isOnline, location, snapPoints]);

  const handleIgnore = useCallback((id: string) => {
    const rest = orders.filter(o => o.id !== id);
    setOrders(rest);
    if (rest.length === 0) {
      setPhase('idle');
      setIsOnline(false);
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [orders]);

  // Cancelar (só fase pickup — ainda não pegou a encomenda)
  const handleCancel = useCallback(() => {
    // TODO backend: api.post(`/orders/${activeOrder?.id}/cancel`)
    setActiveOrder(null);
    setRouteCoords([]);
    setSimDistance(0);
    setOrders(MOCK_ORDERS);
    setPhase('orders');
    bottomSheetRef.current?.snapToIndex(1);
  }, [activeOrder]);

  // Completar fase 1: chegou ao cliente, pegou a encomenda
  // A partir daqui NÃO pode cancelar
  const handlePickupComplete = useCallback(() => {
    if (!activeOrder) return;
    // TODO backend: api.post(`/orders/${activeOrder.id}/picked`)
    // Estado para backend: 'delivering'
    setRouteCoords(buildSimRoute(activeOrder.pickupCoords, activeOrder.deliveryCoords));
    setSimDistance(activeOrder.distanceKm * 0.85);
    setPhase('delivery');
    setExpanded(false);
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [activeOrder.pickupCoords, activeOrder.deliveryCoords],
        { edgePadding: { top: 80, right: 40, bottom: snapPoints[1] + TAB_BAR_HEIGHT + 30, left: 40 }, animated: true }
      );
    }, 350);
  }, [activeOrder, snapPoints]);

  // Completar fase 2: entregou
  const handleDeliveryComplete = useCallback(() => {
    if (!activeOrder) return;
    // TODO backend: api.post(`/orders/${activeOrder.id}/delivered`)
    setPhase('rating');
    setRatingVisible(true);
  }, [activeOrder]);

  // Simulação — REMOVER EM PRODUÇÃO
  const handleSim = useCallback(() => {
    setSimDistance(d => parseFloat(Math.max(0, d - 0.3).toFixed(2)));
  }, []);

  const handleRatingClose = useCallback((rating: number) => {
    // TODO backend: api.post(`/orders/${activeOrder?.id}/rate`, { rating })
    setRatingVisible(false);
    setActiveOrder(null);
    setRouteCoords([]);
    setSimDistance(0);
    setOrders([]);
    setIsOnline(false);
    setPhase('idle');
    bottomSheetRef.current?.snapToIndex(0);
  }, [activeOrder]);

  const statusLabel = getStatusLabel(phase, isOnline);
  const statusColor = getStatusColor(phase, isOnline);
  const statusBg = !isOnline ? '#1F2933'
    : phase === 'pickup' ? '#2a1f00'
    : phase === 'delivery' ? '#1a0a00'
    : '#0d1f0d';

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
        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor="#2D60FF" strokeWidth={4} />
        )}
        {activeOrder && (phase === 'pickup' || phase === 'delivery') && (
          <>
            <Marker coordinate={activeOrder.pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <PickupMarker />
            </Marker>
            <Marker coordinate={activeOrder.deliveryCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <DeliveryMarker />
            </Marker>
          </>
        )}
      </MapView>

      {/* ── STATUS BUTTON ── */}
      <TouchableOpacity
        style={[s.statusBtn, { backgroundColor: statusBg }]}
        onPress={handleToggleOnline}
      >
        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        <Text style={s.statusTxt}>{statusLabel}</Text>
      </TouchableOpacity>

      {/* ── CANCELAR (só pickup) ── */}
      {phase === 'pickup' && (
        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Ionicons name="close" size={13} color="#fff" />
          <Text style={s.cancelTxt}>Cancelar entrega</Text>
        </TouchableOpacity>
      )}

      {/* ── DISTÂNCIA + SIM (pickup e delivery) ── */}
      {(phase === 'pickup' || phase === 'delivery') && (
        <View style={s.distBadge}>
          <Text style={s.distTxt}>{simDistance.toFixed(2)} km</Text>
          {/* REMOVER EM PRODUÇÃO */}
          <TouchableOpacity style={s.simBtn} onPress={handleSim}>
            <Text style={s.simTxt}>sim →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── BOTÃO LOCALIZAÇÃO — cola no topo do sheet, some no snap alto ── */}
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
          <Ionicons name="navigate" size={16} color="#2D60FF" />
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

          {/* ORDERS — scroll horizontal */}
          {phase === 'orders' && (
            <View>
              <View style={s.ordersHeader}>
                <Text style={s.sectionTitle}>
                  {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} disponíveis
                </Text>
                {orders.length > 1 && (
                  <Text style={s.scrollHint}>Desliza →</Text>
                )}
              </View>
              <FlatList
                data={orders}
                keyExtractor={o => o.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ORDER_CARD_WIDTH + 12}
                decelerationRate="fast"
                contentContainerStyle={{ paddingRight: 20 }}
                renderItem={({ item }) => (
                  <View style={{ width: ORDER_CARD_WIDTH, marginRight: 12 }}>
                    <OrderCard
                      order={item}
                      isOnline={isOnline}
                      onAccept={price => handleAccept(item, price)}
                      onIgnore={() => handleIgnore(item.id)}
                    />
                  </View>
                )}
              />
            </View>
          )}

          {/* PICKUP */}
          {phase === 'pickup' && activeOrder && (
            <PhaseContent
              phaseNum={1}
              order={activeOrder}
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
              expanded={expanded}
              onToggle={() => setExpanded(e => !e)}
              onComplete={handleDeliveryComplete}
            />
          )}

        </BottomSheetScrollView>
      </BottomSheet>

      {/* RATING MODAL */}
      <RatingModal
        visible={ratingVisible}
        clientName={activeOrder?.clientName ?? 'cliente'}
        onClose={handleRatingClose}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sw = StyleSheet.create({
  track: {
    height: 58, borderRadius: 29,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden',
    position: 'relative',
  },
  label: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  checkWrap: { position: 'absolute', right: 20 },
  handle: {
    position: 'absolute', left: 4,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
});

const rmx = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#000000CC',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    width: '100%', backgroundColor: '#1F2933',
    borderRadius: 28, padding: 28, alignItems: 'center',
  },
  successRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#CB1D0018',
    borderWidth: 2, borderColor: '#CB1D0040',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  successInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#CB1D0025',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, color: '#fff', fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  sub: { fontSize: 14, color: '#9ca3af', fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ratingLabel: { fontSize: 13, color: '#f59e0b', fontFamily: 'Poppins_500Medium', marginBottom: 20 },
  earningCard: {
    width: '100%', backgroundColor: '#253040',
    borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 24,
  },
  earningLabel: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginBottom: 4 },
  earningValue: { fontSize: 22, color: '#CB1D00', fontFamily: 'Poppins_700Bold' },
  btn: {
    width: '100%', backgroundColor: '#CB1D00',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#CB1D0045' },
  btnTxt: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  skip: { color: '#ffffff30', fontFamily: 'Poppins_400Regular', fontSize: 13 },
});

const oc = StyleSheet.create({
  card: {
    backgroundColor: '#253040', borderRadius: 22,
    padding: 18, overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#CB1D0015',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#CB1D0030',
  },
  name: { fontSize: 15, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  tag: { backgroundColor: '#CB1D0020', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagTxt: { fontSize: 10, color: '#CB1D00', fontFamily: 'Poppins_500Medium' },
  dist: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },

  routeBlock: { gap: 0, marginBottom: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot: { width: 20, alignItems: 'center', paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLabel: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  routeAddr: { fontSize: 13, color: '#e2e8f0', fontFamily: 'Poppins_500Medium', marginTop: 1 },
  connector: { paddingLeft: 9, paddingVertical: 3 },
  connectorLine: { width: 2, height: 14, backgroundColor: '#ffffff15', borderRadius: 1 },

  divider: { height: 1, backgroundColor: '#ffffff08', marginVertical: 14 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  priceBtn: { backgroundColor: '#1F2933', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#ffffff10' },
  priceBtnTxt: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  priceVal: { fontSize: 22, color: '#fff', fontFamily: 'Poppins_700Bold' },
  priceHint: { fontSize: 10, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 10 },
  ignoreBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1, borderColor: '#ffffff12',
    backgroundColor: '#1F2933',
  },
  ignoreTxt: { color: '#9ca3af', fontFamily: 'Poppins_500Medium', fontSize: 14 },
  acceptBtn: { flex: 2, backgroundColor: '#2D60FF', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  acceptBtnOff: { backgroundColor: '#2D60FF40' },
  acceptTxt: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});

const ph = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#CB1D00', alignItems: 'center', justifyContent: 'center' },
  badgeNum: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 14 },
  phaseLabel: { flex: 1, fontSize: 15, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  timer: { fontSize: 17, color: '#fff', fontFamily: 'Poppins_700Bold' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  toggleTxt: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  addr: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginBottom: 10 },
  actions: { gap: 10, marginTop: 8 },
  altRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#253040', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
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
    alignSelf: 'center', left: '50%', transform: [{ translateX: -60 }],
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 22, gap: 8, elevation: 8, zIndex: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 13 },

  cancelBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1F2933', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 9,
    elevation: 6, zIndex: 10,
  },
  cancelTxt: { color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 12 },

  distBadge: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40, right: 16,
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

  ordersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 14, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  scrollHint: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  emptyTxt: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 20 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statCard: { flex: 1, backgroundColor: '#253040', borderRadius: 18, padding: 16, gap: 6 },
  statLabel: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  statValue: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  progressBar: { height: 6, backgroundColor: '#ffffff20', borderRadius: 3, marginTop: 4 },
  progressFill: { height: 6, backgroundColor: '#CB1D00', borderRadius: 3 },
  progressTxt: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 11, textAlign: 'right' },
});
