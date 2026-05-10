import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../hooks/useEarningsData';

interface Props {
  daysLeft?: number;
  plan?: string;
}

export default function PlansBanner({ daysLeft = 3, plan = 'Pro' }: Props) {
  const isUrgent = daysLeft <= 3;

  return (
    <View style={[s.card, isUrgent && s.cardUrgent]}>
      {/* Decorative glow */}
      <View style={s.glow} />

      <View style={s.left}>
        <View style={s.planBadge}>
          <Ionicons name="flash" size={11} color={C.cyan} />
          <Text style={s.planBadgeText}>Plano {plan}</Text>
        </View>
        <Text style={s.title}>
          {isUrgent ? `⚠ Expira em ${daysLeft} dias` : `Válido por ${daysLeft} dias`}
        </Text>
        <Text style={s.sub}>
          Renova para manteres taxas prioritárias{'\n'}e acesso ilimitado às estatísticas.
        </Text>

        {/* Benefits */}
        <View style={s.benefits}>
          {['Taxas +15%', 'Prioridade máx.', 'Stats avançadas'].map(b => (
            <View key={b} style={s.benefitItem}>
              <Ionicons name="checkmark-circle" size={11} color={C.cyan} />
              <Text style={s.benefitText}>{b}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={s.renewBtn} activeOpacity={0.85}>
        <Text style={s.renewText}>Renovar</Text>
        <Ionicons name="arrow-forward" size={14} color={C.bg} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.cyanDim,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: `${C.cyan}25`,
    overflow: 'hidden',
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  cardUrgent: {
    borderColor: `${C.amber}30`,
    backgroundColor: C.amberDim,
  },
  glow: {
    position: 'absolute',
    left: -30,
    top: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.cyan,
    opacity: 0.06,
  },
  left: {
    flex: 1,
    gap: 5,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: `${C.cyan}20`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  planBadgeText: {
    fontSize: 10,
    color: C.cyan,
    fontFamily: 'Poppins_700Bold',
  },
  title: {
    fontSize: 15,
    color: C.white,
    fontFamily: 'Poppins_700Bold',
  },
  sub: {
    fontSize: 11,
    color: C.muted,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 17,
  },
  benefits: {
    gap: 3,
    marginTop: 4,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  benefitText: {
    fontSize: 11,
    color: C.muted,
    fontFamily: 'Poppins_400Regular',
  },
  renewBtn: {
    backgroundColor: C.cyan,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  renewText: {
    color: C.bg,
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
});
