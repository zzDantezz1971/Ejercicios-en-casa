/* Catálogo de ejercicios en formato compacto.
   Claves: n = nombre, z = zona, g = título de subgrupo, b = etiquetas.
   El resto describe el movimiento (ver src/figure/poses.ts): ángulos de cada articulación por fotograma. */
import type { Badge, MotionSpec, PropHelpers, PropOp, SectionId } from '../domain/types';

export type Joints = Record<string, [number, number]>;
export type RawItem = MotionSpec & { n?: string; z?: string; g?: string; b?: Badge[]; top?: string };
export interface RawSection { id: SectionId; title: string; note: string; groups?: boolean; items: RawItem[] }

/* Posturas reutilizables */
export const SUP = { tl: 180, ua: 0, fa: 0 };                                    // tumbado boca arriba, cabeza a la izquierda
export const KNEES = { thL: -60, snL: 60, thR: -56, snR: 62 };                   // rodillas dobladas, pies en el suelo
export const PRONE = { tl: 0, th: 180, sn: 180, ft: 180 };                        // boca abajo, cabeza a la derecha
export const QUAD = { tl: -18, ua: 90, fa: 90, th: 90, sn: 180, ft: 180 };        // cuadrupedia
export const LYB = { tl: 180, th: 5, sn: 90 };                                   // tumbado en banco plano
export const SEAT = { th: 5, sn: 90 };                                           // sentado en banco
export const ROWB = { tl: -20, uaL: 90, faL: 90, thL: 90, snL: 180, ftL: 180, thR: 92, snR: 92 }; // rodilla y mano en el banco
export const PLH = { tl: -22, ua: 90, fa: 90, th: 158, sn: 158, ft: 90 };         // plancha alta
export const PLF = { tl: -11.5, ua: 90, fa: 0, th: 168.5, sn: 168.5, ft: 90 };    // plancha de antebrazos
export const benchLie = (J: Joints, P: PropHelpers): PropOp[] => P.benchFlat(J.head[0] - 4, J.pel[0] + 14);
export const benchRow = (J: Joints, P: PropHelpers): PropOp[] => P.benchFlat(J.anL[0] - 6, J.haL[0] + 10).map((o) => ({ ...o, z: -9, dep: 18 }));
export const benchSeat = (J: Joints, P: PropHelpers): PropOp[] => P.benchFlat(J.pel[0] - 22, J.pel[0] + 18);
export const inclineBack = (J: Joints, P: PropHelpers): PropOp[] => {
  const a: [number, number] = [J.pel[0] + 6.4 + 4 * 0.71, J.pel[1] + 6.4 - 4 * 0.71];
  const b: [number, number] = [a[0] + 40 * 0.71, a[1] - 40 * 0.71];
  return [...P.line(a, b, 7), ...P.line(a, [a[0], 0], 4), ...P.line([a[0] - 12, 0], [a[0] + 12, 0], 4)];
};

