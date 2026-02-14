// components/TaylorChart.tsx
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Text as SvgText, Circle, Rect } from 'react-native-svg';
import { buildTaylorGeometry, yLog, yLinear } from '../utils/taylor';

type Props = {
  width?: number;
  height?: number;
  ph?: number | null;
  tac?: number | null; // alcalinidade
  th?: number | null;  // dureza
  // “alvos” (opcional)
  phAlvo?: number | null;
  tacAlvo?: number | null;
  thAlvo?: number | null;
};

export default function TaylorChart({
  width = 220,
  height = Math.round(220 * 1.78), // ✅ mais alto por defeito
  ph, tac, th,
  phAlvo, tacAlvo, thAlvo,
}: Props) {
  const aspect = 1.78;
  const finalHeight = height ?? Math.round(width * aspect) + 20; // +20 folga/padding

  const padTop = 22;
  const padBottom = 10;

  const w = width;
  const h = finalHeight - padTop - padBottom;

  const g = useMemo(
    () => buildTaylorGeometry({ ph, tac, th, phAlvo, tacAlvo, thAlvo }, w, h),
    [ph, tac, th, phAlvo, tacAlvo, thAlvo, w, h]
  );

  const yOff = padTop;
  const y = (yy: number) => yy + yOff;
  const xOff = 0; // ajuste fino horizontal (podes afinar depois)
  const x = (xx: number) => xx + xOff;

  const phBandHalfWidth = 12; // controla o "aperto" da barra (ajusta à vontade)

  const xPhCenter = x(g.xPH);
  const xPhLeft = xPhCenter - phBandHalfWidth;
  const xPhRight = xPhCenter + phBandHalfWidth;

  // largura da faixa (ajusta fino se quiseres)
  // ✅ Faixas TAC/TH com a MESMA largura do pH (metade para cada lado)
  const tacBandHalfWidth = 12;
  const thBandHalfWidth  = 12; // reutiliza o mesmo aperto

  const xTacCenter = x(g.xTac);
  const xThCenter  = x(g.xTH);

  const xTacLeft  = xTacCenter - tacBandHalfWidth;
  const xTacRight = xTacCenter + tacBandHalfWidth;

  const xThLeft   = xThCenter - thBandHalfWidth;
  const xThRight  = xThCenter + thBandHalfWidth;



  const tacTicks = [1000, 600, 400, 300, 250, 200, 150, 120, 100, 80, 60, 40, 30, 20];
  const phTicks  = [6.0, 6.6, 6.8, 7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 9.2];


  return (
    <View style={{ width, height: finalHeight }}>
      <Svg width={width} height={finalHeight}>
        {/* Eixos */}
        <Line x1={g.xTac} y1={y(0)} x2={g.xTac} y2={y(h)} stroke="#777" strokeWidth={2} />
        <Line x1={g.xPH}  y1={y(0)} x2={g.xPH}  y2={y(h)} stroke="#777" strokeWidth={2} />
        <Line x1={g.xTH}  y1={y(0)} x2={g.xTH}  y2={y(h)} stroke="#777" strokeWidth={2} />

        <SvgText x={g.xTac} y={12} fontSize="12" fill="#444" textAnchor="start">TAC</SvgText>
        <SvgText x={g.xPH}  y={12} fontSize="12" fill="#444" textAnchor="middle">pH</SvgText>
        <SvgText x={g.xTH}  y={12} fontSize="12" fill="#444" textAnchor="end">TH</SvgText>

{/* Faixa verde de referência pH 7.0–7.4 */}
{(() => {
  const y70 = yLinear(7.0, h);
  const y74 = yLinear(7.4, h);

  const yTop = y(Math.min(y70, y74));
  const yBot = y(Math.max(y70, y74));

  return (
    <Rect
      x={xPhLeft}
      y={yTop}
      width={xPhRight - xPhLeft}
      height={Math.max(1, yBot - yTop)}
      fill="#2E7D32"
      opacity={0.25}
    />
  );
})()}

{/* Faixa verde de referência TAC 80–150 */}
{(() => {
  const y80  = yLog(80, h);
  const y150 = yLog(150, h);

  const yTop = y(Math.min(y80, y150));
  const yBot = y(Math.max(y80, y150));

  return (
    <Rect
      x={xTacLeft}
      y={yTop}
      width={xTacRight - xTacLeft}
      height={Math.max(1, yBot - yTop)}
      fill="#2E7D32"
      opacity={0.25}
    />
  );
})()}

{/* Faixa verde de referência TH 175–300 */}
{(() => {
  const y175 = yLog(175, h);
  const y300 = yLog(300, h);

  const yTop = y(Math.min(y175, y300));
  const yBot = y(Math.max(y175, y300));

  return (
    <Rect
      x={xThLeft}
      y={yTop}
      width={xThRight - xThLeft}
      height={Math.max(1, yBot - yTop)}
      fill="#2E7D32"
      opacity={0.25}
    />
  );
})()}

        {/* Ticks TAC */}
{tacTicks.map((v) => {
  const yy = y(yLog(v, h));
  return (
    <React.Fragment key={`tac-${v}`}>
      <Line x1={g.xTac} y1={yy} x2={g.xTac + 10} y2={yy} stroke="#999" strokeWidth={1} />
      <SvgText x={g.xTac + 12} y={yy + 4} fontSize="10" fill="#666">{v}</SvgText>
    </React.Fragment>
  );
})}

{/* Ticks pH */}
{phTicks.map((v) => {
  const yy = y(yLinear(v, h));
  return (
    <React.Fragment key={`ph-${v}`}>
      <Line x1={g.xPH - 8} y1={yy} x2={g.xPH + 8} y2={yy} stroke="#bbb" strokeWidth={1} />
      <SvgText x={g.xPH + 12} y={yy + 4} fontSize="10" fill="#666">{v.toFixed(1)}</SvgText>
    </React.Fragment>
  );
})}

{/* Ticks TH */}
{tacTicks.map((v) => {
  const yy = y(yLog(v, h));
  return (
    <React.Fragment key={`th-${v}`}>
      <Line x1={g.xTH - 10} y1={yy} x2={g.xTH} y2={yy} stroke="#999" strokeWidth={1} />
      <SvgText x={g.xTH - 12} y={yy + 4} fontSize="10" fill="#666" textAnchor="end">{v}</SvgText>
    </React.Fragment>
  );
})}


        {/* Linhas atuais */}
        {g.okAtual && g.pPH && g.pTac && g.pTH && (
          <>
            <Line
              x1={g.pTac.x} y1={y(g.pTac.y)}
              x2={g.pPH.x}  y2={y(g.pPH.y)}
              stroke={g.corAtual}
              strokeWidth={3}
            />
            <Line
              x1={g.pPH.x}  y1={y(g.pPH.y)}
              x2={g.pTH.x}  y2={y(g.pTH.y)}
              stroke={g.corAtual}
              strokeWidth={3}
            />
            <Circle cx={g.pPH.x} cy={y(g.pPH.y)} r={4} fill={g.corAtual} />
          </>
        )}

        {/* Linhas alvo (ISL) — verde escuro */}
        {g.okAlvo && g.pPHAlvo && g.pTacAlvo && g.pTHAlvo && (
          <>
            <Line
              x1={g.pTacAlvo.x} y1={y(g.pTacAlvo.y)}
              x2={g.pPHAlvo.x}  y2={y(g.pPHAlvo.y)}
              stroke="#1B5E20"
              strokeWidth={3}
            />
            <Line
              x1={g.pPHAlvo.x}  y1={y(g.pPHAlvo.y)}
              x2={g.pTHAlvo.x}  y2={y(g.pTHAlvo.y)}
              stroke="#1B5E20"
              strokeWidth={3}
            />
            <Circle cx={g.pPHAlvo.x} cy={y(g.pPHAlvo.y)} r={4} fill="#1B5E20" />
          </>
        )}
      </Svg>
    </View>
  );
}
