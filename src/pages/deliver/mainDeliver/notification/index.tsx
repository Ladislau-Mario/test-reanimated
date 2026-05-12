// src/pages/deliver/mainDeliver/notification/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { themes } from '../../../../global/themes';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: 'plano' | 'entrega' | 'ganhos' | 'sistema' | 'admin';
}

// ── Mock (backend: api.get('/deliver/notifications')) ──────────────────────
const now = new Date();
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'd1',
    title: 'Plano Pro aprovado ✅',
    message: 'O teu comprovativo foi verificado. O Plano Pro está activo até ' +
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-AO') +
      '. Tens agora taxas prioritárias +10%.',
    date: new Date(now.getTime() - 30 * 60 * 1000),
    read: false,
    type: 'plano',
  },
  {
    id: 'd2',
    title: 'Nova entrega disponível',
    message: 'Há uma entrega perto de ti em Talatona. Distância: 2.3 km. Valor estimado: 850 Kz. Aceita antes que outro estafeta apanhe.',
    date: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    read: false,
    type: 'entrega',
  },
  {
    id: 'd3',
    title: 'Meta Ninja quase atingida 🥷',
    message: 'Estás a 82% da meta Ninja de hoje. Precisas de mais 10 entregas para ganhar o bónus de 3 000 Kz.',
    date: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    read: false,
    type: 'ganhos',
  },
  {
    id: 'd4',
    title: 'Pagamento processado',
    message: 'Os teus ganhos de ontem (17 500 Kz) estão disponíveis para levantamento. Acede à secção Ganhos para mais detalhes.',
    date: new Date(now.getTime() - 26 * 60 * 60 * 1000),
    read: true,
    type: 'ganhos',
  },
  {
    id: 'd5',
    title: 'Mensagem da equipa Baza',
    message: 'Obrigado pela tua dedicação! Esta semana estás no top 10 dos estafetas mais rápidos de Luanda. Continua assim!',
    date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'admin',
  },
  {
    id: 'd6',
    title: 'Plano expira em 3 dias',
    message: 'O teu Plano Pro expira em 3 dias. Renova agora para não perderes as taxas prioritárias e o acesso às estatísticas avançadas.',
    date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'plano',
  },
  {
    id: 'd7',
    title: 'Actualização da aplicação',
    message: 'Nova versão disponível com melhorias no mapa de navegação e cálculo de distâncias. Actualiza para uma melhor experiência.',
    date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    read: true,
    type: 'sistema',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs  = now.getTime() - date.getTime();
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);
  if (diffMins  < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays  === 1) return 'ontem';
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function getTypeConfig(type: NotificationItem['type']) {
  switch (type) {
    case 'plano':   return { icon: 'flash-outline'            as const, color: '#00D4FF', bg: '#00D4FF18', label: 'Plano',    labelColor: '#00D4FF' };
    case 'entrega': return { icon: 'bicycle-outline'          as const, color: '#3B7BFF', bg: '#3B7BFF18', label: 'Entrega',  labelColor: '#3B7BFF' };
    case 'ganhos':  return { icon: 'wallet-outline'           as const, color: '#22D07A', bg: '#22D07A18', label: 'Ganhos',   labelColor: '#22D07A' };
    case 'admin':   return { icon: 'shield-checkmark-outline' as const, color: '#F59E0B', bg: '#F59E0B18', label: 'Admin',    labelColor: '#F59E0B' };
    case 'sistema': return { icon: 'settings-outline'         as const, color: '#8B5CF6', bg: '#8B5CF618', label: 'Sistema',  labelColor: '#8B5CF6' };
  }
}