export const RAW_SECTIONS: RawSection[] = [
{id:'calentamiento',title:'Calentamiento',note:'Has pedido unos 10. Te propongo 12 para que puedas descartar.',items:[
 {n:'Marcha en el sitio',z:'Cuerpo entero',f:[
   [{thR:0,snR:90,uaL:45,faL:-30,uaR:125,faR:100},0,420],[{},0,420],
   [{thL:0,snL:90,uaR:45,faR:-30,uaL:125,faL:100},0,420],[{},0,420]]},
 {n:'Saltos de tijera (jumping jacks)',z:'Cuerpo entero',v:'front',f:[
   [{uaL:100,faL:95,uaR:80,faR:85,thL:93,snL:93,thR:87,snR:87},80,360],
   [{uaL:230,faL:245,uaR:-50,faR:-65,thL:108,snL:104,thR:72,snR:76},80,360]]},
 {n:'Círculos de brazos',z:'Hombros',v:'front',per:1300,fn:t=>{const a=t*Math.PI*2,s=Math.sin(a),c=(1+Math.cos(a))/2;
   return {uaL:180+9*s,faL:180+9*s+16*c,uaR:-9*s,faR:-9*s-16*c};}},
 {n:'Abrir y cerrar brazos (abrazos)',z:'Pecho y hombros',v:'front',f:[
   [{uaL:180,faL:180,uaR:0,faR:0},120,650],[{uaL:180,faL:180,uaR:0,faR:0,saL:-.5,saR:-.5},120,650]]},
 {n:'Giros de tronco',z:'Columna',v:'front',f:[
   [{thL:96,snL:96,thR:84,snR:84,uaL:180,faL:180,uaR:0,faR:0,saR:-.55,hd:-96},80,650],
   [{thL:96,snL:96,thR:84,snR:84,uaL:180,faL:180,uaR:0,faR:0,saL:-.55,hd:-84},80,650]]},
 {n:'Círculos de cadera',z:'Cadera y lumbar',v:'front',per:2600,plant:'anL',fn:t=>{const c=Math.cos(t*Math.PI*2);
   return {thL:96+8*c,snL:96+8*c,thR:84+8*c,snR:84+8*c,tl:-90-9*c,uaL:130,faL:25,uaR:50,faR:155};}},
 {n:'Inclinaciones laterales de tronco',z:'Costados',v:'front',f:[
   [{tl:-95,tu:-116,uaR:-118,faR:-158,uaL:118,faL:70},250,800],[{},100,800],
   [{tl:-85,tu:-64,uaL:298,faL:338,uaR:62,faR:110},250,800],[{},100,800]]},
 {n:'Talones al glúteo',z:'Piernas',f:[
   [{thR:100,snR:215,uaL:60,faL:-40,uaR:120,faR:75},0,330],[{},0,330],
   [{thL:100,snL:215,uaR:60,faR:-40,uaL:120,faL:75},0,330],[{},0,330]]},
 {n:'Sentadillas sin peso',z:'Piernas y glúteos',plant:'anR',f:[
   [{},200,900],[{tl:-55,th:5,sn:115,ua:0,fa:0,hd:-60},200,900]]},
 {n:'Zancadas alternas',z:'Piernas y glúteos',f:[
   [{ua:110,fa:-20},150,750],[{ua:110,fa:-20,thR:15,snR:95,thL:115,snL:175,ftL:40},200,750],
   [{ua:110,fa:-20},150,750],[{ua:110,fa:-20,thL:15,snL:95,thR:115,snR:175,ftR:40},200,750]]},
 {n:'Balanceo de pierna adelante y atrás',z:'Cadera',f:[
   [{ua:110,fa:-20,thR:-25,snR:-15},60,700],[{ua:110,fa:-20,thR:150,snR:160},60,700]]},
 {n:'Puñetazos al aire',z:'Brazos y hombros',f:[
   [{thL:82,snL:96,thR:100,snR:86,uaR:0,faR:0,uaL:110,faL:-100,tw:-22},80,260],
   [{thL:82,snL:96,thR:100,snR:86,ua:110,fa:-100},40,260],
   [{thL:82,snL:96,thR:100,snR:86,uaL:0,faL:0,uaR:110,faR:-100,tw:22},80,260],
   [{thL:82,snL:96,thR:100,snR:86,ua:110,fa:-100},40,260]]},
]},

{id:'pesas',title:'Fuerza',note:'Ordenados por zona, de arriba abajo. Los de espalda van apoyados en el banco para no cargar la zona lumbar.',groups:true,items:[
 {g:'Cuello y trapecio'},
 {n:'Encogimientos de hombros',z:'Trapecio',db:'both',f:[
   [{},300,700],[{sa:.82,hd:-96},500,700]]},
 {g:'Hombros'},
 {n:'Press de hombros sentado',z:'Hombros',v:'front',db:'both',anchor:{j:'pel',y:-40},
   props:(J,P)=>[...P.rect(J.pel[0]-15,J.neck[1]-4,30,-34-(J.neck[1]-4),true),...P.rect(J.pel[0]-26,-34,52,6),
     ...P.line([J.pel[0]-20,-29],[J.pel[0]-20,0],4),...P.line([J.pel[0]+20,-29],[J.pel[0]+20,0],4)],f:[
   [{thL:100,thR:80,sTh:.15,uaL:180,faL:270,uaR:0,faR:-90},150,1000],
   [{thL:100,thR:80,sTh:.15,uaL:260,faL:265,uaR:-80,faR:-85},150,1000]]},
 {n:'Elevaciones laterales',z:'Hombros',v:'front',db:'both',f:[
   [{uaL:100,faL:100,uaR:80,faR:80},150,900],[{uaL:180,faL:185,uaR:0,faR:-5},150,900]]},
 {n:'Elevaciones frontales',z:'Hombros',db:'both',f:[
   [{},150,900],[{ua:0,fa:0},150,900]]},
 {n:'Pájaros (elevaciones posteriores)',z:'Hombro posterior y espalda alta',db:'both',armsOut:true,
   props:inclineBack,f:[
   [{tl:-45,th:100,sn:100,ua:90,fa:95},150,800],[{tl:-45,th:100,sn:100,ua:120,fa:125,sa:.2},150,800]]},
 {n:'Elevación en Y inclinado',z:'Hombro posterior y espalda alta',db:'both',armsOut:true,plant:'anR',f:[
   [{tl:-18,th:80,sn:100,ua:90,fa:92,hd:-30},200,900],[{tl:-18,th:80,sn:100,ua:-12,fa:-14,sa:.86,hd:-30},400,900]]},
 {g:'Pecho'},
 {n:'Press de banca con mancuernas',z:'Pecho',db:'both',anchor:{j:'pel',y:-40},props:benchLie,f:[
   [{...LYB,ua:-90,fa:-90},150,1000],[{...LYB,ua:30,fa:-90},150,1000]]},
 {n:'Press inclinado con mancuernas',z:'Pecho superior',db:'both',anchor:{j:'pel',y:-40},
   props:(J,P)=>[...P.benchFlat(J.pel[0]-16,J.pel[0]+18),...P.line([J.pel[0]-8,-36],[J.pel[0]-8-54*.82,-36-54*.57],7)],f:[
   [{tl:-145,th:5,sn:90,ua:-100,fa:-100},150,1000],[{tl:-145,th:5,sn:90,ua:60,fa:-95},150,1000]]},
 {n:'Aperturas con mancuernas',z:'Pecho',db:'both',armsOut:true,anchor:{j:'pel',y:-40},props:benchLie,f:[
   [{...LYB,ua:-90,fa:-90},150,1000],[{...LYB,ua:-80,fa:-75,sa:.22},150,1000]]},
 {n:'Pullover con mancuerna',z:'Pecho y espalda',db:'R',anchor:{j:'pel',y:-40},props:benchLie,f:[
   [{...LYB,ua:270,fa:270},150,1100],[{...LYB,ua:195,fa:190},150,1100]]},
 {g:'Espalda'},
 {n:'Remo a una mano apoyado en banco',z:'Espalda',db:'R',anchor:{j:'knL',y:-38},props:benchRow,f:[
   [{...ROWB,uaR:90,faR:90},150,800],[{...ROWB,uaR:205,faR:100},150,800]]},
 {n:'Remo con pecho apoyado en banco inclinado',z:'Espalda',db:'both',
   props:inclineBack,f:[
   [{tl:-45,th:100,sn:100,ua:90,fa:90},150,800],[{tl:-45,th:100,sn:100,ua:205,fa:95},150,800]]},
 {g:'Brazos'},
 {n:'Curl de bíceps',z:'Bíceps',db:'both',f:[
   [{},150,850],[{ua:85,fa:-50},150,850]]},
 {n:'Curl concentrado sentado',z:'Bíceps',db:'R',anchor:{j:'pel',y:-40},props:benchSeat,f:[
   [{...SEAT,tl:-50,tu:-45,uaL:60,faL:40,uaR:85,faR:85},150,900],[{...SEAT,tl:-50,tu:-45,uaL:60,faL:40,uaR:85,faR:-40},150,900]]},
 {n:'Extensión de tríceps por encima de la cabeza',z:'Tríceps',db:'R',anchor:{j:'pel',y:-40},props:benchSeat,f:[
   [{...SEAT,ua:-100,fa:-95},150,1000],[{...SEAT,ua:-100,fa:-250},150,1000]]},
 {n:'Patada de tríceps apoyado en banco',z:'Tríceps',db:'R',anchor:{j:'knL',y:-38},props:benchRow,f:[
   [{...ROWB,uaR:170,faR:90},150,800],[{...ROWB,uaR:170,faR:170},150,800]]},
 {n:'Press francés tumbado',z:'Tríceps',db:'both',anchor:{j:'pel',y:-40},props:benchLie,f:[
   [{...LYB,ua:-105,fa:-105},150,1000],[{...LYB,ua:-105,fa:-190},150,1000]]},
 {n:'Fondos de tríceps en banco',z:'Tríceps',anchor:{j:'haR',y:-37},plant:'haR',
   props:(J,P)=>P.benchFlat(J.haR[0]-44,J.haR[0]+3),f:[
   [{ua:105,fa:100,th:40,sn:30},150,900],[{ua:180,fa:90,th:5,sn:22},150,900]]},
 {g:'Core y zona lumbar'},
 {n:'Inclinaciones laterales con mancuerna',z:'Oblicuos',v:'front',db:'R',b:['caution'],f:[
   [{tl:-84,tu:-68,uaR:90,faR:90,uaL:125,faL:35},150,900],[{tl:-96,tu:-112,uaR:90,faR:90,uaL:125,faL:35},150,900]]},
 {n:'Peso muerto con mancuernas',z:'Espalda baja, glúteos e isquios',db:'both',plant:'anR',b:['caution'],f:[
   [{},250,1100],[{tl:-28,th:78,sn:102,ua:90,fa:90,hd:-40},300,1100]]},
 {g:'Piernas y glúteos'},
 {n:'Sentadilla con mancuernas a los hombros',z:'Piernas y glúteos',db:'both',plant:'anR',f:[
   [{ua:70,fa:-112},200,1000],[{tl:-58,th:5,sn:115,ua:40,fa:-140,hd:-65},250,1000]]},
 {n:'Sentadilla sumo con mancuerna',z:'Aductores, glúteos y piernas',v:'front',db:'R',f:[
   [{thL:118,snL:118,thR:62,snR:62,ftL:170,ftR:10,uaL:74,faL:66,uaR:106,faR:114,zEL:6,zER:6,zHL:14,zHR:14},200,1000],
   [{thL:152,snL:96,thR:28,snR:84,ftL:170,ftR:10,uaL:74,faL:66,uaR:106,faR:114,zEL:6,zER:6,zHL:14,zHR:14,zKL:9,zKR:9,lean:16},300,1000]]},
 {n:'Zancadas hacia delante con mancuernas',z:'Piernas y glúteos',db:'both',f:[
   [{},150,800],[{thR:15,snR:95,thL:115,snL:175,ftL:40},250,800],
   [{},150,800],[{thL:15,snL:95,thR:115,snR:175,ftR:40},250,800]]},
]},

{id:'abdominales',title:'Abdominales',note:'Ordenados por zona, de arriba abajo.',groups:true,items:[
 {g:'Abdomen superior'},
 {n:'Crunch abdominal',z:'Abdomen',mat:1,anchor:{j:'pel',y:-12.1},az:20,el:18,f:[
   [{tl:180,tu:180,hd:184,...KNEES,ua:2,fa:2},350,850],
   [{tl:180,tu:203,hd:214,...KNEES,ua:-10,fa:-10},450,850]]},
 {n:'Crunch con brazos estirados',z:'Abdomen',mat:1,anchor:{j:'pel',y:-12.1},az:20,el:18,f:[
   [{tl:180,tu:180,hd:184,...KNEES,ua:178,fa:178},300,850],
   [{tl:180,tu:204,hd:212,...KNEES,ua:228,fa:226},400,850]]},
 {n:'Crunch con piernas a 90°',z:'Abdomen',mat:1,anchor:{j:'pel',y:-12.1},f:[
   [{tl:180,th:-90,sn:0,ua:10,fa:10},150,900],[{tl:180,tu:202,hd:208,th:-90,sn:0,ua:-18,fa:-18},250,900]]},
 {g:'Oblicuos'},
 {n:'Bicicleta',z:'Oblicuos',mat:1,f:[
   [{tl:180,tu:205,ua:-80,fa:200,thR:-120,snR:-30,thL:-20,snL:-15},60,480],
   [{tl:180,tu:200,ua:-80,fa:200,thL:-120,snL:-30,thR:-20,snR:-15},60,480]]},
 {n:'Giros rusos',z:'Oblicuos',v:'front',noGround:1,mat:'top',f:[
   [{lean:-22,tw:-42,sa:.8,uaL:85,faL:-45,uaR:95,faR:-135,zEL:12.6,zER:12.6,zHL:24.9,zHR:24.9,thL:-125,snL:95,thR:-55,snR:85,sTh:.6},120,620],
   [{lean:-22,tw:42,sa:.8,uaL:85,faL:-45,uaR:95,faR:-135,zEL:12.6,zER:12.6,zHL:24.9,zHR:24.9,thL:-125,snL:95,thR:-55,snR:85,sTh:.6},120,620]]},
 {n:'Toques de talón',z:'Oblicuos',v:'top',mat:'top',top:'Vista desde arriba',f:[
   [{thL:102,snL:96,thR:70,snR:76,sTh:.55,sSh:.15,tu:-48,hd:-52,uaR:90,faR:90,saR:.945,uaL:116,faL:108},180,520],[{thL:102,snL:96,thR:78,snR:84,sTh:.55,sSh:.15,uaL:102,faL:98,uaR:78,faR:82},60,520],
   [{thL:110,snL:104,thR:78,snR:84,sTh:.55,sSh:.15,tu:-132,hd:-128,uaL:90,faL:90,saL:.945,uaR:64,faR:72},180,520],[{thL:102,snL:96,thR:78,snR:84,sTh:.55,sSh:.15,uaL:102,faL:98,uaR:78,faR:82},60,520]]},
 {n:'Plancha lateral',z:'Oblicuos',v:'front',mat:1,f:[
   [{tl:-162,th:18,sn:18,ft:60,uaL:90,faL:180,uaR:-90,faR:-90,hd:-162},1300,1000],
   [{tl:-160,th:19,sn:19,ft:60,uaL:90,faL:180,uaR:-92,faR:-92,hd:-160},1300,1000]]},
 {n:'Plancha lateral con elevación de cadera',z:'Oblicuos',v:'front',mat:1,plant:'anR',f:[
   [{tl:-150,th:5,sn:5,ft:60,uaL:90,faL:180,uaR:20,faR:140,hd:-150},150,900],
   [{tl:-162,th:18,sn:18,ft:60,uaL:90,faL:180,uaR:20,faR:140,hd:-162},150,900]]},
 {g:'Core completo'},
 {n:'Plancha frontal',z:'Core',mat:1,f:[[PLF,1300,1000],[{...PLF,tl:-13,th:167,sn:167},1300,1000]]},
 {n:'Dead bug (bicho muerto)',z:'Core profundo',mat:1,b:['lumbar'],f:[
   [{tl:180,ua:-90,fa:-90,th:-90,sn:0},150,800],[{tl:180,uaR:-90,faR:-90,uaL:-165,faL:-170,thL:-90,snL:0,thR:-15,snR:-12},300,800],
   [{tl:180,ua:-90,fa:-90,th:-90,sn:0},150,800],[{tl:180,uaL:-90,faL:-90,uaR:-165,faR:-170,thR:-90,snR:0,thL:-15,snL:-12},300,800]]},
 {n:'Escaladores',z:'Core y cardio',mat:1,f:[
   [{...PLH,thR:60,snR:150},0,300],[{...PLH,thL:60,snL:150},0,300]]},
 {g:'Abdomen inferior'},
 {n:'Crunch inverso',z:'Abdomen inferior',mat:1,f:[
   [{...SUP,th:-80,sn:10},150,900],[{...SUP,tl:168,th:-130,sn:-50},150,900]]},
 {n:'Tijeras',z:'Abdomen inferior',mat:1,b:['caution'],f:[
   [{tl:180,tu:188,ua:0,fa:0,thL:-10,snL:-10,thR:-28,snR:-28},0,320],[{tl:180,tu:188,ua:0,fa:0,thR:-10,snR:-10,thL:-28,snL:-28},0,320]]},
 {n:'Elevaciones de piernas',z:'Abdomen inferior',mat:1,b:['caution'],f:[
   [{...SUP,th:-8,sn:-8},150,1100],[{...SUP,th:-88,sn:-88},150,1100]]},
 {n:'Rodillas al pecho sentado',z:'Abdomen',mat:1,f:[
   [{tl:-125,ua:135,fa:115,th:-15,sn:-15,ft:-60},100,800],[{tl:-125,tu:-112,ua:135,fa:115,th:-60,sn:45},100,800]]},
]},

{id:'estiramientos',title:'Estiramientos',note:'Te propongo 26: estiramientos de todo el cuerpo y, al final, 6 ejercicios suaves para fortalecer la zona lumbar.',groups:true,items:[
 {g:'Cuello'},
 {n:'Inclinación lateral de cuello',split:true,z:'Cuello',v:'front',f:[[{},300,900],[{hd:-138},1200,900],[{},300,900],[{hd:-42},1200,900]]},
 {n:'Barbilla al pecho',z:'Cuello',f:[[{},300,900],[{hd:-40},1400,900]]},
 {g:'Hombros y brazos'},
 {n:'Hombro cruzado',split:true,z:'Hombros',v:'front',f:[
   [{uaR:180,faR:180,saR:.93,uaL:100,faL:-70,zEL:4,zHL:12},1300,800],[{},200,800],
   [{uaL:0,faL:0,saL:.93,uaR:80,faR:-110,zER:4,zHR:12},1300,800],[{},200,800]]},
 {n:'Tríceps detrás de la cabeza',split:true,z:'Tríceps y hombros',v:'front',f:[
   [{uaR:-95,faR:120,uaL:305,faL:350,zER:-2,zHR:-13,zHL:-3},1300,900],[{},200,900],
   [{uaL:275,faL:60,uaR:-125,faR:190,zEL:-2,zHL:-13,zHR:-3},1300,900],[{},200,900]]},
 {n:'Estiramiento de antebrazos',z:'Antebrazos y muñecas',f:[
   [{uaR:0,faR:0,uaL:30,faL:-20},1200,900],[{uaR:0,faR:0,uaL:28,faL:-14,tu:-88},1200,900]]},
 {n:'Círculos de brazos hacia delante',z:'Hombros',armsOut:true,per:1150,fn:t=>{const a=90+360*t;return {thL:88,snL:95,thR:88,snR:95,ua:a,fa:a-10,sa:.95};}},
 {n:'Círculos de brazos hacia atrás',z:'Hombros y pecho',armsOut:true,per:1150,fn:t=>{const a=90-360*t;return {thL:88,snL:95,thR:88,snR:95,ua:a,fa:a+10,sa:.95};}},
 {g:'Pecho'},
 {n:'Apertura de pecho con manos atrás',z:'Pecho y hombros',f:[[{ua:140,fa:140},300,900],[{ua:160,fa:162,tu:-96,hd:-104},1400,900]]},
 {n:'Mesa invertida',z:'Pecho, hombros y glúteos',mat:1,f:[
   [{tl:-128,tu:-120,hd:-100,ua:118,fa:100,sa:.9,th:-25,sn:65},500,1200],
   [{tl:-165,tu:-168,hd:-210,ua:95,fa:88,sa:.9,th:0,sn:90},1500,1200]]},
 {g:'Espalda alta y costados'},
 {n:'Hilo en la aguja',z:'Espalda alta',mat:1,f:[
   [{...QUAD,uaR:-90,faR:-90,hd:-40},600,1100],[{...QUAD,tu:-8,uaR:120,faR:150,hd:40},900,1100]]},
 {n:'Inclinación lateral de pie',split:true,z:'Costados y espalda',v:'front',f:[
   [{tl:-92,tu:-112,uaL:-100,faL:-122,uaR:-122,faR:-142},1300,1000],[{uaL:-95,faL:-86,uaR:-85,faR:-94},300,1000],
   [{tl:-88,tu:-68,uaL:-58,faL:-38,uaR:-80,faR:-58},1300,1000],[{uaL:-95,faL:-86,uaR:-85,faR:-94},300,1000]]},
 {n:'Medio triángulo',split:true,z:'Costados y cadera',v:'front',f:[
   [{thL:108,snL:108,thR:72,snR:72},300,1000],
   [{thL:108,snL:108,thR:72,snR:72,tl:-102,tu:-132,hd:-140,uaL:100,faL:98,uaR:-118,faR:-124},1500,1000],
   [{thL:108,snL:108,thR:72,snR:72},300,1000],
   [{thL:108,snL:108,thR:72,snR:72,tl:-78,tu:-48,hd:-40,uaR:80,faR:82,uaL:-62,faL:-56},1500,1000]]},
 {n:'Rotación de tronco con brazos al frente',z:'Columna y costados',v:'front',az:42,el:16,f:[
   [{thL:96,snL:96,thR:84,snR:84,uaL:4,faL:4,uaR:176,faR:176,sa:.22},200,1200],
   [{thL:96,snL:96,thR:84,snR:84,uaL:4,faL:4,uaR:176,faR:176,sa:.22,tw:-65},500,1200],
   [{thL:96,snL:96,thR:84,snR:84,uaL:4,faL:4,uaR:176,faR:176,sa:.22},200,1200],
   [{thL:96,snL:96,thR:84,snR:84,uaL:4,faL:4,uaR:176,faR:176,sa:.22,tw:65},500,1200]]},
 {n:'Molino de viento',z:'Espalda, costados e isquios',armsOut:true,az:38,el:12,b:['caution'],f:[
   [{ua:92,fa:92,sa:.08,zKL:-7,zAL:-13,zKR:7,zAR:13},250,1000],
   [{tl:-14,tu:-6,hd:20,uaR:96,faR:100,uaL:-88,faL:-88,saL:.95,zKL:-7,zAL:-13,zKR:7,zAR:13},650,1000],
   [{ua:92,fa:92,sa:.08,zKL:-7,zAL:-13,zKR:7,zAR:13},250,1000],
   [{tl:-14,tu:-6,hd:20,uaL:96,faL:100,uaR:-88,faR:-88,saR:.95,zKL:-7,zAL:-13,zKR:7,zAR:13},650,1000]]},
 {g:'Zona lumbar'},
 {n:'Gato-camello',z:'Columna',mat:1,f:[[{...QUAD,tl:-38,tu:8,hd:70},400,1300],[{...QUAD,tl:2,tu:-34,hd:-45},400,1300]]},
 {n:'Postura del niño',z:'Espalda y lumbar',mat:1,f:[
   [{tl:10,tu:15,hd:0,ua:0,fa:0,th:30,sn:180,ft:180},1400,1100],[{tl:7,tu:12,hd:-2,ua:-2,fa:0,th:30,sn:180,ft:180},1400,1100]]},
 {n:'Esfinge',z:'Lumbar',mat:1,f:[
   [{...PRONE,tl:-4,tu:-35,ua:80,fa:0,sa:.6},300,1200],[{...PRONE,tl:-5,tu:-55,hd:-50,ua:90,fa:0,sa:.75},1500,1200]]},
 {n:'Rodillas al pecho tumbado',z:'Lumbar',mat:1,f:[
   [{tl:180,th:-125,sn:15,ua:-40,fa:-20},800,1100],[{tl:180,th:-140,sn:5,ua:-48,fa:-12},1200,1100]]},
 {n:'Torsión lumbar tumbado',split:true,z:'Lumbar y glúteos',v:'top',mat:'top',top:'Vista desde arriba',f:[
   [{uaL:180,faL:180,uaR:0,faR:0,th:93,sn:90,sTh:.35,sSh:.4},200,1000],
   [{uaL:180,faL:180,uaR:0,faR:0,th:25,sn:100,hd:-110},1500,1000],
   [{uaL:180,faL:180,uaR:0,faR:0,th:93,sn:90,sTh:.35,sSh:.4},200,1000],
   [{uaL:180,faL:180,uaR:0,faR:0,th:155,sn:80,hd:-70},1500,1000]]},
 {n:'Torsión de columna con piernas cruzadas',split:true,z:'Columna y lumbar',v:'top',mat:'top',top:'Vista desde arriba',b:['lumbar'],f:[
   [{uaL:-112,faL:-104,uaR:-68,faR:-76,thL:96,snL:76,thR:86,snR:104,sThL:.4,sThR:.4,sShL:.55,sShR:.45},250,1100],
   [{uaL:-112,faL:-104,uaR:-68,faR:-76,thL:14,snL:92,thR:4,snR:118,sThL:.97,sThR:.95,sShL:.85,sShR:.7,hd:-106},700,1100],
   [{uaL:-112,faL:-104,uaR:-68,faR:-76,thL:96,snL:76,thR:86,snR:104,sThL:.4,sThR:.4,sShL:.55,sShR:.45},250,1100],
   [{uaL:-112,faL:-104,uaR:-68,faR:-76,thL:176,snL:62,thR:166,snR:88,sThL:.95,sThR:.97,sShL:.7,sShR:.85,hd:-74},700,1100]]},
 {g:'Fortalecer zona lumbar (espalda sana)'},
 {n:'Bird-dog (perro de caza)',z:'Lumbar y core',mat:1,b:['lumbar'],f:[
   [QUAD,200,900],[{...QUAD,uaL:-5,faL:-5,thR:182,snR:182},1200,900],
   [QUAD,200,900],[{...QUAD,uaR:-5,faR:-5,thL:182,snL:182},1200,900]]},
 {n:'Puente de glúteos',z:'Glúteos y lumbar',mat:1,b:['lumbar'],f:[
   [{...SUP,...KNEES},300,1000],[{...SUP,tl:140,tu:165,th:-18,sn:76.5},900,1000]]},
 {n:'Puente a una pierna',z:'Glúteos y lumbar',mat:1,b:['lumbar'],f:[
   [{...SUP,thL:-60,snL:60,thR:-22,snR:-22},300,1000],[{...SUP,tl:140,tu:165,thL:-18,snL:76.5,thR:-27,snR:-27},900,1000]]},
 {n:'Nadador suave (superman alterno)',anchor:{j:'pel',y:-13.1},z:'Lumbar y espalda',mat:1,b:['lumbar','gentle'],f:[
   [{...PRONE,ua:0,fa:0},200,900],[{...PRONE,ua:0,fa:0,tu:-6,hd:-10,uaL:-12,faL:-12,thR:190,snR:192},900,900],
   [{...PRONE,ua:0,fa:0},200,900],[{...PRONE,ua:0,fa:0,tu:-6,hd:-10,uaR:-12,faR:-12,thL:190,snL:192},900,900]]},
 {n:'Retroversión pélvica',anchor:{j:'pel',y:-13.1},z:'Lumbar',mat:1,b:['lumbar'],mark:['pel'],f:[
   [{...SUP,...KNEES},500,900],[{...SUP,...KNEES,tl:177,thL:-63,thR:-59},1200,900]]},
 {n:'Elevación de brazos en Y boca abajo',anchor:{j:'pel',y:-13.1},z:'Espalda alta y postura',mat:1,b:['lumbar'],f:[
   [{...PRONE,ua:0,fa:0},300,900],[{...PRONE,tu:-5,hd:-10,ua:-14,fa:-14},1100,900]]},
 {g:'Cadera y glúteos'},
 {n:'Figura 4 (glúteo y piriforme)',z:'Glúteos y cadera',mat:1,f:[
   [{tl:180,thL:-110,snL:-20,thR:-60,sThR:.7,snR:206,sShR:.8,ua:-40,fa:0},900,1100],
   [{tl:180,thL:-122,snL:-30,thR:-70,sThR:.7,snR:198,sShR:.8,ua:-50,fa:5},1200,1100]]},
 {n:'Flexores de cadera (rodilla en el suelo)',z:'Cadera y lumbar',mat:1,f:[
   [{ua:110,fa:-20,thR:0,snR:90,thL:104,snL:180,ftL:180},500,1100],[{ua:110,fa:-20,thR:0,snR:105,thL:110,snL:180,ftL:180},1500,1100]]},
 {g:'Aductores (ingles)'},
 {n:'Mariposa (aductores)',z:'Ingles y cadera',v:'front',noGround:1,mat:'top',f:[
   [{thL:172,snL:20,thR:8,snR:160,ftL:0,ftR:180,uaL:110,faL:75,uaR:70,faR:105},150,700],
   [{thL:160,snL:30,thR:20,snR:150,ftL:0,ftR:180,uaL:110,faL:75,uaR:70,faR:105},150,700]]},
 {n:'Zancada lateral',z:'Aductores',v:'front',plant:'anR',f:[
   [{thL:128,snL:128,thR:62,snR:100,tl:-84,uaL:55,faL:75,uaR:80,faR:100,zKR:12,lean:16},1400,1100],
   [{thL:122,snL:122,thR:55,snR:104,tl:-80,uaL:55,faL:75,uaR:80,faR:100,zKR:14,lean:18},1400,1100]]},
 {n:'Sentadilla sumo profunda',z:'Aductores y cadera',v:'front',f:[
   [{thL:150,snL:95,thR:30,snR:85,ftL:170,ftR:10,uaL:100,faL:-62,uaR:80,faR:-118,zEL:6,zER:6,zHL:12,zHR:12,zKL:9,zKR:9,lean:14},1400,1100],
   [{thL:158,snL:97,thR:22,snR:83,ftL:170,ftR:10,uaL:102,faL:-60,uaR:78,faR:-120,zEL:6,zER:6,zHL:12,zHR:12,zKL:10,zKR:10,lean:16},1400,1100]]},
 {n:'Apertura de piernas sentado',z:'Aductores e isquios',v:'front',noGround:1,mat:'top',b:['caution'],f:[
   [{thL:165,snL:165,thR:15,snR:15,ft:-90,uaL:110,faL:95,uaR:70,faR:85},1300,1200],
   [{thL:168,snL:168,thR:12,snR:12,ft:-90,tu:-92,uaL:100,faL:90,uaR:80,faR:90},1300,1200]]},
 {n:'Rana',z:'Aductores y cadera',v:'top',prone:true,mat:'top',top:'Vista desde arriba',f:[
   [{uaL:-115,faL:-85,uaR:-65,faR:-95,thL:180,snL:90,thR:0,snR:90,sTh:.95},1300,1300],
   [{uaL:-125,faL:-88,uaR:-55,faR:-92,thL:176,snL:92,thR:4,snR:88,sTh:.95},1300,1300]]},
 {n:'Mariposa tumbado',z:'Aductores',v:'top',mat:'top',top:'Vista desde arriba',b:['lumbar'],f:[
   [{uaL:150,faL:150,uaR:30,faR:30,thL:140,snL:50,thR:40,snR:130,sTh:.85,sSh:.95},1400,1200],
   [{uaL:150,faL:150,uaR:30,faR:30,thL:150,snL:40,thR:30,snR:140,sTh:.75,sSh:.95},1400,1200]]},
 {g:'Piernas'},
 {n:'Isquiotibiales tumbado',z:'Parte trasera del muslo',mat:1,f:[
   [{tl:180,thL:0,snL:0,ftL:-90,thR:-40,snR:-40,ftR:-130,ua:-18,fa:-10},300,1200],
   [{tl:180,thL:0,snL:0,ftL:-90,thR:-80,snR:-80,ftR:-170,ua:-35,fa:-15},1500,1200]]},
 {n:'Pinza sentado (piernas estiradas)',z:'Espalda y piernas',mat:1,b:['caution'],f:[
   [{th:-6,sn:4,ft:-90,ua:-60,fa:-60},300,1200],[{tl:-42,tu:-26,hd:-12,th:-6,sn:4,ft:-90,ua:5,fa:5},1500,1200]]},
 {n:'Flexión hacia delante de pie',z:'Isquiotibiales y espalda',plant:'anR',anchor:{j:'anR',y:-3},b:['caution'],f:[
   [{},500,1300],[{tl:35,tu:48,hd:100,ua:115,fa:150,th:84,sn:95},1600,1300]]},
 {n:'Cuádriceps de pie',split:true,z:'Parte delantera del muslo',f:[
   [{},200,900],[{thR:95,snR:250,uaR:110,faR:100,uaL:-10,faL:-10},1500,900],
   [{},200,900],[{thL:95,snL:250,uaL:110,faL:100,uaR:-10,faR:-10},1500,900]]},
 {n:'Gemelos contra la pared',z:'Gemelos',az:-32,props:(J,P)=>P.wall(J.haR[0]+4),f:[
   [{tl:-70,ua:-15,fa:-15,thR:60,snR:100,thL:113,snL:113},1300,1000],[{tl:-66,ua:-12,fa:-12,thR:55,snR:105,thL:115,snL:115},1300,1000]]},
]},
];
