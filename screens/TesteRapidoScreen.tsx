// screens/TesteRapidoScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import {
  CLORO_ANCHORS,
  CLORO_TOTAL_ANCHORS,
  PH_ANCHORS,
  ALC_ANCHORS,
  CYA_ANCHORS,
  DUREZA_ANCHORS,
  interpolateColor,
  type Anchor,
  DEFAULT_NOISE_PRESET,
  DEFAULT_FIBER_PRESET,
  BOX_NOISE_PRESET,
  BOX_FIBER_PRESET
} from '../utils/colors';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../App';


/* =========================================================
   1) DECLARAÇÕES E FUNÇÕES
========================================================= */

type ModoTeste = 'PH_CL' | 'TODOS';

type ParamKey =
  | 'dureza'
  | 'cloro_total'
  | 'cloro_livre'
  | 'ph'
  | 'alcalinidade'
  | 'cya';

type ParametroTR = {
  key: ParamKey;
  label: string;
  short: string;
  anchors: Anchor[];
  min: number;
  max: number;
  step: number;
};

type ValoresTR = Partial<Record<ParamKey, number | null>>;

type VerticalThumbSliderProps = {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  onDoubleTap?: () => void;
  disabled?: boolean; // ✅ novo
};

function clampNum(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snapToStepSafe(v: number, min: number, step: number) {
  if (!Number.isFinite(v)) return min;
  if (!Number.isFinite(step) || step <= 0) return v;

  // arredonda sempre a partir do min (evita “voltar ao min” por flutuações)
  const n = Math.round((v - min) / step);
  return min + n * step;
}

function decimalsFromStep(step: number) {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = String(step);
  const i = s.indexOf('.');
  return i >= 0 ? (s.length - i - 1) : 0;
}

function roundToStepForDisplay(v: number, step: number) {
  const d = decimalsFromStep(step);
  return Number(Number(v).toFixed(d));
}

const SWATCH = 40; // muda aqui e fica tudo centrado
const OVER = SWATCH * 3; // 120


// ✅ ORDEM AquaChek (igual ao rótulo)
const PARAMS_ALL: ParametroTR[] = [
  { key: 'dureza', label: 'Dureza', short: 'DUR', anchors: DUREZA_ANCHORS, min: 0, max: 1000, step: 10 },
  { key: 'cloro_total', label: 'Cloro Total', short: 'TCL', anchors: CLORO_TOTAL_ANCHORS, min: 0, max: 10, step: 0.1 },
  { key: 'cloro_livre', label: 'Cloro Livre', short: 'FCL', anchors: CLORO_ANCHORS, min: 0, max: 10, step: 0.1 },
  { key: 'ph', label: 'pH', short: 'pH', anchors: PH_ANCHORS, min: 6.2, max: 8.2, step: 0.1 },
  { key: 'alcalinidade', label: 'Alcalinidade', short: 'TAC', anchors: ALC_ANCHORS, min: 0, max: 240, step: 10 },
  { key: 'cya', label: 'Ácido Cianúrico', short: 'CYA', anchors: CYA_ANCHORS, min: 0, max: 300, step: 10 },
];

// ✅ Slider vertical com thumb nosso (double-tap + tamanhos)
function VerticalThumbSlider({ min, max, step, value, onChange, onDoubleTap, disabled = false }: VerticalThumbSliderProps) {

  const [trackH, setTrackH] = useState(320);
  const [dragging, setDragging] = useState(false);
  // “armed” = quando estás a mexer/ativaste o thumb para poder arrastar
  const [armed, setArmed] = useState(false);

  useEffect(() => {
  const isAtMin = Math.abs(value - min) < 1e-9;
  if (isAtMin) {
    // ✅ novo parâmetro / reset: volta ao estado “pequeno”
    setDragging(false);
    setArmed(false);
    lastTapRef.current = 0;
  }
}, [value, min]);  

  const lastTapRef = useRef<number>(0);
  const startLocalYRef = useRef(0);

  const trackRef = useRef<View>(null);
  const trackTopRef = useRef(0);

  // refs para evitar recriar PanResponder / closures antigas
  const valueRef = useRef(value);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  minRef.current = min;
  maxRef.current = max;
  stepRef.current = step;
  onChangeRef.current = onChange;

  const t = (value - min) / (max - min || 1);
  const y = (1 - clampNum(t, 0, 1)) * trackH; // 0 topo / trackH fundo

  // tamanhos:
  // - grande enquanto arrasta
  // - pequena no mínimo (e não armado)
  // - intermédia quando largas (se não está no mínimo)
  const thumbSize = useMemo(() => {
    if (dragging) return 36;
    if (!armed && Math.abs(value - min) < 1e-9) return 16;
    return 24;
  }, [dragging, armed, value, min]);

  function yToValue(yy: number) {
  const _min = minRef.current;
  const _max = maxRef.current;
  const _step = stepRef.current;

  const clampedY = clampNum(yy, 0, trackH);
  const tt = 1 - clampedY / (trackH || 1); // 1 topo / 0 fundo

  // raw no intervalo
  const raw = _min + tt * (_max - _min);

  // snap robusto
  const snapped = snapToStepSafe(raw, _min, _step);

  // clamp final robusto
  const clamped = clampNum(snapped, _min, _max);

  // ✅ proteção extra: se estiver MUITO perto do max, força max
  // (evita casos “quase max” que arredondam para baixo e parecem reset)
  const eps = Math.max(1e-9, (_step || 0) * 0.25);
  if (Math.abs(clamped - _max) <= eps) return _max;

  return clamped;
}


  const draggingRef = useRef(false);

const panResponder = useMemo(
  () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,

      onPanResponderGrant: (evt) => {
  if (disabled) return;

  setArmed(true);

  // ✅ ao tocar, se estás no mínimo, "agarra" logo (no telemóvel isto é crucial)
  const isAtMin = Math.abs(valueRef.current - minRef.current) < 1e-9;

  if (isAtMin) {
    draggingRef.current = true;
    setDragging(true);

    // opcional: se quiseres que ao tocar no fundo não fique preso no 0,
    // podes usar um pequeno offset para cima (ex.: -2)
    const newVal = yToValue(evt.nativeEvent.locationY);
    onChangeRef.current(newVal);
  } else {
    // comportamento atual (não cresce no double-tap)
    draggingRef.current = false;
  }
},

onPanResponderMove: (evt, gesture) => {
  if (disabled) return;

  // ✅ se já estamos a arrastar (ex.: arrancou no mínimo), atualiza logo
  if (draggingRef.current) {
    const newVal = yToValue(evt.nativeEvent.locationY);
    onChangeRef.current(newVal);
    return;
  }

  // ✅ caso não esteja a arrastar ainda, só começa quando há movimento real
  const moved = Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
  if (!moved) return;

  draggingRef.current = true;
  setDragging(true);

  const newVal = yToValue(evt.nativeEvent.locationY);
  onChangeRef.current(newVal);
},

      onPanResponderRelease: (_evt, gesture) => {
        const moved = Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;

        if (draggingRef.current) {
          draggingRef.current = false;
          setDragging(false);
          // ✅ foi drag normal, não faz lógica de double-tap aqui
        } else {
          // ✅ isto foi TAP (ou double-tap)
          const isAtMin = Math.abs(valueRef.current - minRef.current) < 1e-9;
          const canDoubleTap = armed && !isAtMin;

          const now = Date.now();
          const dt = now - lastTapRef.current;

          if (dt < 260 && canDoubleTap) {
            lastTapRef.current = 0;
            onDoubleTap?.(); // sem mexer valor
          } else {
            lastTapRef.current = now;
          }
        }

        // Se está no mínimo, desarma (fica pequeno)
        const isAtMin = Math.abs(valueRef.current - minRef.current) < 1e-9;
        if (isAtMin) setArmed(false);
      },

      onPanResponderTerminate: () => {
        draggingRef.current = false;
        setDragging(false);

        const isAtMin = Math.abs(valueRef.current - minRef.current) < 1e-9;
        if (isAtMin) setArmed(false);
      },

      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }),
  [trackH, armed, disabled]
);


  return (
    <View style={vstyles.wrap}>
      <View
      ref={trackRef}
  style={vstyles.trackWrap}
  onLayout={(e: LayoutChangeEvent) => {
  setTrackH(e.nativeEvent.layout.height);

  // mede o topo real no ecrã (para usar pageY)
  requestAnimationFrame(() => {
    trackRef.current?.measureInWindow((_x, yWin) => {
      trackTopRef.current = yWin;
    });
  });
}}

  {...panResponder.panHandlers}
>
  <View style={vstyles.track} />

      <View
            pointerEvents="none"
            style={[
             vstyles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            top: y - thumbSize / 2,
          },
         ]}
       />
      </View>      
    </View>
  );
}

const vstyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  trackWrap: {
    height: 300, // podes aumentar/diminuir para bater com o sketch
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    width: 10,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: '#c0c0c0',
  },
  thumb: {
    position: 'absolute',
    backgroundColor: '#111',
  },
  hint: { marginTop: 8, fontSize: 12, color: '#555' },
});

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function TesteRapidoScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  const [modo, setModo] = useState<ModoTeste>('TODOS');
  const [invertido, setInvertido] = useState(false);
  const [valores, setValores] = useState<ValoresTR>({});
  const [repetirArmado, setRepetirArmado] = useState(false);

  const { folhaParams } = route.params as RootStackParamList['TesteRapido'];

  const paramsAtivos = useMemo(() => {
    if (modo === 'PH_CL') return PARAMS_ALL.filter((p) => p.key === 'cloro_livre' || p.key === 'ph');
    return PARAMS_ALL;
  }, [modo]);

  const [idx, setIdx] = useState(0);
  const paramAtual = paramsAtivos[idx];

  const keyAtual = paramAtual?.key as ParamKey;

  const [finalizado, setFinalizado] = useState(false);

// obrigatórios
const isObrigatorio = (k: ParamKey) => k === 'cloro_livre' || k === 'ph';

// ✅ Saltar só quando não é modo PH_CL e não é obrigatório
const podeSaltar = modo !== 'PH_CL' && !isObrigatorio(keyAtual);

