import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DeliverProfile() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Perfil</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2933', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 20 },
});