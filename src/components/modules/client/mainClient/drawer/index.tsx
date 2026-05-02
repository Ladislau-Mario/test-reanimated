import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const menuItems = [
  { label: 'Entregas', icon: 'flame', lib: 'Ionicons', route: 'Home' },
  { label: 'Perfil', icon: 'person-outline', lib: 'Ionicons', route: 'Profile' },
  { label: 'Histórico de entregas', icon: 'time-outline', lib: 'Ionicons', route: 'History' },
  { label: 'Segurança', icon: 'shield-checkmark-outline', lib: 'Ionicons', route: 'Security' },
  { label: 'Ajuda', icon: 'help-circle-outline', lib: 'Ionicons', route: 'Help' },
  { label: 'Configurações', icon: 'settings-outline', lib: 'Ionicons', route: 'Settings' },
];

export default function DrawerContent(props: any) {
  const { navigation } = props;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>LM</Text>
        </View>
        <View>
          <Text style={styles.name}>Ladislau Mário</Text>
          <View style={styles.ratingRow}>
            {[1,2,3,4].map(i => (
              <Ionicons key={i} name="star" size={14} color="#FFD700" />
            ))}
            <Ionicons name="star-half" size={14} color="#FFD700" />
            <Text style={styles.ratingText}> 4,0</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* MENU ITEMS */}
      <DrawerContentScrollView {...props} style={styles.scroll}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <Ionicons
              name={item.icon as any}
              size={22}
              color="#FFFFFF"
              style={styles.menuIcon}
            />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#ffffff40" />
          </TouchableOpacity>
        ))}
      </DrawerContentScrollView>

      {/* FOOTER */}
      <View style={styles.divider} />
      <TouchableOpacity style={styles.logout}>
        <Text style={styles.logoutText}>Terminar Sessão</Text>
        <Ionicons name="exit-outline" size={22} color="#FF2D55" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2933',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  name: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    color: '#FFD700',
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#ffffff15',
    marginHorizontal: 20,
  },
  scroll: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoutText: {
    color: '#FF2D55',
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
});