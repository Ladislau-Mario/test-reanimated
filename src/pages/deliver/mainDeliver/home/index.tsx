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
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { TAB_BAR_HEIGHT } from '../../../../components/common/curvedTabs/index';

// Quando o backend estiver pronto, descomentar:
// import axios from 'axios';
// import api from '../../../../components/modules/services/api/api';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LatLng = { latitude: number; longitude: number };

type DeliveryOrder = {
  id: string;
  clientName: string;
  clientAvatar?: string;
  pickupAddress: string;
  pickupCoords: LatLng;
  deliveryAddress: string;
  deliveryCoords: LatLng;
  distanceKm: number;
  basePrice: number; // em Kz
  timeoutSeconds: number;
};

type DeliverPhase =
  | 'idle'          // offline ou online sem pedido
  | 'orders'        // lista de pedidos disponíveis
  | 'pickup'        // a caminho do cliente (fase 1)
  | 'delivery'      // a caminho do destino (fase 2)
  | 'rating';       // modal de avaliação final

// ─── Mock de dados (backend substituirá isto) ─────────────────────────────────
// Estrutura espelha o que o backend vai enviar via api.get('/orders/available')

const MOCK_ORDERS: DeliveryOrder[] = [
  {
    id: 'ord_001',
    clientName: 'Ladislau Mário',
    pickupAddress: 'Talatona, Luanda Sul',
    pickupCoords: { latitude: -8.9150, longitude: 13.1820 },
    deliveryAddress: 'Kilamba, Luanda',
    deliveryCoords: { latitude: -8.9800, longitude: 13.2200 },
    distanceKm: 1.8,
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
    distanceKm: 4.2,
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
    distanceKm: 2.3,
    basePrice: 2000,
    timeoutSeconds: 40,
  },
];

// ─── Map style ────────────────────────────────────────────────────────────────

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
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2A3A4A' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2A3A4A' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
];

// ─── Marcadores personalizados ────────────────────────────────────────────────

function PickupPin() {
  return (
    <View style={mk.wrapper}>
      <View style={[mk.circle, { backgroundColor: '#FF2D55', borderColor: '#fff' }]} />
    </View>
  );
}

function DeliveryPin() {
  return (
    <View style={mk.wrapper}>
      <View style={[mk.circle, { backgroundColor: '#2D60FF', borderColor: '#fff' }]} />
    </View>
  );
}

// ─── Timer countdown ──────────────────────────────────────────────────────────

function CountdownTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: seconds * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(interval); onExpire(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={cd.container}>
      <Text style={cd.num}>{String(remaining).padStart(2, '0')}s</Text>
      <View style={cd.bar}>
        <Animated.View style={[cd.fill, { width }]} />
      </View>
    </View>
  );
}

// ─── Swipe-to-complete button ─────────────────────────────────────────────────