// ✅ validação de "tem número"
const temValorNumero = (k: ParamKey) => typeof valores[k] === 'number';

const obrigatoriosOk = temValorNumero('cloro_livre') && temValorNumero('ph');

// ✅ Aceitar final:
// - PH_CL: só precisa dos 2
// - TODOS: precisa estar finalizado + ter os 2 obrigatórios
const podeAceitarFinal = modo === 'PH_CL' ? obrigatoriosOk : (finalizado && obrigatoriosOk);

  const currentValue = (valores[paramAtual.key] ?? paramAtual.min) as number;
  const currentValueRef = useRef<number>(currentValue);

  useEffect(() => {
      currentValueRef.current = currentValue;
}, [currentValue]);

  const isUltimo = idx === paramsAtivos.length - 1;
  const valorUltimo = valores[paramAtual.key];
  
 

  const obrigatorioAtual = isObrigatorio(keyAtual);

// ✅ só podes saltar se NÃO for obrigatório
const podeSaltarLogico = !finalizado && !obrigatorioAtual;



  const lastKey = paramsAtivos[paramsAtivos.length - 1]?.key;
  const ultimoRegistado = lastKey ? typeof valores[lastKey] === 'number' : false;

  const sliderValue = finalizado ? paramAtual.min : currentValue;
  const sliderDisabled = finalizado;

  const dynamicColor = useMemo(() => {
    return interpolateColor(currentValue, paramAtual.anchors);
  }, [currentValue, paramAtual.anchors]);

  function saltarParametro() {
  if (finalizado) return;

  // se for obrigatório, não deixa saltar (mas mostra mensagem)
  if (obrigatorioAtual) {
    Alert.alert('Parâmetro obrigatório', 'Este parâmetro é obrigatório e não pode ser ignorado.');
    return;
  }

  // regista "saltado"
  setValores((prev) => ({ ...prev, [keyAtual]: null }));

  // ✅ SE É O ÚLTIMO: finaliza (desbloqueia Aceitar valores)
  if (isUltimo) {
    setFinalizado(true);
    return;
  }

  // senão, avança
  setIdx((prev) => Math.min(prev + 1, paramsAtivos.length - 1));
}



  function aceitarValorAtual(vFromSlider?: number) {
  const v =
    typeof vFromSlider === 'number'
      ? vFromSlider
      : currentValueRef.current; // ✅ valor mais fiável

  const key = paramAtual.key;

  const isObrigatorio = (key: string) => key === 'cloro_livre' || key === 'ph';

// ✅ Saltar:
// - nunca no modo PH_CL
// - nunca em cloro_livre ou ph
const podeSaltar = modo !== 'PH_CL' && !isObrigatorio(paramAtual.key);


  setValores((prev) => ({ ...prev, [key]: v }));

  const isUltimoAgora = idx === paramsAtivos.length - 1;
  if (isUltimoAgora) {
    setFinalizado(true);
    return;
  }

  setIdx((prev) => {
    const next = prev + 1;
    return next >= paramsAtivos.length ? prev : next;
  });
}

