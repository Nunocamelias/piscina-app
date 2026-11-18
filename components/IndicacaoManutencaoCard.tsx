import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type GestureResponderEvent } from 'react-native';
import type { IndicacaoManutencao } from '../services/useIndicacoesManutencao';

type Props = { indicacao: IndicacaoManutencao; onAbrir: () => void; naFolha?: boolean };

const IndicacaoManutencaoCard = ({ indicacao, onAbrir, naFolha = false }: Props) => {
  const abrir = (evento: GestureResponderEvent) => {
    evento.stopPropagation();
    onAbrir();
  };
  return (
    <TouchableOpacity style={styles.cartao} activeOpacity={0.8} onPress={abrir}
      accessibilityRole="button" accessibilityLabel={'Abrir conversa: ' + indicacao.assunto}>
      <View style={styles.cabecalho}>
        <Text style={styles.etiqueta}>✉ Mensagem da Administração</Text>
        {!indicacao.lida && <View style={styles.nova} />}
      </View>
      <Text style={styles.assunto}>{indicacao.assunto}</Text>
      {!!indicacao.mensagem && <Text style={styles.mensagem}>{indicacao.mensagem}</Text>}
      {Number(indicacao.num_anexos) > 0 && (
        <Text style={styles.mensagem}>📎 {indicacao.num_anexos} anexo(s) na conversa</Text>
      )}
      {naFolha && <Text style={styles.estado}>{indicacao.lida ? '✓ Mensagem lida' : 'Por ler'} · Até concluir a manutenção</Text>}
      <Text style={styles.abrir}>{naFolha ? 'Abrir conversa / Responder ›' : 'Abrir conversa ›'}</Text>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  cartao: { backgroundColor: '#ADD8E6', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 6, gap: 5 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  etiqueta: { color: '#235665', fontSize: 12, fontWeight: '700', flex: 1 },
  nova: { backgroundColor: '#A91B1B', width: 9, height: 9, borderRadius: 5 },
  assunto: { color: '#000000', fontWeight: '700', fontSize: 16 },
  mensagem: { color: '#000000', fontSize: 14 },
  estado: { color: '#235665', fontSize: 12 },
  abrir: { color: '#235665', fontWeight: '700', fontSize: 13 },
});
export default IndicacaoManutencaoCard;
