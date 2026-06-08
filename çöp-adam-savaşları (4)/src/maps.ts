import { GameMap } from "./types";

export const GAME_MAPS: GameMap[] = [
  {
    id: "cyber_grid",
    name: "Siber Şehir (Cyber Grid)",
    description: "Siber-punk esintili neon metal şeritler ve asma platformlar. Geniş dövüş alanıyla adil bir düello sunar!",
    theme: "sky",
    skyColor: "#0b0f19",
    textColor: "#06b6d4",
    bgColor: "#020617",
    platformColor: "#0891b2",
    platforms: [
      { x: 20, y: 370, width: 760, height: 30 }, // Geniş ana kara parçası (genişletildi)
      { x: 100, y: 220, width: 200, height: 20 }, // Havada sol platform
      { x: 500, y: 220, width: 200, height: 20 }  // Havada sağ platform
    ],
    decoration: "sky",
    particlesEnabled: true
  },
  {
    id: "lava_island",
    name: "Asimetrik Lav Kayaları (Lava Island)",
    description: "Altı kaynar magma gölü olan asimetrik yan adacıklar ve ortada asılı yüksek bir gözlem köprüsü!",
    theme: "volcano",
    skyColor: "#270701",
    textColor: "#f97316",
    bgColor: "#150200",
    platformColor: "#7c2d12",
    platforms: [
      { x: 30, y: 360, width: 250, height: 35 },  // Sol emniyetli ada (genişletildi)
      { x: 520, y: 360, width: 250, height: 35 }, // Sağ emniyetli ada (genişletildi)
      { x: 260, y: 210, width: 280, height: 22 }  // Ortadaki stratejik asma köprü
    ],
    decoration: "volcano",
    particlesEnabled: true
  },
  {
    id: "crystal_cave",
    name: "Işıldayan Kristal Mağara (Crystal Cave)",
    description: "Gizemli mor dev kristallerin süslediği dev asa antik kaya dehlizleri. Kayalarda sıkışmadan serbestçe zıplayın!",
    theme: "temple",
    skyColor: "#1e1b4b",
    textColor: "#c084fc",
    bgColor: "#0f0926",
    platformColor: "#6b21a8",
    platforms: [
      { x: 40, y: 380, width: 720, height: 30 }, // Devasa orta alt zemin (genişletildi)
      { x: 50, y: 230, width: 220, height: 20 },  // Sol mağara çıkıntısı
      { x: 530, y: 230, width: 220, height: 20 }  // Sağ mağara çıkıntısı
    ],
    decoration: "temple",
    particlesEnabled: true
  },
  {
    id: "frozen_peak",
    name: "Kutup Zirveleri (Frozen Peak)",
    description: "Sürekli kar yağan, geniş ve kaygan olan buz kütleleri! Tutunması zordur fakat nefes kesici bir dövüş sunar!",
    theme: "ice",
    skyColor: "#091e2f",
    textColor: "#93c5fd",
    bgColor: "#01070e",
    platformColor: "#0284c7",
    platforms: [
      { x: 30, y: 350, width: 740, height: 25, isSlippery: true }, // Büyük karla kaplı ana zemin (genişletildi)
      { x: 250, y: 200, width: 300, height: 20, isSlippery: true }  // Üst süzülen bulut parası
    ],
    decoration: "ice",
    particlesEnabled: true
  },
  {
    id: "nebula_station",
    name: "Nebula Reaktör Üssü (Nebula Reactor)",
    description: "Reaktör enerjisi yüzünden yerçekiminin %50 daha az olduğu uzaysal bir mini uzay üssü. Yerçekimi azdır, daha yükseğe zıpla!",
    theme: "space",
    skyColor: "#2e1065",
    textColor: "#f472b6",
    bgColor: "#0c011e",
    platformColor: "#4a044e",
    platforms: [
      { x: 50, y: 370, width: 700, height: 30 }, // Alt ana reaktör koruması (genişletildi)
      { x: 60, y: 220, width: 230, height: 20 },  // Havada neon kargo kızağı sol
      { x: 510, y: 220, width: 230, height: 20 }  // Havada neon kargo kızağı sağ
    ],
    gravityModifier: 0.5,
    decoration: "space",
    particlesEnabled: true
  }
];