function repetir() {
  // 2º clique seguido -> apaga tudo
  if (repetirArmado) {
    setValores({});
    setIdx(0);
    setFinalizado(false);
    setRepetirArmado(false);
    return;
  }

  // 1º clique -> apaga último parâmetro preenchido/saltado
  for (let i = paramsAtivos.length - 1; i >= 0; i--) {
    const k = paramsAtivos[i].key;
    if (k in valores) {
      setValores((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
      setIdx(i);
      setFinalizado(false);
      setRepetirArmado(true);
      return;
    }
  }

  // se não houver nada, só arma (ou ignora)
  setRepetirArmado(true);
}

  
  function aceitarValoresFinal() {
  const folhaParams = (route.params as any)?.folhaParams;
  if (!folhaParams) return;

  if (!podeAceitarFinal) {
    Alert.alert(
      'Falta preencher',
      modo === 'PH_CL'
        ? 'Preenche Cloro Livre e pH antes de aceitar.'
        : 'Termina o Teste Rápido (ou salta os opcionais) e garante Cloro Livre + pH preenchidos.'
    );
    return;
  }

  // ✅ valoresClean mantém null (saltado) e arredonda números
  const valoresClean = Object.fromEntries(
    Object.entries(valores).map(([k, v]) => [
      k,
      typeof v === 'number' ? Number(v.toFixed(2)) : v,
    ])
  );

  console.log('✅ [TesteRapido] a enviar testeRapido:', valoresClean);

  navigation.dispatch(
    CommonActions.navigate({
      name: 'FolhaManutencao',
      params: {
        ...folhaParams,
        testeRapido: valoresClean,
        fromTesteRapido: true,
      },
      merge: true,
    })
  );

  // 2) Agora sim, volta (já com os params “colados” na Folha)
}



useEffect(() => {
  setFinalizado(false);
}, [idx, modo]);

const BOX_W = 100;
const BOX_H = 300;
const TEX_W = 300;
const TEX_H = 950;


  /* =========================================================
     2) RETURN
  ========================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
            <Text style={styles.topBtnText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => {
                setModo('PH_CL');
                setIdx(0);
              }}
              style={[styles.modePill, modo === 'PH_CL' && styles.modePillActive]}
            >
              <Text style={[styles.modePillText, modo === 'PH_CL' && styles.modePillTextActive]}>
                Cl livre + pH
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModo('TODOS');
                setIdx(0);
              }}
              style={[styles.modePill, modo === 'TODOS' && styles.modePillActive]}
            >
              <Text style={[styles.modePillText, modo === 'TODOS' && styles.modePillTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setInvertido((v) => !v)} style={styles.topBtn}>
            <Text style={styles.topBtnText}>Invert</Text>
          </TouchableOpacity>
        </View>

        {/* Escala de cores parâmetros */}
        <View style={styles.scaleRow}>
           {paramAtual.anchors.map((a, i) => (
             <View key={`${paramAtual.key}-a-${i}`} style={styles.scaleItem}>
              <View style={[styles.scaleSwatch, { backgroundColor: a.color }]}>
  

  {/* 1) FIBER (por baixo) */}
  <Image
    source={DEFAULT_FIBER_PRESET.source}
    style={{
      position: 'absolute',
      width: OVER,
      height: OVER,
      left: (SWATCH - OVER) / 2,
      top: (SWATCH - OVER) / 2,
      opacity: DEFAULT_FIBER_PRESET.opacity,
      transform: [
        { rotate: `${DEFAULT_FIBER_PRESET.rotationDeg}deg` },
        { scale: DEFAULT_FIBER_PRESET.scale },
      ],
    }}
    resizeMode="cover"
  />

  {/* 2) NOISE (por cima) */}
  <Image
    source={DEFAULT_NOISE_PRESET.source}
    style={{
      position: 'absolute',
      width: OVER,
      height: OVER,
      left: (SWATCH - OVER) / 2,   // centra
      top: (SWATCH - OVER) / 2,    // centra
      opacity: DEFAULT_NOISE_PRESET.opacity,
      transform: [
        { rotate: `${DEFAULT_NOISE_PRESET.rotationDeg}deg` },
        { scale: DEFAULT_NOISE_PRESET.scale },
      ],
    }}
    resizeMode="cover"
  />
</View>


               <Text style={styles.scaleValue}>
                 {paramAtual.key === 'ph' ? a.value.toFixed(1) : String(a.value)}
               </Text>
              </View>
            ))}
        </View>

        {/* Corpo principal — inverter só troca slider ↔ cor */}
        <View style={styles.bodyRow}>
          {invertido ? (
           
            <>
              {/* Slider passa para a esquerda */}
              <View style={styles.sliderColumn}>
                <Text style={styles.sliderHint}>Ajusta a cor{"\n"}2 toques = OK</Text>

                <VerticalThumbSlider
                     min={paramAtual.min}
                     max={paramAtual.max}
                     step={paramAtual.step}
                     value={sliderValue}
                     disabled={sliderDisabled}
                     onChange={(vv: number) => {
                  setValores((prev) => ({ ...prev, [paramAtual.key]: vv }));
                 }}
                  onDoubleTap={() => aceitarValorAtual()}
                 />
               <TouchableOpacity
  disabled={finalizado}
  onPress={() => {
    if (finalizado) return;

    if (obrigatorioAtual) {
      Alert.alert(
        'Parâmetro obrigatório',
        'Este parâmetro é obrigatório e não pode ser ignorado.'
      );
      return;
    }

    saltarParametro();
  }}
  style={[
    styles.saltarBtnRight,
    finalizado && { opacity: 0.35 },
  ]}
>
  <Text style={styles.saltarBtnText}>Saltar</Text>
</TouchableOpacity>

              </View>

              {/* Coluna do meio (igual) */}
              <View style={styles.listColumn}>
                <Text style={styles.listTitle}>Valores</Text>
                  {paramsAtivos.map((p) => {
                  const v = valores[p.key];
                  const show =
                    v === null
                      ? '—'
                        : v === undefined
                          ? ''
                        : p.key === 'ph'
                      ? Number(v).toFixed(1)
                    : String(roundToStepForDisplay(Number(v), p.step));

                  const isActive = p.key === paramAtual.key;

                return (
                  <View key={p.key} style={[styles.listRow, isActive && styles.listRowActive]}>
                    <Text style={[styles.listLabel, isActive && styles.listLabelActive]}>{p.short}</Text>
                    <Text style={[styles.listValue, isActive && styles.listValueActive]}>{show}</Text>
                  </View>
                  );
                 })}
              </View>
             
              {/* Cor passa para a direita */}
<View style={styles.colorColumn} pointerEvents="none">
  <Text style={styles.paramTitle}>{paramAtual.label}</Text>

  <View style={styles.colorBoxWrap}>
    <View style={[styles.colorBox, { backgroundColor: dynamicColor }]}>

      {/* 1) FIBER (por baixo) */}
      <Image
        source={BOX_FIBER_PRESET.source}
        style={{
          position: 'absolute',
          width: TEX_W,
          height: TEX_H,
          left: (BOX_W - TEX_W) / 2,
          top: (BOX_H - TEX_H) / 2,
          opacity: BOX_FIBER_PRESET.opacity,
          transform: [
            { rotate: `${BOX_FIBER_PRESET.rotationDeg}deg` },
            { scale: BOX_FIBER_PRESET.scale },
          ],
        }}
        resizeMode="cover"
      />

      {/* 2) NOISE (por cima) */}
      <Image
        source={BOX_NOISE_PRESET.source}
        style={{
          position: 'absolute',
          width: TEX_W,
          height: TEX_H,
          left: (BOX_W - TEX_W) / 2,
          top: (BOX_H - TEX_H) / 2,
          opacity: BOX_NOISE_PRESET.opacity,
          transform: [
            { rotate: `${BOX_NOISE_PRESET.rotationDeg}deg` },
            { scale: BOX_NOISE_PRESET.scale },
          ],
        }}
        resizeMode="cover"
      />
    </View>

    <View style={styles.valueBadge}>
      <Text style={styles.valueBadgeText}>
        {paramAtual.key === 'ph'
          ? Number(currentValue).toFixed(1)
          : String(roundToStepForDisplay(Number(currentValue), paramAtual.step))}
      </Text>
    </View>
  </View>
</View>

            </>
          ) : (
            <>
              {/* Cor na esquerda */}
<View style={styles.colorColumn} pointerEvents="none">
  <Text style={styles.paramTitle}>{paramAtual.label}</Text>

  <View style={styles.colorBoxWrap}>
    <View style={[styles.colorBox, { backgroundColor: dynamicColor }]}>

      {/* 1) FIBER (por baixo) */}
      <Image
        source={BOX_FIBER_PRESET.source}
        style={{
          position: 'absolute',
          width: TEX_W,
          height: TEX_H,
          left: (BOX_W - TEX_W) / 2,
          top: (BOX_H - TEX_H) / 2,
          opacity: BOX_FIBER_PRESET.opacity,
          transform: [
            { rotate: `${BOX_FIBER_PRESET.rotationDeg}deg` },
            { scale: BOX_FIBER_PRESET.scale },
          ],
        }}
        resizeMode="cover"
      />

      {/* 2) NOISE (por cima) */}
      <Image
        source={BOX_NOISE_PRESET.source}
        style={{
          position: 'absolute',
          width: TEX_W,
          height: TEX_H,
          left: (BOX_W - TEX_W) / 2,
          top: (BOX_H - TEX_H) / 2,
          opacity: BOX_NOISE_PRESET.opacity,
          transform: [
            { rotate: `${BOX_NOISE_PRESET.rotationDeg}deg` },
            { scale: BOX_NOISE_PRESET.scale },
          ],
        }}
        resizeMode="cover"
      />
    </View>

    <View style={styles.valueBadge}>
      <Text style={styles.valueBadgeText}>
        {paramAtual.key === 'ph'
          ? Number(currentValue).toFixed(1)
          : String(roundToStepForDisplay(Number(currentValue), paramAtual.step))}
      </Text>
    </View>
  </View>
</View>


              {/* Coluna do meio (igual) */}
              <View style={styles.listColumn}>
                <Text style={styles.listTitle}>Valores</Text>
                  {paramsAtivos.map((p) => {
                  const v = valores[p.key];
                  const show =
                    v === null
                      ? '—'
                        : v === undefined
                          ? ''
                        : p.key === 'ph'
                      ? Number(v).toFixed(1)
                    : String(roundToStepForDisplay(Number(v), p.step));

                  const isActive = p.key === paramAtual.key;

               return (
                 <View key={p.key} style={[styles.listRow, isActive && styles.listRowActive]}>
                   <Text style={[styles.listLabel, isActive && styles.listLabelActive]}>{p.short}</Text>
                   <Text style={[styles.listValue, isActive && styles.listValueActive]}>{show}</Text>
                 </View>
                 );
                })}
              </View>

              {/* Slider na direita */}
              <View style={styles.sliderColumn}>
                <Text style={styles.sliderHint}>Ajusta a cor{"\n"}2 toques = OK</Text>
                <VerticalThumbSlider
                     min={paramAtual.min}
                     max={paramAtual.max}
                     step={paramAtual.step}
                     value={sliderValue}
                     disabled={sliderDisabled}
                     onChange={(vv: number) => {
                     setValores((prev) => ({ ...prev, [paramAtual.key]: vv }));
                    }}
                     onDoubleTap={() => aceitarValorAtual()}
                    />
                <TouchableOpacity
  disabled={finalizado}
  onPress={() => {
    if (finalizado) return;

    if (obrigatorioAtual) {
      Alert.alert(
        'Parâmetro obrigatório',
        'Este parâmetro é obrigatório e não pode ser ignorado.'
      );
      return;
    }

    saltarParametro();
  }}
  style={[
    styles.saltarBtnRight,
    finalizado && { opacity: 0.35 },
  ]}
>
  <Text style={styles.saltarBtnText}>Saltar</Text>
</TouchableOpacity>

              </View>
            </>
          )}
        </View>

        {/* Rodapé */}
        <View style={styles.footerRow}>
          <TouchableOpacity
  onPress={() => {
    // ✅ 1º clique: apaga só o valor atual e recua 1 passo (se possível)
    setValores((prev) => ({ ...prev, [keyAtual]: undefined as any }));
    setFinalizado(false);

    setIdx((prev) => (prev > 0 ? prev - 1 : 0));
  }}
  style={[styles.footerBtn, styles.footerBtnSecondary]}
>
  <Text style={[styles.footerBtnText, styles.footerBtnTextSecondary]}>
    Repetir
  </Text>
</TouchableOpacity>



          <TouchableOpacity
  disabled={!podeAceitarFinal}
  onPress={aceitarValoresFinal}
  style={[
    styles.footerBtn,
    styles.footerBtnPrimary,
    !podeAceitarFinal && styles.footerBtnDisabled,
    podeAceitarFinal && styles.footerBtnHighlight,
  ]}
>
  <Text style={[styles.footerBtnText, styles.footerBtnTextPrimary]}>
    Aceitar valores
  </Text>
</TouchableOpacity>

        </View>

        <Text style={styles.subTitle}>
          powered by GESPOOL
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   3) STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E9E9E9' },
  container: { flex: 1, padding: 12 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  topBtnText: { fontSize: 14, fontWeight: '600' },

  modeRow: { flexDirection: 'row', gap: 8 },
  modePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#D7D7D7',
  },
  modePillActive: { backgroundColor: '#111' },
  modePillText: { fontSize: 13, fontWeight: '600', color: '#111' },
  modePillTextActive: { color: '#fff' },

  bodyRow: {
    position: 'relative', // ✅ adiciona isto
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },

  colorColumn: { flex: 1.1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  listColumn:  { flex: 0.9, padding: 10, borderRadius: 12, backgroundColor: '#F2F2F2', justifyContent: 'center' },
  sliderColumn: { flex: 1.1, alignItems: 'center', justifyContent: 'center', gap: 14 },

  paramTitle: { fontSize: 16, fontWeight: '800' },

  colorBoxWrap: { alignItems: 'center', justifyContent: 'center' },
  colorBox: {
    width: 100,
    height: 300,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  valueBadge: {
    width: 64,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    marginTop: 25,
  },
  valueBadgeText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  saltarBtn: {
    width: 64,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbb',
    marginTop: 12,
    marginBottom: 15,
  },
  saltarBtnText: { fontWeight: '700' },

  sliderHint: { fontSize: 12, color: '#444', lineHeight: 16, textAlign: 'center', fontWeight: '700' },

  acceptBtn: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#1F9E9B',
  },
  acceptBtnText: { color: '#fff', fontWeight: '800' },

  listTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  listLabel: { fontWeight: '800' },
  listValue: { fontWeight: '800' },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  footerBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  footerBtnPrimary: { backgroundColor: '#111' },
  footerBtnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#bbb' },
  footerBtnText: { fontWeight: '900' },
  footerBtnTextPrimary: { color: '#fff' },
  footerBtnTextSecondary: { color: '#111' },

  
scaleRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'flex-start',
  gap: 10,
  paddingHorizontal: 16,
  marginBottom: 6,
},

scaleSwatch: {
  width: SWATCH,
  height: SWATCH,
  borderRadius: 6,
  position: 'relative',
  overflow: 'hidden',
},
scaleItem: {
  alignItems: 'center',
},
scaleValue: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: '700',
  color: '#222',
},
  footerBtnHighlight: {
    backgroundColor: '#22b4b4ff', // destaca (podes trocar)
    borderWidth: 2,
    borderColor: '#000',
  },
  footerBtnDisabled: {
  opacity: 0.35,
  },
  listRowActive: {
  backgroundColor: '#DDF7F7',
  borderRadius: 10,
  },
  listLabelActive: {
    fontWeight: '900',
  },
  listValueActive: {
    fontWeight: '900',
  },
  saltarBtnRight: {
    width: 64,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbb',
    marginTop: 12,
    marginBottom: 15,
  },
  subTitle: {
  fontSize: 12,
  fontStyle: 'italic',
  color: '#444',
  marginTop: 10,
  marginBottom: 30,
  textAlign: 'center'
},
});

