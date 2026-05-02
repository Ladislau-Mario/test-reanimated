import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Earnings() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Ganhos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2933', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 20 },
});