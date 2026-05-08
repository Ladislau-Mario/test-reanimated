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
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: 'promo' | 'system' | 'admin';
}

// ── Mock (backend: api.get('/notifications')) ──────────────────────────────
const now = new Date();
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Promoção especial 🎉',
    message: 'Tens 20% de desconto na próxima entrega. Usa o código BAZA20 até ao fim do mês. Aproveita já!',
    date: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    read: false,
    type: 'promo',
  },
  {
    id: 'n2',
    title: 'Mensagem do administrador',
    message: 'Bem-vindo ao Baza! A tua conta foi verificada com sucesso. Já podes fazer as tuas primeiras entregas. Qualquer dúvida, contacta o suporte.',
    date: new Date(now.getTime() - 26 * 60 * 60 * 1000),
    read: false,
    type: 'admin',
  },
  {
    id: 'n3',
    title: 'Actualização do sistema',
    message: 'Melhorámos a experiência de rastreamento em tempo real. Actualiza a app para teres acesso às novas funcionalidades.',
    date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'system',
  },
  {
    id: 'n4',
    title: 'Nova oferta para ti',
    message: 'Entrega grátis no próximo pedido acima de 2 000 Kz. Válido até domingo. Não percas esta oportunidade!',
    date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'promo',
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

function getTypeConfig(type: NotificationItem['type']) {
  switch (type) {
    case 'promo':  return { icon: 'gift-outline' as const,           color: '#10B981', bg: '#10B98118', label: 'Promoção',    labelColor: '#10B981' };
    case 'admin':  return { icon: 'shield-checkmark-outline' as const, color: '#F59E0B', bg: '#F59E0B18', label: 'Admin',       labelColor: '#F59E0B' };
    case 'system': return { icon: 'settings-outline' as const,       color: '#8B5CF6', bg: '#8B5CF618', label: 'Sistema',     labelColor: '#8B5CF6' };
  }
}

// ── Modal de detalhe ────────────────────────────────────────────────────────
function ViewModal({
  item,
  visible,
  onClose,
}: {
  item: NotificationItem;
  visible: boolean;
  onClose: () => void;
}) {
  const cfg = getTypeConfig(item.type);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          <View style={[styles.modalIconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={28} color={cfg.color} />
          </View>
          <Text style={styles.modalTitle}>{item.title}</Text>
          <Text style={styles.modalDate}>{formatDate(item.date)}</Text>
          <View style={styles.modalDivider} />
          <Text style={styles.modalMessage}>{item.message}</Text>
          <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: cfg.color }]} onPress={onClose}>
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
  item: NotificationItem;
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
          <Text style={styles.modalTitle}>Eliminar notificação?</Text>
          <Text style={styles.modalMessage}>
            Tens a certeza que queres eliminar "{item.title}"? Esta acção não pode ser revertida.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={onConfirm}>
              <Ionicons name="trash-outline" size={15} color="#fff" />
              <Text style={styles.modalDeleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Card de notificação ────────────────────────────────────────────────────
function NotificationCard({
  item,
  onDelete,
}: {
  item: NotificationItem;
  onDelete: (id: string) => void;
}) {
  const [viewVisible, setViewVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const cfg = getTypeConfig(item.type);

  return (
    <>
      <ViewModal item={item} visible={viewVisible} onClose={() => setViewVisible(false)} />
      <DeleteModal
        item={item}
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={() => { setDeleteVisible(false); onDelete(item.id); }}
      />

      <TouchableOpacity
        style={[styles.card, item.read && styles.cardRead]}
        onPress={() => setViewVisible(true)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardTypeBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.cardTypeTxt, { color: cfg.labelColor }]}>{cfg.label}</Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ffffff08' }]}
              onPress={() => setViewVisible(true)}
            >
              <Ionicons name="eye-outline" size={15} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
              onPress={() => setDeleteVisible(true)}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const navigation = useNavigation<any>();
  const unread = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notificações</Text>
         
        </View>

        {notifications.length > 0 ? (
          <TouchableOpacity onPress={() => setNotifications([])}>
            <Text style={styles.clearAll}>Limpar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={40} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>Sem notificações</Text>
          <Text style={styles.emptySubtitle}>
            Quando tiveres novidades, vão aparecer aqui.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {notifications.map(n => (
            <NotificationCard
              key={n.id}
              item={n}
              onDelete={id => setNotifications(prev => prev.filter(x => x.id !== id))}
            />
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  unreadBadge: { backgroundColor: '#2D60FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadBadgeTxt: { fontSize: 11, fontFamily: themes.fonts.poppinsBold, color: '#fff' },
  clearAll: { fontSize: 13, fontFamily: themes.fonts.poppinsMedium, color: '#EF4444', width: 50, textAlign: 'right' },

  list: { padding: 16, gap: 10, paddingBottom: 100 },

  // Card — sem linha lateral, ícone maior no topo, badge de tipo no header
  card: {
    backgroundColor: '#1E2A35', borderRadius: 16,
    padding: 14, flexDirection: 'row', gap: 12,
  },
  cardRead: { opacity: 0.55 },
  iconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTypeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardTypeTxt: { fontSize: 10, fontFamily: themes.fonts.poppinsMedium },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  cardDate: { fontSize: 11, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2D60FF' },
  cardTitle: { fontSize: 13, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  cardMessage: { fontSize: 12, fontFamily: themes.fonts.poppinsRegular, color: '#9CA3AF', lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalBox: { backgroundColor: '#1E2A35', borderRadius: 24, padding: 24, alignItems: 'center', gap: 12, width: '100%' },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: themes.fonts.poppinsBold, color: '#fff', textAlign: 'center' },
  modalDate: { fontSize: 12, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  modalDivider: { width: '100%', height: 1, backgroundColor: '#2D3748', marginVertical: 4 },
  modalMessage: { fontSize: 14, fontFamily: themes.fonts.poppinsRegular, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  modalCloseBtn: { width: '100%', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
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
