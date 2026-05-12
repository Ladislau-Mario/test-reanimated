// src/pages/client/mainClient/profile.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { themes } from '../../../../global/themes';
import { signOut } from 'firebase/auth';
import { auth } from '../../../../../firebaseConfig';
import api from '../../../../components/modules/services/api/api';
import { authService } from '../../../../components/modules/services/api/authService';

type EditField = 'nome' | 'telefone' | 'email' | 'palavra-passe' | 'endereco' | null;

interface UserData {
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string;
  endereco: string;
  totalPedidos?: number;
  pedidosConcluidos?: number;
  pedidosCancelados?: number;
}

function OptionRow({
  icon, label, value, onPress, danger, last,
}: {
  icon: any; label: string; value?: string;
  onPress?: () => void; danger?: boolean; last?: boolean;
}) {
  return (
    <>
      <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.6}>
        <View style={[styles.optionIconWrap, danger && { backgroundColor: '#EF444415' }]}>
          <Ionicons name={icon} size={17} color={danger ? '#EF4444' : '#6B7280'} />
        </View>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionLabel, danger && { color: '#EF4444' }]}>{label}</Text>
          {value ? (
            <Text style={styles.optionValue} numberOfLines={1}>{value}</Text>
          ) : null}
        </View>
        {!danger && <Ionicons name="chevron-forward" size={14} color="#374151" />}
      </TouchableOpacity>
      {!last && <View style={styles.divider} />}
    </>
  );
}

