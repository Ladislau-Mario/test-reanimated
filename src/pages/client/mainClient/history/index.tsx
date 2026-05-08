import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { themes } from '../../../../global/themes';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface HistoryItem {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: 'confirmed' | 'cancelled';
  // Campos que virão do backend
  pickupAddress?: string;
  deliveryAddress?: string;
  price?: string;
  distanceKm?: number;
}

// ── Mock (backend: api.get('/history')) ────────────────────────────────────
const now = new Date();
const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'h1',
    title: 'Entrega confirmada',
    message: 'A tua encomenda foi entregue com sucesso em Kilamba. O estafeta João Silva concluiu a entrega.',
    date: new Date(now.getTime() - 30 * 60 * 1000),
    read: false,
    type: 'confirmed',
    pickupAddress: 'Talatona, Luanda Sul',
    deliveryAddress: 'Kilamba, Luanda',
    price: '1 800 Kz',
    distanceKm: 1.8,
  },
  {
    id: 'h2',
    title: 'Entrega cancelada',
    message: 'A entrega para Miramar foi cancelada antes da recolha. Nenhuma cobrança foi efectuada.',
    date: new Date(now.getTime() - 23 * 60 * 60 * 1000),
    read: false,
    type: 'cancelled',
    pickupAddress: 'Viana, Luanda',
    deliveryAddress: 'Miramar, Luanda',
    price: '—',
    distanceKm: 4.2,
  },
  {
    id: 'h3',
    title: 'Entrega confirmada',
    message: 'Encomenda entregue em Rangel. Avaliação do estafeta: 5 estrelas.',
    date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'confirmed',
    pickupAddress: 'Cazenga, Luanda',
    deliveryAddress: 'Rangel, Luanda',
    price: '2 000 Kz',
    distanceKm: 2.3,
  },
  {
    id: 'h4',
    title: 'Entrega cancelada',
    message: 'A entrega foi cancelada a pedido do cliente após a recolha. O valor será devolvido em 3 dias úteis.',
    date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'cancelled',
    pickupAddress: 'Samba, Luanda',
    deliveryAddress: 'Maianga, Luanda',
    price: '1 500 Kz',
    distanceKm: 3.1,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return 'ontem';
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function getTypeConfig(type: HistoryItem['type']) {
  if (type === 'confirmed') return {
    icon: 'checkmark-circle' as const,
    color: '#2D60FF',
    bg: '#2D60FF18',
    label: 'Confirmada',
    labelColor: '#2D60FF',
    labelBg: '#2D60FF15',
  };
  return {
    icon: 'close-circle' as const,
    color: '#EF4444',
    bg: '#EF444418',
    label: 'Cancelada',
    labelColor: '#EF4444',
    labelBg: '#EF444415',
  };
}

// ── Modal de detalhe ────────────────────────────────────────────────────────
function DetailModal({
  item,
  visible,
  onClose,
}: {
  item: HistoryItem;
  visible: boolean;
  onClose: () => void;
}) {
  const cfg = getTypeConfig(item.type);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          <View style={[styles.modalIconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={30} color={cfg.color} />
          </View>

          <View style={[styles.modalBadge, { backgroundColor: cfg.labelBg }]}>
            <Text style={[styles.modalBadgeTxt, { color: cfg.labelColor }]}>{cfg.label}</Text>
          </View>

          <Text style={styles.modalTitle}>{item.title}</Text>
          <Text style={styles.modalDate}>{formatDate(item.date)}</Text>

          <View style={styles.modalDivider} />

          {/* Rota */}
          {item.pickupAddress && (
            <View style={styles.modalRoute}>
              <View style={styles.modalRouteRow}>
                <View style={[styles.modalRouteDot, { backgroundColor: '#2D60FF' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalRouteLabel}>Recolha</Text>
                  <Text style={styles.modalRouteAddr}>{item.pickupAddress}</Text>
                </View>
              </View>
              <View style={styles.modalRouteConnector} />
              <View style={styles.modalRouteRow}>
                <View style={[styles.modalRouteDot, { backgroundColor: '#EF4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalRouteLabel}>Entrega</Text>
                  <Text style={styles.modalRouteAddr}>{item.deliveryAddress}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Métricas */}
          <View style={styles.modalMetrics}>
            <View style={styles.modalMetricItem}>
              <Ionicons name="navigate-outline" size={16} color="#9CA3AF" />
              <Text style={styles.modalMetricVal}>{item.distanceKm?.toFixed(1)} km</Text>
            </View>
            <View style={styles.modalMetricDivider} />
            <View style={styles.modalMetricItem}>
              <Ionicons name="wallet-outline" size={16} color="#9CA3AF" />
              <Text style={styles.modalMetricVal}>{item.price}</Text>
            </View>
          </View>

          <Text style={styles.modalMessage}>{item.message}</Text>

          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Modal de eliminar ──────────────────────────────────────────────────────
function DeleteModal({
  item,
  visible,
  onClose,
  onConfirm,
}: {
  item: HistoryItem;
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          <View style={[styles.modalIconWrap, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="trash-outline" size={28} color="#EF4444" />
          </View>
          <Text style={styles.modalTitle}>Remover do histórico?</Text>
          <Text style={styles.modalMessage}>
            Tens a certeza que queres remover "{item.title}"? Esta acção não pode ser revertida.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={onConfirm}>
              <Ionicons name="trash-outline" size={15} color="#fff" />
              <Text style={styles.modalDeleteText}>Remover</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Card de histórico ──────────────────────────────────────────────────────
function HistoryCard({
  item,
  onDelete,
}: {
  item: HistoryItem;
  onDelete: (id: string) => void;
}) {
  const [detailVisible, setDetailVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const cfg = getTypeConfig(item.type);

  return (
    <>
      <DetailModal item={item} visible={detailVisible} onClose={() => setDetailVisible(false)} />
      <DeleteModal
        item={item}
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={() => { setDeleteVisible(false); onDelete(item.id); }}
      />

      <TouchableOpacity
        style={[styles.card, item.read && styles.cardRead]}
        onPress={() => setDetailVisible(true)}
        activeOpacity={0.8}
      >
        {/* Linha lateral colorida */}
        <View style={[styles.cardStripe, { backgroundColor: cfg.color }]} />

        <View style={[styles.iconContainer, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={21} color={cfg.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.cardHeaderRight}>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
          </View>

          {/* Rota resumida */}
          {item.pickupAddress && (
            <View style={styles.cardRoute}>
              <Text style={styles.cardRouteText} numberOfLines={1}>
                {item.pickupAddress} → {item.deliveryAddress}
              </Text>
            </View>
          )}

          <Text style={styles.cardMessage} numberOfLines={1}>{item.message}</Text>

          <View style={styles.cardFooter}>
            <View style={[styles.cardBadge, { backgroundColor: cfg.labelBg }]}>
              <Text style={[styles.cardBadgeTxt, { color: cfg.labelColor }]}>{cfg.label}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2D60FF15' }]}
                onPress={() => setDetailVisible(true)}
              >
                <Ionicons name="eye-outline" size={15} color="#2D60FF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
                onPress={() => setDeleteVisible(true)}
              >
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const navigation = useNavigation<any>();

  const confirmed = history.filter(h => h.type === 'confirmed').length;
  const cancelled = history.filter(h => h.type === 'cancelled').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico</Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={() => setHistory([])}>
            <Text style={styles.clearAll}>Limpar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {/* Resumo rápido */}
      {history.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{confirmed}</Text>
            <Text style={styles.summaryLabel}>Confirmadas</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#EF4444' }]}>{cancelled}</Text>
            <Text style={styles.summaryLabel}>Canceladas</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{history.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="time-outline" size={40} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>Sem histórico</Text>
          <Text style={styles.emptySubtitle}>
            As tuas entregas anteriores vão aparecer aqui.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {history.map(item => (
            <HistoryCard key={item.id} item={item} onDelete={id => setHistory(prev => prev.filter(h => h.id !== id))} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121921' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1E2A35',
  },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  clearAll: { fontSize: 13, fontFamily: themes.fonts.poppinsMedium, color: '#EF4444', width: 50, textAlign: 'right' },

  // Resumo
  summary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    backgroundColor: '#1E2A35', borderRadius: 16, paddingVertical: 14,
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryNum: { fontSize: 20, fontFamily: themes.fonts.poppinsBold, color: '#2D60FF' },
  summaryLabel: { fontSize: 11, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280', marginTop: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: '#2D3748' },

  list: { padding: 16, gap: 10, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: '#1E2A35', borderRadius: 16,
    padding: 14, flexDirection: 'row', gap: 12,
    overflow: 'hidden',
  },
  cardRead: { opacity: 0.55 },
  cardStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  cardTitle: { flex: 1, fontSize: 13, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  cardDate: { fontSize: 11, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2D60FF' },
  cardRoute: { backgroundColor: '#ffffff08', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cardRouteText: { fontSize: 11, fontFamily: themes.fonts.poppinsRegular, color: '#9CA3AF' },
  cardMessage: { fontSize: 12, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cardBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardBadgeTxt: { fontSize: 10, fontFamily: themes.fonts.poppinsMedium },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalBox: { backgroundColor: '#1E2A35', borderRadius: 24, padding: 24, alignItems: 'center', gap: 10, width: '100%' },
  modalIconWrap: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  modalBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  modalBadgeTxt: { fontSize: 11, fontFamily: themes.fonts.poppinsMedium },
  modalTitle: { fontSize: 17, fontFamily: themes.fonts.poppinsBold, color: '#fff', textAlign: 'center' },
  modalDate: { fontSize: 12, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  modalDivider: { width: '100%', height: 1, backgroundColor: '#2D3748', marginVertical: 2 },

  modalRoute: { width: '100%', gap: 0 },
  modalRouteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modalRouteDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  modalRouteLabel: { fontSize: 10, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  modalRouteAddr: { fontSize: 13, fontFamily: themes.fonts.poppinsMedium, color: '#e2e8f0' },
  modalRouteConnector: { width: 2, height: 12, backgroundColor: '#2D3748', marginLeft: 4, marginVertical: 2 },

  modalMetrics: { flexDirection: 'row', width: '100%', backgroundColor: '#253040', borderRadius: 14, paddingVertical: 12 },
  modalMetricItem: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  modalMetricDivider: { width: 1, backgroundColor: '#2D3748' },
  modalMetricVal: { fontSize: 13, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },

  modalMessage: { fontSize: 13, fontFamily: themes.fonts.poppinsRegular, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },
  modalCloseBtn: { width: '100%', backgroundColor: '#2D60FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  modalCloseBtnText: { fontSize: 15, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },

  modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  modalCancelBtn: { flex: 1, backgroundColor: '#2D3748', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  modalDeleteBtn: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalDeleteText: { fontSize: 15, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },

  // Vazio
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E2A35', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  emptySubtitle: { fontSize: 13, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