// ── Modal de detalhe ───────────────────────────────────────────────────────
function ViewModal({ item, visible, onClose }: { item: NotificationItem; visible: boolean; onClose: () => void }) {
  const cfg = getTypeConfig(item.type);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalBox} onPress={() => {}}>
          <View style={[s.modalIconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={28} color={cfg.color} />
          </View>
          <Text style={s.modalTitle}>{item.title}</Text>
          <Text style={s.modalDate}>{formatDate(item.date)}</Text>
          <View style={s.modalDivider} />
          <Text style={s.modalMessage}>{item.message}</Text>
          <TouchableOpacity style={[s.modalCloseBtn, { backgroundColor: cfg.color }]} onPress={onClose}>
            <Text style={s.modalCloseBtnText}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Modal de eliminar ──────────────────────────────────────────────────────
function DeleteModal({
  item, visible, onClose, onConfirm,
}: { item: NotificationItem; visible: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalBox} onPress={() => {}}>
          <View style={[s.modalIconWrap, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="trash-outline" size={28} color="#EF4444" />
          </View>
          <Text style={s.modalTitle}>Eliminar notificação?</Text>
          <Text style={s.modalMessage}>
            Tens a certeza que queres eliminar "{item.title}"? Esta acção não pode ser revertida.
          </Text>
          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={onClose}>
              <Text style={s.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalDeleteBtn} onPress={onConfirm}>
              <Ionicons name="trash-outline" size={15} color="#fff" />
              <Text style={s.modalDeleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
function NotificationCard({ item, onDelete }: { item: NotificationItem; onDelete: (id: string) => void }) {
  const [viewVisible,   setViewVisible]   = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const cfg = getTypeConfig(item.type);

  return (
    <>
      <ViewModal   item={item} visible={viewVisible}   onClose={() => setViewVisible(false)} />
      <DeleteModal
        item={item}
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={() => { setDeleteVisible(false); onDelete(item.id); }}
      />

      <TouchableOpacity
        style={[s.card, item.read && s.cardRead]}
        onPress={() => setViewVisible(true)}
        activeOpacity={0.8}
      >
        {/* Stripe lateral colorida */}
        <View style={[s.cardStripe, { backgroundColor: cfg.color }]} />

        <View style={[s.iconContainer, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <View style={[s.cardTypeBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[s.cardTypeTxt, { color: cfg.labelColor }]}>{cfg.label}</Text>
            </View>
            <View style={s.cardHeaderRight}>
              <Text style={s.cardDate}>{formatDate(item.date)}</Text>
              {!item.read && <View style={s.unreadDot} />}
            </View>
          </View>

          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.cardMessage} numberOfLines={2}>{item.message}</Text>

          <View style={s.cardActions}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ffffff08' }]} onPress={() => setViewVisible(true)}>
              <Ionicons name="eye-outline" size={15} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF444415' }]} onPress={() => setDeleteVisible(true)}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function DeliverNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const navigation = useNavigation<any>();
  const unread = notifications.filter(n => !n.read).length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Notificações</Text>
        </View>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={() => setNotifications([])}>
            <Text style={s.clearAll}>Limpar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {/* Resumo por tipo */}
      {notifications.length > 0 && (
        <View style={s.summary}>
          {(['plano', 'entrega', 'ganhos'] as const).map((type, i, arr) => {
            const cfg   = getTypeConfig(type);
            const count = notifications.filter(n => n.type === type).length;
            return (
              <React.Fragment key={type}>
                <View style={s.summaryItem}>
                  <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  <Text style={[s.summaryNum, { color: cfg.color }]}>{count}</Text>
                  <Text style={s.summaryLabel}>{cfg.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.summaryDivider} />}
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* Lista / vazio */}
      {notifications.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={40} color="#4B5563" />
          </View>
          <Text style={s.emptyTitle}>Sem notificações</Text>
          <Text style={s.emptySubtitle}>Quando tiveres novidades, vão aparecer aqui.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
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
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#121921' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1E2A35' },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:    { fontSize: 18, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  unreadBadge:    { backgroundColor: '#3B7BFF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadBadgeTxt: { fontSize: 11, fontFamily: themes.fonts.poppinsBold, color: '#fff' },
  clearAll:       { fontSize: 13, fontFamily: themes.fonts.poppinsMedium, color: '#EF4444', width: 50, textAlign: 'right' },

  summary:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 14, marginBottom: 4, backgroundColor: '#1E2A35', borderRadius: 16, paddingVertical: 14 },
  summaryItem:    { alignItems: 'center', flex: 1, gap: 3 },
  summaryNum:     { fontSize: 18, fontFamily: themes.fonts.poppinsBold },
  summaryLabel:   { fontSize: 10, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  summaryDivider: { width: 1, height: 28, backgroundColor: '#2D3748' },

  list: { padding: 16, gap: 10, paddingBottom: 100 },

  card:        { backgroundColor: '#1E2A35', borderRadius: 16, padding: 14, paddingLeft: 18, flexDirection: 'row', gap: 12, overflow: 'hidden' },
  cardRead:    { opacity: 0.55 },
  cardStripe:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  iconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1, gap: 4 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTypeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardTypeTxt:   { fontSize: 10, fontFamily: themes.fonts.poppinsMedium },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  cardDate:    { fontSize: 11, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B7BFF' },
  cardTitle:   { fontSize: 13, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  cardMessage: { fontSize: 12, fontFamily: themes.fonts.poppinsRegular, color: '#9CA3AF', lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  actionBtn:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalBox:         { backgroundColor: '#1E2A35', borderRadius: 24, padding: 24, alignItems: 'center', gap: 12, width: '100%' },
  modalIconWrap:    { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle:       { fontSize: 18, fontFamily: themes.fonts.poppinsBold, color: '#fff', textAlign: 'center' },
  modalDate:        { fontSize: 12, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280' },
  modalDivider:     { width: '100%', height: 1, backgroundColor: '#2D3748', marginVertical: 4 },
  modalMessage:     { fontSize: 14, fontFamily: themes.fonts.poppinsRegular, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  modalCloseBtn:    { width: '100%', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  modalCloseBtnText:{ fontSize: 15, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  modalActions:     { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  modalCancelBtn:   { flex: 1, backgroundColor: '#2D3748', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancelText:  { fontSize: 15, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  modalDeleteBtn:   { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalDeleteText:  { fontSize: 15, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },

  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E2A35', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle:   { fontSize: 18, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  emptySubtitle:{ fontSize: 13, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280', textAlign: 'center', lineHeight: 20 },


   backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#141E2B',
    borderWidth: 1,
    borderColor: '#FFFFFF0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
});