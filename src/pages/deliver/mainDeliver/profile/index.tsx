import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { themes } from '../../../../global/themes';
import Background from '../../../../components/layout/background/bgscreen';

export default function DeliverProfile() {
  const menuItems = [
    { 
      icon: 'notifications-outline', 
      label: 'Notificações',
      iconColor: '#3B82F6',
      bgColor: '#1E2A3A'
    },
    { 
      icon: 'card-outline', 
      label: 'Contas',
      iconColor: '#10B981',
      bgColor: '#1A2E26'
    },
    { 
      icon: 'shield-checkmark-outline', 
      label: 'Segurança e Conta',
      iconColor: '#8B5CF6',
      bgColor: '#261E3A'
    },
    { 
      icon: 'help-circle-outline', 
      label: 'Suporte & Ajuda',
      iconColor: '#F59E0B',
      bgColor: '#2E261A'
    },
  ];

  return (

      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header com gradiente */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#3461FD', '#1a3fb5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          />
          
          <View style={styles.profileSection}>
            <View style={styles.profileImageWrapper}>
              <View style={styles.profileImage}>
                <Text style={styles.profileInitials}>AJ</Text>
              </View>
              <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>Adam James</Text>
              <Text style={styles.userEmail}>sabesaki@bigmail.com</Text>
            </View>
          </View>
          
          {/* Botão Editar Perfil integrado */}
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar Perfil</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Menu Items com ícones coloridos */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#4a5568" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutCard} activeOpacity={0.7}>
          <View style={styles.logoutIconWrapper}>
            <Ionicons name="log-out-outline" size={22} color="#CB1D00" />
          </View>
          <Text style={styles.logoutLabel}>Sair</Text>
          <Ionicons name="chevron-forward" size={18} color="#4a5568" />
        </TouchableOpacity>

        {/* Versão */}
        <Text style={styles.versionText}>Versão 1.0.0</Text>
      </ScrollView>
  );
}

const theme = themes;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: 24,
    marginBottom: 20,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  profileInitials: {
    fontSize: 28,
    fontFamily: theme.fonts.poppinsSemi,
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3461FD',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: theme.fonts.poppinsSemi,
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: theme.fonts.poppinsRegular,
    color: 'rgba(255,255,255,0.7)',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.poppinsMedium,
    color: '#fff',
    opacity: 0.9,
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A22',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#1f293760',
  },
  menuIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.poppinsMedium,
    color: '#fff',
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A22',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2a1f1f',
  },
  logoutIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.poppinsMedium,
    color: '#CB1D00',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 11,
    fontFamily: theme.fonts.poppinsRegular,
    color: '#4a5568',
  },
});