export default function Profile() {
  const navigation = useNavigation<any>();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  const [activeField, setActiveField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [userData, setUserData] = useState<UserData>({
    nome: '',
    sobrenome: '',
    telefone: '',
    email: '',
    endereco: '',
    totalPedidos: 0,
    pedidosConcluidos: 0,
    pedidosCancelados: 0,
  });

  // Carrega dados do backend ao montar
  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await api.get('/users/perfil');
        const u = res.data;

        // Carrega pedidos do utilizador para as estatísticas
        let pedidos: any[] = [];
        try {
          const pedRes = await api.get('/pedidos/meus');
          pedidos = pedRes.data || [];
        } catch (_) {}

        const concluidos = pedidos.filter((p: any) => p.status === 'entregue').length;
        const cancelados = pedidos.filter((p: any) => p.status === 'cancelado').length;

        setUserData({
          nome: u.nome || '',
          sobrenome: u.sobrenome || '',
          telefone: u.telefone ? `+244 ${u.telefone}` : '',
          email: u.email || '',
          endereco: u.endereco || '',
          totalPedidos: pedidos.length,
          pedidosConcluidos: concluidos,
          pedidosCancelados: cancelados,
        });
      } catch (error) {
        console.warn('Erro ao carregar perfil:', error);
        // Fallback para dados da sessão local
        const sessao = await authService.obterSessao();
        if (sessao) {
          setUserData((prev) => ({
            ...prev,
            nome: sessao.nome || '',
            sobrenome: sessao.sobrenome || '',
            telefone: sessao.telefone || '',
            email: sessao.email || '',
          }));
        }
      } finally {
        setLoadingPerfil(false);
      }
    };
    carregar();
  }, []);

  const stats = [
    { label: 'Pedidos', value: String(userData.totalPedidos ?? 0), color: '#2D60FF', bg: '#2D60FF15' },
    { label: 'Concluídos', value: String(userData.pedidosConcluidos ?? 0), color: '#10B981', bg: '#10B98115' },
    { label: 'Cancelados', value: String(userData.pedidosCancelados ?? 0), color: '#EF4444', bg: '#EF444415' },
  ];

  const openEdit = (field: EditField, currentValue: string) => {
    setActiveField(field);
    setEditValue(currentValue);
    setConfirmValue('');
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleSave = async () => {
    if (!activeField) {
      bottomSheetRef.current?.close();
      return;
    }

    setSavingEdit(true);
    try {
      const payload: any = {};

      if (activeField === 'nome') {
        const partes = editValue.trim().split(' ');
        payload.nome = partes[0];
        payload.sobrenome = partes.slice(1).join(' ');
      } else if (activeField === 'email') {
        payload.email = editValue;
      } else if (activeField === 'telefone') {
        payload.telefone = editValue.replace('+244', '').trim();
      }

      if (Object.keys(payload).length > 0) {
        await api.patch('/users/perfil', payload);
        setUserData((prev) => ({
          ...prev,
          ...(activeField === 'nome' && {
            nome: payload.nome,
            sobrenome: payload.sobrenome || prev.sobrenome,
          }),
          ...(activeField === 'email' && { email: payload.email }),
          ...(activeField === 'telefone' && { telefone: editValue }),
        }));
      }

      bottomSheetRef.current?.close();
      setActiveField(null);
    } catch (error: any) {
      Alert.alert('Baza', error.response?.data?.message || 'Erro ao guardar.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Terminar Sessão', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          await authService.limparSessao();
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        },
      },
    ]);
  };

  const fieldLabel: Record<NonNullable<EditField>, string> = {
    nome: 'Nome', telefone: 'Telefone', email: 'Email',
    'palavra-passe': 'Palavra-Passe', endereco: 'Endereço',
  };

  const nomeCompleto = [userData.nome, userData.sobrenome].filter(Boolean).join(' ');
  const initials = nomeCompleto
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient
                colors={['#2D60FF', '#1a3fa0']}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarInitials}>{initials || '?'}</Text>
              </LinearGradient>
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{nomeCompleto || 'Utilizador Baza'}</Text>
            <Text style={styles.userPhone}>{userData.telefone || userData.email || ''}</Text>

            <View style={styles.statsRow}>
              {stats.map((s, i) => (
                <View key={i} style={[styles.statPill, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: s.color + 'AA' }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Informações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações</Text>
            <View style={styles.card}>
              <OptionRow
                icon="person-outline"
                label="Nome"
                value={nomeCompleto}
                onPress={() => openEdit('nome', nomeCompleto)}
              />
              <OptionRow
                icon="call-outline"
                label="Telefone"
                value={userData.telefone}
                onPress={() => openEdit('telefone', userData.telefone)}
              />
              <OptionRow
                icon="mail-outline"
                label="Email"
                value={userData.email}
                onPress={() => openEdit('email', userData.email)}
                last
              />
            </View>
          </View>

          {/* Conta */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <View style={styles.card}>
              <OptionRow
                icon="time-outline"
                label="Histórico"
                onPress={() => navigation.navigate('History')}
              />
              <OptionRow
                icon="help-circle-outline"
                label="Ajuda"
                onPress={() => navigation.navigate('Help')}
                last
              />
            </View>
          </View>

          {/* Logout */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <View style={styles.card}>
              <OptionRow
                icon="log-out-outline"
                label="Terminar Sessão"
                danger
                last
                onPress={handleLogout}
              />
            </View>
          </View>
        </ScrollView>

        {/* BottomSheet de Edição */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetIndicator}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
        >
          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            {activeField && (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
                <Text style={styles.sheetTitle}>Editar {fieldLabel[activeField]}</Text>
                <Text style={styles.sheetSubtitle}>
                  Actualiza o teu {fieldLabel[activeField].toLowerCase()} abaixo.
                </Text>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>{fieldLabel[activeField]}</Text>
                  <TextInput
                    style={styles.input}
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder={`Insere o teu ${fieldLabel[activeField].toLowerCase()}`}
                    placeholderTextColor="#4B5563"
                    keyboardType={
                      activeField === 'telefone'
                        ? 'phone-pad'
                        : activeField === 'email'
                        ? 'email-address'
                        : 'default'
                    }
                    secureTextEntry={activeField === 'palavra-passe'}
                    autoFocus
                    selectionColor="#2D60FF"
                  />
                </View>

                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      bottomSheetRef.current?.close();
                      setActiveField(null);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={savingEdit}
                  >
                    <Text style={styles.saveBtnText}>
                      {savingEdit ? 'A guardar...' : 'Guardar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923' },
  scroll: { paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 56, paddingBottom: 12 },
  avatarSection: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20 },
  avatarGradient: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarInitials: { fontSize: 30, fontFamily: themes.fonts.poppinsBold, color: '#fff' },
  cameraBtn: { position: 'absolute', bottom: 14, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#2D60FF', borderWidth: 2, borderColor: '#0F1923', alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 20, fontFamily: themes.fonts.poppinsBold, color: '#fff', marginBottom: 2 },
  userPhone: { fontSize: 13, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280', marginBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontFamily: themes.fonts.poppinsBold },
  statLabel: { fontSize: 10, fontFamily: themes.fonts.poppinsRegular },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontFamily: themes.fonts.poppinsMedium, color: '#4B5563', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: '#1A2535', borderRadius: 18, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: '#1F2D3D', marginLeft: 52 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 12 },
  optionIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#1F2D3D', alignItems: 'center', justifyContent: 'center' },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 14, fontFamily: themes.fonts.poppinsMedium, color: '#E5E7EB' },
  optionValue: { fontSize: 11, fontFamily: themes.fonts.poppinsRegular, color: '#4B5563', marginTop: 1 },
  sheetBg: { backgroundColor: '#1A2535', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetIndicator: { backgroundColor: '#2D3748', width: 36 },
  sheetContent: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  sheetTitle: { fontSize: 20, fontFamily: themes.fonts.poppinsBold, color: '#fff', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, fontFamily: themes.fonts.poppinsRegular, color: '#6B7280', marginBottom: 20 },
  inputWrap: { gap: 6 },
  inputLabel: { fontSize: 12, fontFamily: themes.fonts.poppinsMedium, color: '#6B7280', marginLeft: 2 },
  input: { backgroundColor: '#0F1923', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, fontSize: 15, fontFamily: themes.fonts.poppinsRegular, color: '#fff', borderWidth: 1, borderColor: '#1F2D3D' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveBtn: { flex: 1, backgroundColor: '#2D60FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontFamily: themes.fonts.poppinsSemi, color: '#fff' },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1F2D3D' },
  cancelBtnText: { fontSize: 14, fontFamily: themes.fonts.poppinsMedium, color: '#6B7280' },
});