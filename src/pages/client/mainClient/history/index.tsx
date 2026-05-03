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
interface Notification {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: 'delivery' | 'promo' | 'system' | 'admin';
}

// ── Dados de exemplo ───────────────────────────────────────────────────────
const now = new Date();
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Entrega confirmada!',
    message: 'A tua encomenda foi recolhida pelo estafeta João Silva e está a caminho do destino. Tempo estimado: 20 minutos.',
    date: new Date(now.getTime() - 30 * 60 * 1000),
    read: false,
    type: 'delivery',
  },
  {
    id: '2',
    title: 'Promoção especial 🎉',
    message: 'Tens 20% de desconto na próxima entrega. Usa o código BAZA20 até ao fim do mês.',
    date: new Date(now.getTime() - 23 * 60 * 60 * 1000),
    read: false,
    type: 'promo',
  },
  {
    id: '3',
    title: 'Mensagem do administrador',
    message: 'Bem-vindo ao Baza! A tua conta foi verificada com sucesso. Já podes fazer as tuas primeiras entregas. Qualquer dúvida, contacta o suporte.',
    date: new Date(now.getTime() - 26 * 60 * 60 * 1000),
    read: true,
    type: 'admin',
  },
  {
    id: '4',
    title: 'Actualização do sistema',
    message: 'Melhorámos a experiência de rastreamento em tempo real. Actualiza a app para teres acesso às novas funcionalidades.',
    date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'system',
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
  return `${date.getDate()} de ${months[date.getMonth()]}`;
}

function getTypeConfig(type: Notification['type']) {
  switch (type) {
    case 'delivery': return { icon: 'bicycle' as const,           color: '#2D60FF', bg: '#2D60FF20' };
    case 'promo':    return { icon: 'gift' as const,              color: '#10B981', bg: '#10B98120' };
    case 'admin':    return { icon: 'shield-checkmark' as const,  color: '#F59E0B', bg: '#F59E0B20' };
    case 'system':   return { icon: 'settings' as const,          color: '#8B5CF6', bg: '#8B5CF620' };
  }
}

// ── Modal de Visualizar ────────────────────────────────────────────────────
function ViewModal({
  notification,
  visible,
  onClose,
}: {
  notification: Notification;
  visible: boolean;
  onClose: () => void;
}) {
  const cfg = getTypeConfig(notification.type);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          <View style={[styles.modalIconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={28} color={cfg.color} />
          </View>
          <Text style={styles.modalTitle}>{notification.title}</Text>
          <Text style={styles.modalDateFull}>{formatDate(notification.date)}</Text>
          <View style={styles.modalDivider} />
          <Text style={styles.modalMessage}>{notification.message}</Text>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Modal de Eliminar ──────────────────────────────────────────────────────
function DeleteModal({
  notification,
  visible,
  onClose,
  onConfirm,
}: {
  notification: Notification;
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
            Tens a certeza que queres eliminar "{notification.title}"? Esta acção não pode ser revertida.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={onConfirm}>
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.modalDeleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Card de Notificação ────────────────────────────────────────────────────
function NotificationCard({
  notification,
  onDelete,
}: {
  notification: Notification;
  onDelete: (id: string) => void;
}) {
  const [viewVisible, setViewVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const cfg = getTypeConfig(notification.type);

  const handleConfirmDelete = () => {
    setDeleteVisible(false);
    onDelete(notification.id);
  };

  return (
    <>
      <ViewModal
        notification={notification}
        visible={viewVisible}
        onClose={() => setViewVisible(false)}
      />
      <DeleteModal
        notification={notification}
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleConfirmDelete}
      />

      <View style={[styles.card, notification.read && styles.cardRead]}>
        {/* Ponto não lido — dentro do header, não absoluto */}
        <View style={[styles.iconContainer, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{notification.title}</Text>
            <View style={styles.cardHeaderRight}>
              <Text style={styles.cardDate}>{formatDate(notification.date)}</Text>
              {!notification.read && <View style={styles.unreadDot} />}
            </View>
          </View>

          <Text style={styles.cardMessage} numberOfLines={2}>{notification.message}</Text>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2D60FF20' }]}
              onPress={() => setViewVisible(true)}
            >
              <Ionicons name="eye-outline" size={16} color="#2D60FF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
              onPress={() => setDeleteVisible(true)}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const navigation = useNavigation<any>();

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notificações</Text>

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
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map(n => (
            <NotificationCard key={n.id} notification={n} onDelete={handleDelete} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121921',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A35',
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: themes.fonts.poppinsSemi,
    color: '#fff',
  },
  clearAll: {
    fontSize: 13,
    fontFamily: themes.fonts.poppinsMedium,
    color: '#EF4444',
    width: 50,
    textAlign: 'right',
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: '#1E2A35',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardRead: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: themes.fonts.poppinsSemi,
    color: '#fff',
  },
  cardDate: {
    fontSize: 11,
    fontFamily: themes.fonts.poppinsRegular,
    color: '#6B7280',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D60FF',
  },
  cardMessage: {
    fontSize: 12,
    fontFamily: themes.fonts.poppinsRegular,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#1E2A35',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: themes.fonts.poppinsBold,
    color: '#fff',
    textAlign: 'center',
  },
  modalDateFull: {
    fontSize: 12,
    fontFamily: themes.fonts.poppinsRegular,
    color: '#6B7280',
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#2D3748',
    marginVertical: 4,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: themes.fonts.poppinsRegular,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: '#2D60FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontFamily: themes.fonts.poppinsSemi,
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#2D3748',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: themes.fonts.poppinsSemi,
    color: '#fff',
  },
  modalDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontFamily: themes.fonts.poppinsSemi,
    color: '#fff',
  },

  // Vazio
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E2A35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: themes.fonts.poppinsSemi,
    color: '#fff',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: themes.fonts.poppinsRegular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});