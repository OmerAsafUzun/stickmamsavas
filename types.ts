/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum WeaponType {
  FIST = "yumruk",
  SWORD = "kilic",
  PISTOL = "tabanca",
  PUSH_STICK = "ittirme"
}

export interface Weapon {
  type: WeaponType;
  name: string;
  damage: number;
  knockback: number;
  range: number;
  cooldown: number; // millisecond
  icon: string;
  bulletSpeed?: number;
  maxAmmo?: number;
  description: string;
}

export const WEAPONS_DATA: Record<WeaponType, Weapon> = {
  [WeaponType.FIST]: {
    type: WeaponType.FIST,
    name: "Ateşli Plazma Yumruğu",
    damage: 7,
    knockback: 0,
    range: 52,
    cooldown: 180,
    icon: "🔥",
    description: "Kozmik plazma enerjili, ultra hızlı ve yakıcı yumruk darbeleri."
  },
  [WeaponType.SWORD]: {
    type: WeaponType.SWORD,
    name: "Giga Neon Lazer Kılıcı",
    damage: 13,
    knockback: 0,
    range: 85,
    cooldown: 300,
    icon: "⚔️",
    description: "Göz alıcı neon ışımalı, geniş menzilli efsanevi lazer kılıcı."
  },
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    name: "Hiper Kuantum Blaster",
    damage: 10,
    knockback: 0,
    range: 560,
    cooldown: 380,
    icon: "☄️",
    bulletSpeed: 18,
    maxAmmo: 10,
    description: "Işık hızında kuantum plazma mermileri fırlatan yüksek teknolojili blaster."
  },
  [WeaponType.PUSH_STICK]: {
    type: WeaponType.PUSH_STICK,
    name: "Kozmik Yıldırım Mızrağı",
    damage: 11,
    knockback: 0,
    range: 75,
    cooldown: 250,
    icon: "⚡",
    description: "Elektrik arkıyla rakipleri sarsan ve sersemleten yıldırım asası."
  }
};

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  isSlippery?: boolean; // configuration for ice map
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  damage: number;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  theme: string;
  skyColor: string;
  textColor: string;
  platformColor: string;
  bgColor: string;
  platforms: Platform[];
  particlesEnabled?: boolean;
  gravityModifier?: number;
  decoration?: "temple" | "volcano" | "space" | "forest" | "sky" | "ice";
}

export interface HatCustomization {
  id: string;
  name: string;
  price: number;
  color?: string;
}

export const HATS_DATA: HatCustomization[] = [
  { id: "none", name: "Standart Çöp Adam", price: 0 },
  { id: "crown", name: "Kral Kostümü (Pelerinli)", price: 100 },
  { id: "cowboy", name: "Şerif Kovboy Kostümü", price: 50 },
  { id: "ninja", name: "Gizemli Ninja Kostümü", price: 40 },
  { id: "spartan", name: "Spartalı Miğfer & Kalkan", price: 80 },
  { id: "wizard", name: "Efsanevi Büyücü Cüppesi", price: 120 },
  { id: "astronaut", name: "Kozmik Astronot Tulumu", price: 150 },
  { id: "chef", name: "Usta Aşçı Kostümü", price: 30 }
];

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  weaponType?: WeaponType;
}

export interface PlayerState {
  id: string;
  name: string;
  color: "red" | "blue";
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  score: number; // match score (wins in round)
  weapon: WeaponType;
  ammo: number;
  ammoMax: number;
  lastAttackTime: number;
  attackAnimTimer: number; // for showing weapon swing / fire animation
  facingRight: boolean;
  onPlatform: boolean;
  hatId: string;
  input: PlayerInput;
  isBot: boolean;
  isReady: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  color: "red" | "blue";
  text: string;
  timestamp: number;
}

export interface GameLobby {
  code: string;
  hostId: string;
  players: {
    [id: string]: PlayerState;
  };
  chat: ChatMessage[];
  mapId: string;
  gameState: {
    status: "lobby" | "countdown" | "playing" | "round-end" | "final-end";
    currentRound: number;
    timer: number;
    winnerId: string | null;
    countdownTime: number;
  };
  lastUpdate: number;
}