function SwipeComplete({ onComplete, label = 'Completar' }: { onComplete: () => void; label?: string }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const trackWidth = SCREEN_WIDTH - 40 - 32 - 56; // padding + track padding + handle
  const completed = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        const x = Math.max(0, Math.min(g.dx, trackWidth));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx >= trackWidth * 0.75 && !completed.current) {
          completed.current = true;
          Animated.timing(translateX, { toValue: trackWidth, duration: 150, useNativeDriver: true }).start(() => {
            onComplete();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const bg = translateX.interpolate({
    inputRange: [0, trackWidth],
    outputRange: ['#CB1D00', '#16a34a'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[sc.track, { backgroundColor: bg }]}>
      <Text style={sc.label}>{label}</Text>
      <Animated.View style={[sc.handle, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <Ionicons name="checkmark" size={22} color="#CB1D00" />
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
            <Ionicons name="person" size={36} color="#2D60FF" />
          </View>
          <Text style={rm.title}>Entrega concluída!</Text>
          <Text style={rm.sub}>Como foi a experiência com este cliente?</Text>
          <View style={rm.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setStars(s)}>
                <Ionicons
                  name={s <= stars ? 'star' : 'star-outline'}
                  size={36}
                  color={s <= stars ? '#f59e0b' : '#ffffff30'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[rm.btn, stars === 0 && rm.btnDisabled]}
            disabled={stars === 0}
            onPress={onClose}
          >
            <Text style={rm.btnText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={rm.skip} onPress={onClose}>
            <Text style={rm.skipText}>Saltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  const [activeOrderPrice, setActiveOrderPrice] = useState(0);
  const [snapIndex, setSnapIndex] = useState(0);
  const [simDistance, setSimDistance] = useState(0); // km simulado até ao destino
  const [ratingVisible, setRatingVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);

  const snapPoints = useMemo(() => {
    // Baixo, médio — nunca cobrimos tudo (sem snap alto aqui)
    const snap1 = Math.round((SCREEN_HEIGHT - TAB_BAR_HEIGHT) * 0.22);
    const snap2 = Math.round((SCREEN_HEIGHT - TAB_BAR_HEIGHT) * 0.50);
    return [snap1, snap2];
  }, []);

  // Botão de localização acompanha o sheet
  const locationBtnBottom = snapIndex === 0
    ? snapPoints[0] + TAB_BAR_HEIGHT + 12
    : snapPoints[1] + TAB_BAR_HEIGHT + 12;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Permissão negada'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  // Quando fica online, carrega pedidos disponíveis
  // Backend: api.get('/orders/available') → substituir MOCK_ORDERS
  const handleToggleOnline = useCallback(() => {
    const next = !isOnline;
    setIsOnline(next);
    if (next) {
      // TODO backend: api.get('/orders/available').then(r => setOrders(r.data))
      setTimeout(() => {
        setOrders(MOCK_ORDERS);
        setPhase('orders');
        bottomSheetRef.current?.snapToIndex(1);
      }, 1500);
    } else {
      setPhase('idle');
      setOrders([]);
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [isOnline]);

  // Aceitar pedido
  // Backend: api.post('/orders/:id/accept')
  const handleAcceptOrder = useCallback((order: DeliveryOrder, price: number) => {
    // TODO backend: api.post(`/orders/${order.id}/accept`, { agreedPrice: price })
    setActiveOrder(order);
    setActiveOrderPrice(price);
    setSimDistance(order.distanceKm);
    setPhase('pickup');
    bottomSheetRef.current?.snapToIndex(1);
    mapRef.current?.fitToCoordinates(
      [order.pickupCoords, order.deliveryCoords],
      { edgePadding: { top: 80, right: 40, bottom: snapPoints[1] + TAB_BAR_HEIGHT + 20, left: 40 }, animated: true }
    );
  }, [snapPoints]);

  // Ignorar pedido (timeout ou manual)
  const handleIgnoreOrder = useCallback((orderId: string) => {
    const remaining = orders.filter(o => o.id !== orderId);
    setOrders(remaining);
    if (remaining.length === 0) {
      setPhase('idle');
      setIsOnline(false);
    }
  }, [orders]);

  // Completar fase 1 (chegou ao cliente / pegou a encomenda)
  // Backend: api.post('/orders/:id/picked')
  const handlePickupComplete = useCallback(() => {
    if (!activeOrder) return;
    // TODO backend: api.post(`/orders/${activeOrder.id}/picked`)
    setSimDistance(activeOrder.distanceKm * 0.8); // reset para distância ao destino
    setPhase('delivery');
  }, [activeOrder]);

  // Completar fase 2 (entregou)
  // Backend: api.post('/orders/:id/delivered')
  const handleDeliveryComplete = useCallback(() => {
    if (!activeOrder) return;
    // TODO backend: api.post(`/orders/${activeOrder.id}/delivered`)
    setPhase('rating');
  }, [activeOrder]);

  // Cancelar entrega (só na fase pickup)
  // Backend: api.post('/orders/:id/cancel')
  const handleCancel = useCallback(() => {
    if (!activeOrder) return;
    // TODO backend: api.post(`/orders/${activeOrder.id}/cancel`)
    setActiveOrder(null);
    setPhase('orders');
    setOrders(MOCK_ORDERS);
  }, [activeOrder]);

  // Simulação de aproximação (botão dev — remove em produção)
  const handleSimApproach = useCallback(() => {
    setSimDistance(d => Math.max(0, parseFloat((d - 0.3).toFixed(1))));
  }, []);

  // Fechamento do rating → reset
  const handleRatingClose = useCallback(() => {
    setRatingVisible(false);
    setActiveOrder(null);
    setActiveOrderPrice(0);
    setSimDistance(0);
    setPhase('idle');
    setIsOnline(false);
    setOrders([]);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  useEffect(() => {
    if (phase === 'rating') setRatingVisible(true);
  }, [phase]);

  if (!location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#CB1D00" />
        <Text style={styles.loadingText}>{errorMsg ?? 'A obter localização...'}</Text>
      </View>
    );
  }

  const showLocationBtn = snapIndex < 2; // sempre visível nos snaps baixo e médio

  return (
    <View style={styles.container}>
      {/* ── MAPA ── */}
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
        {activeOrder && (phase === 'pickup' || phase === 'delivery') && (
          <>
            <Marker coordinate={activeOrder.pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <PickupPin />
            </Marker>
            <Marker coordinate={activeOrder.deliveryCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <DeliveryPin />
            </Marker>
          </>
        )}
      </MapView>

      {/* ── STATUS BUTTON ── */}
      <TouchableOpacity
        style={[styles.statusButton, isOnline ? styles.statusOnline : styles.statusOffline]}
        onPress={handleToggleOnline}
        disabled={phase !== 'idle' && phase !== 'orders'}
      >
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4ade80' : '#ffffff50' }]} />
        <Text style={styles.statusText}>{isOnline ? 'Em linha' : 'Desligado'}</Text>
      </TouchableOpacity>

      {/* ── CANCELAR (só fase pickup) ── */}
      {phase === 'pickup' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Ionicons name="close" size={14} color="#fff" />
          <Text style={styles.cancelBtnText}>Cancelar entrega</Text>
        </TouchableOpacity>
      )}

      {/* ── DISTÂNCIA NO MAPA (fases pickup e delivery) ── */}
      {(phase === 'pickup' || phase === 'delivery') && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>{simDistance.toFixed(2)} km</Text>
          {/* Botão de simulação — REMOVER EM PRODUÇÃO */}
          <TouchableOpacity style={styles.simBtn} onPress={handleSimApproach}>
            <Text style={styles.simBtnText}>→ sim</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── BOTÃO MINHA LOCALIZAÇÃO — acompanha sheet ── */}
      {showLocationBtn && (
        <TouchableOpacity
          style={[styles.locationButton, { bottom: locationBtnBottom }]}
          onPress={() => mapRef.current?.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 800)}
        >
          <Ionicons name="navigate" size={18} color="#2D60FF" />
          <Text style={styles.locationText}>A minha localização</Text>
        </TouchableOpacity>
      )}

      {/* ── BOTTOM SHEET ── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        onChange={setSnapIndex}
        style={{ marginBottom: TAB_BAR_HEIGHT }}
      >
        <BottomSheetScrollView
          style={styles.sheetContent}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ══ IDLE / ONLINE (sem pedidos) ══ */}
          {(phase === 'idle') && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="wallet-outline" size={20} color="#85D5EB" />
                <Text style={styles.statLabel}>Rendimento hoje</Text>
                <Text style={styles.statValue}>12 000,00 Kz</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="flag-outline" size={20} color="#85D5EB" />
                <Text style={styles.statLabel}>Objectivo</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '45%' }]} />
                </View>
                <Text style={styles.progressText}>9 de 20 entregas</Text>
              </View>
            </View>
          )}

          {/* ══ LISTA DE PEDIDOS ══ */}
          {phase === 'orders' && (
            <>
              <Text style={styles.sectionTitle}>Pedidos disponíveis</Text>
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={(price) => handleAcceptOrder(order, price)}
                  onIgnore={() => handleIgnoreOrder(order.id)}
                />
              ))}
              {orders.length === 0 && (
                <Text style={styles.emptyText}>Nenhum pedido disponível. Aguarda...</Text>
              )}
            </>
          )}

          {/* ══ FASE 1: PICKUP ══ */}
          {phase === 'pickup' && activeOrder && (
            <DeliveryPhaseCard
              phaseNum={1}
              phaseLabel="Pegar encomenda"
              order={activeOrder}
              simDistance={simDistance}
              onComplete={handlePickupComplete}
            />
          )}

          {/* ══ FASE 2: DELIVERY ══ */}
          {phase === 'delivery' && activeOrder && (
            <DeliveryPhaseCard
              phaseNum={2}
              phaseLabel="Entregar encomenda"
              order={activeOrder}
              simDistance={simDistance}
              onComplete={handleDeliveryComplete}
            />
          )}

        </BottomSheetScrollView>
      </BottomSheet>

      {/* ── RATING MODAL ── */}
      <RatingModal visible={ratingVisible} onClose={handleRatingClose} />
    </View>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onAccept,
  onIgnore,
}: {
  order: DeliveryOrder;
  onAccept: (price: number) => void;
  onIgnore: () => void;
}) {
  const [price, setPrice] = useState(order.basePrice);

  return (
    <View style={oc.card}>
      {/* Header: cliente + timer */}
      <View style={oc.header}>
        <View style={oc.avatar}>
          <Ionicons name="person" size={22} color="#2D60FF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={oc.clientName}>{order.clientName}</Text>
          <Text style={oc.distText}>{order.distanceKm.toFixed(2)} km</Text>
        </View>
        <CountdownTimer seconds={order.timeoutSeconds} onExpire={onIgnore} />
        <TouchableOpacity style={oc.ignoreBtn} onPress={onIgnore}>
          <Text style={oc.ignoreBtnText}>Ignorar</Text>
        </TouchableOpacity>
      </View>

      {/* Endereços */}
      <View style={oc.route}>
        <View style={oc.routeRow}>
          <View style={[oc.dot, { backgroundColor: '#2D60FF' }]} />
          <Text style={oc.routeText} numberOfLines={1}>{order.pickupAddress}</Text>
        </View>
        <View style={oc.routeLine} />
        <View style={oc.routeRow}>
          <View style={[oc.dot, { backgroundColor: '#FF2D55' }]} />
          <Text style={oc.routeText} numberOfLines={1}>{order.deliveryAddress}</Text>
        </View>
      </View>

      <View style={oc.divider} />

      {/* Preço ajustável */}
      <View style={oc.priceRow}>
        <TouchableOpacity
          style={oc.priceBtn}
          onPress={() => setPrice(p => Math.max(order.basePrice - 600, p - 200))}
        >
          <Text style={oc.priceBtnText}>-200</Text>
        </TouchableOpacity>
        <Text style={oc.priceValue}>{price.toLocaleString('pt-AO')} Kz</Text>
        <TouchableOpacity style={oc.priceBtn} onPress={() => setPrice(p => p + 200)}>
          <Text style={oc.priceBtnText}>+200</Text>
        </TouchableOpacity>
      </View>

      {/* Aceitar */}
      <TouchableOpacity style={oc.acceptBtn} onPress={() => onAccept(price)}>
        <Text style={oc.acceptBtnText}>Aceitar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Delivery phase card ──────────────────────────────────────────────────────

function DeliveryPhaseCard({
  phaseNum,
  phaseLabel,
  order,
  simDistance,
  onComplete,
}: {
  phaseNum: 1 | 2;
  phaseLabel: string;
  order: DeliveryOrder;
  simDistance: number;
  onComplete: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const address = phaseNum === 1 ? order.pickupAddress : order.deliveryAddress;

  return (
    <View>
      {/* Header da fase */}
      <View style={dp.header}>
        <View style={dp.badge}>
          <Text style={dp.badgeNum}>{phaseNum}</Text>
        </View>
        <Text style={dp.phaseLabel}>{phaseLabel}</Text>
        <Text style={dp.timer}>{timeStr}</Text>
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={dp.toggleBtn}>
          <Text style={dp.toggleText}>{expanded ? 'Esconder' : 'Mostrar'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Endereço */}
      <Text style={dp.address} numberOfLines={1}>{address}</Text>

      {/* Acções expandidas */}
      {expanded && (
        <View style={dp.actions}>
          <TouchableOpacity style={dp.routeBtn}>
            <Text style={dp.routeBtnText}>Escolha outro caminho</Text>
            <Ionicons name="location-outline" size={14} color="#9ca3af" />
          </TouchableOpacity>
          <View style={dp.actionGrid}>
            <TouchableOpacity style={[dp.actionCard, { backgroundColor: '#f59e0b' }]}>
              <Text style={dp.actionLabel}>Chamada</Text>
              <Ionicons name="call-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[dp.actionCard, { backgroundColor: '#1F2933', borderWidth: 1, borderColor: '#ffffff15' }]}>
              <Text style={[dp.actionLabel, { color: '#9ca3af' }]}>Pausar</Text>
              <Ionicons name="pause-outline" size={22} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity style={[dp.actionCard, { backgroundColor: '#16a34a' }]}>
              <Text style={dp.actionLabel}>Chat</Text>
              <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Swipe to complete */}
      <View style={{ marginTop: 16 }}>
        <SwipeComplete
          onComplete={onComplete}
          label={phaseNum === 1 ? 'Peguei a encomenda →' : 'Entrega concluída →'}
        />
      </View>
    </View>
  );
}

// ─── StyleSheets ─────────────────────────────────────────────────────────────

const mk = StyleSheet.create({
  wrapper: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
});

const cd = StyleSheet.create({
  container: { alignItems: 'flex-end', gap: 3 },
  num: { color: '#9ca3af', fontFamily: 'Poppins_500Medium', fontSize: 12 },
  bar: { width: 48, height: 3, backgroundColor: '#ffffff15', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: '#CB1D00', borderRadius: 2 },
});

const sc = StyleSheet.create({
  track: {
    height: 56, borderRadius: 28, paddingHorizontal: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  label: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  handle: {
    position: 'absolute', left: 4,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
});

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1F2933', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 44, alignItems: 'center' },
  handle: { width: 40, height: 4, backgroundColor: '#ffffff30', borderRadius: 2, marginBottom: 20, alignSelf: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2D60FF15', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#2D60FF30' },
  title: { fontSize: 18, color: '#fff', fontFamily: 'Poppins_700Bold', marginBottom: 6 },
  sub: { fontSize: 13, color: '#9ca3af', fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 20 },
  stars: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  btn: { width: '100%', backgroundColor: '#CB1D00', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#CB1D0055' },
  btnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  skip: { marginTop: 12 },
  skipText: { color: '#ffffff40', fontFamily: 'Poppins_400Regular', fontSize: 13 },
});

const oc = StyleSheet.create({
  card: { backgroundColor: '#253040', borderRadius: 18, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2D60FF15', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2D60FF30' },
  clientName: { fontSize: 14, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  distText: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  ignoreBtn: { backgroundColor: '#303E4D', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  ignoreBtnText: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  route: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  routeText: { flex: 1, fontSize: 13, color: '#c5cdd6', fontFamily: 'Poppins_400Regular' },
  routeLine: { width: 2, height: 10, backgroundColor: '#ffffff20', marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#ffffff08', marginVertical: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  priceBtn: { backgroundColor: '#303E4D', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  priceBtnText: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 13 },
  priceValue: { fontSize: 20, color: '#fff', fontFamily: 'Poppins_700Bold' },
  acceptBtn: { backgroundColor: '#2D60FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});

const dp = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#CB1D00', alignItems: 'center', justifyContent: 'center' },
  badgeNum: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 13 },
  phaseLabel: { flex: 1, fontSize: 15, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  timer: { fontSize: 16, color: '#fff', fontFamily: 'Poppins_700Bold' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  toggleText: { fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  address: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular', marginBottom: 10 },
  actions: { gap: 10, marginTop: 10 },
  routeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#253040', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  routeBtnText: { fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins_400Regular' },
  actionGrid: { flexDirection: 'row', gap: 8 },
  actionCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8 },
  actionLabel: { fontSize: 12, color: '#fff', fontFamily: 'Poppins_500Medium' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2933' },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2933', gap: 12 },
  loadingText: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 14 },

  statusButton: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 42,
    alignSelf: 'center', left: '50%', transform: [{ translateX: -56 }],
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20, gap: 8, elevation: 8, zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  statusOnline: { backgroundColor: '#1a2e20' },
  statusOffline: { backgroundColor: '#1F2933' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#FFFFFF', fontFamily: 'Poppins_500Medium', fontSize: 13 },

  cancelBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 42, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1F2933', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 9,
    elevation: 5, zIndex: 10,
  },
  cancelBtnText: { color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 12 },

  distanceBadge: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 42, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1F2933', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    elevation: 5, zIndex: 10,
  },
  distanceBadgeText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  simBtn: { backgroundColor: '#CB1D00', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  simBtnText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_500Medium' },

  locationButton: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1F2933',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, gap: 8,
    elevation: 8, zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  locationText: { color: '#FFFFFF', fontFamily: 'Poppins_400Regular', fontSize: 13 },

  sheetBackground: { backgroundColor: '#1F2933', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetIndicator: { backgroundColor: '#ffffff30', width: 40 },
  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },

  sectionTitle: { fontSize: 14, color: '#fff', fontFamily: 'Poppins_600SemiBold', marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 20 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statCard: { flex: 1, backgroundColor: '#253040', borderRadius: 16, padding: 16, gap: 6 },
  statLabel: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  statValue: { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  progressBar: { height: 6, backgroundColor: '#ffffff20', borderRadius: 3, marginTop: 4 },
  progressFill: { height: 6, backgroundColor: '#CB1D00', borderRadius: 3 },
  progressText: { color: '#9ca3af', fontFamily: 'Poppins_400Regular', fontSize: 11, textAlign: 'right' },
});
