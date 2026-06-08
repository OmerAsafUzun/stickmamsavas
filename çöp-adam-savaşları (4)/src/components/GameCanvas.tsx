/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { WeaponType, WEAPONS_DATA, Bullet, PlayerState, PlayerInput, HATS_DATA } from "../types";
import { GAME_MAPS } from "../maps";
import { Copy, RotateCcw, AlertTriangle, ArrowRightLeft, ShieldAlert } from "lucide-react";

interface GameCanvasProps {
  mode: "bot" | "online" | "local_2p";
  lobbyCode?: string;
  playerId?: string;
  mapId: string;
  opponentHat?: string;
  onMatchComplete: (winnerColor: "red" | "blue") => void;
  onExit: () => void;
}

// Natively synthesized Web Audio API sound effects for maximum portability and zero-lag play
const playSound = (type: "shoot" | "hit" | "swing" | "ready" | "countdown" | "matchNew" | "victory" | "select") => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === "shoot") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === "hit") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "swing") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "ready") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "select") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.setValueAtTime(540, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "countdown") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "matchNew") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.45);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "victory") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.setValueAtTime(440, now + 0.12);
      osc.frequency.setValueAtTime(540, now + 0.24);
      osc.frequency.setValueAtTime(700, now + 0.36);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch (err) {
    // browser autoplay guard
  }
};

export default function GameCanvas({
  mode,
  lobbyCode = "",
  playerId = "",
  mapId,
  opponentHat = "none",
  onMatchComplete,
  onExit
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load configured map
  const activeMap = GAME_MAPS.find((m) => m.id === mapId) || GAME_MAPS[0];

  // Game configuration parameters
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 540;
  const STICKMAN_HEIGHT = 45;
  const STICKMAN_WIDTH = 20;

  // Compute scaled platforms to adapt to 960x540 canvas area dynamically
  const scaledPlatforms = activeMap.platforms.map((plat) => {
    const scaleX = CANVAS_WIDTH / 800;
    const scaleY = CANVAS_HEIGHT / 500;
    return {
      x: plat.x * scaleX,
      y: plat.y * scaleY,
      width: plat.width * scaleX,
      height: plat.height * scaleY,
      isSlippery: plat.isSlippery
    };
  });

  // Game Play States
  const [redScore, setRedScore] = useState<number>(0);
  const [blueScore, setBlueScore] = useState<number>(0);
  const [roundWinnerMsg, setRoundWinnerMsg] = useState<string>("");
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [finalWinner, setFinalWinner] = useState<"Kırmızı" | "Mavi" | null>(null);
  const [matchCoinsReward, setMatchCoinsReward] = useState<number>(0);
  const [rematchLoading, setRematchLoading] = useState<boolean>(false);

  // Ready states for Pre-battle preparation screen ("maca başlamadan önce")
  const [p1Ready, setP1Ready] = useState<boolean>(false);
  const [p2Ready, setP2Ready] = useState<boolean>(false);

  // Active Weapon choices selected pre-battle
  const [p1Weapon, setP1Weapon] = useState<WeaponType>(WeaponType.FIST);
  const [p2Weapon, setP2Weapon] = useState<WeaponType>(WeaponType.FIST);

  // Helper to obtain map-specific spawn positions to prevent getting stuck
  const getSpawnPoints = (mId: string) => {
    switch (mId) {
      case "cyber_grid":
        return {
          p1: { x: 200, y: 370 * 1.08 - STICKMAN_HEIGHT - 30 },
          p2: { x: 760, y: 370 * 1.08 - STICKMAN_HEIGHT - 30 }
        };
      case "lava_island":
        return {
          p1: { x: 180, y: 360 * 1.08 - STICKMAN_HEIGHT - 30 },
          p2: { x: 740, y: 360 * 1.08 - STICKMAN_HEIGHT - 30 }
        };
      case "crystal_cave":
        return {
          p1: { x: 260, y: 380 * 1.08 - STICKMAN_HEIGHT - 30 },
          p2: { x: 700, y: 380 * 1.08 - STICKMAN_HEIGHT - 30 }
        };
      case "frozen_peak":
        return {
          p1: { x: 220, y: 350 * 1.08 - STICKMAN_HEIGHT - 30 },
          p2: { x: 740, y: 350 * 1.08 - STICKMAN_HEIGHT - 30 }
        };
      case "nebula_station":
        return {
          p1: { x: 250, y: 370 * 1.08 - STICKMAN_HEIGHT - 30 },
          p2: { x: 710, y: 370 * 1.08 - STICKMAN_HEIGHT - 30 }
        };
      default:
        return {
          p1: { x: 264, y: 162 },
          p2: { x: 696, y: 162 }
        };
    }
  };

  const initialSpawns = getSpawnPoints(activeMap.id);

  // Interactive live values accessible by loop
  const p1Ref = useRef<PlayerState>({
    id: "red_player",
    name: mode === "online" && playerId.startsWith("Host") ? "Sen (Kırmızı)" : "Kırmızı Oyuncu",
    color: "red",
    x: initialSpawns.p1.x,
    y: initialSpawns.p1.y,
    vx: 0,
    vy: 0,
    health: 55,
    maxHealth: 55,
    score: 0,
    weapon: WeaponType.FIST,
    ammo: 0,
    ammoMax: 0,
    lastAttackTime: 0,
    attackAnimTimer: 0,
    facingRight: true,
    onPlatform: false,
    hatId: "none",
    input: { left: false, right: false, jump: false, attack: false },
    isBot: false,
    isReady: false,
  });

  const p2Ref = useRef<PlayerState>({
    id: "blue_player",
    name: mode === "online" && playerId.startsWith("Guest") ? "Sen (Mavi)" : mode === "bot" ? "Robot Çöp Adam" : "Mavi Oyuncu",
    color: "blue",
    x: initialSpawns.p2.x,
    y: initialSpawns.p2.y,
    vx: 0,
    vy: 0,
    health: 55,
    maxHealth: 55,
    score: 0,
    weapon: WeaponType.FIST,
    ammo: 0,
    ammoMax: 0,
    lastAttackTime: 0,
    attackAnimTimer: 0,
    facingRight: false,
    onPlatform: false,
    hatId: opponentHat,
    input: { left: false, right: false, jump: false, attack: false },
    isBot: mode === "bot",
    isReady: false,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number; duration: number }[]>([]);
  const roundTimerRef = useRef<number>(60);
  const [uiTimer, setUiTimer] = useState<number>(60);
  const roundStateRef = useRef<"ready_check" | "countdown" | "active" | "round_end" | "game_end">("ready_check");
  const [internalRound, setInternalRound] = useState<number>(1);
  const countdownTimerRef = useRef<number>(3);
  const [uiCountdown, setUiCountdown] = useState<number>(3);

  // Key Listeners map
  const keysPressedRef = useRef<Record<string, boolean>>({});

  // Humanization of bot decision-making to make it "easy" as requested
  const botDecisionRef = useRef<{
    lastDecisionTime: number;
    decisionInterval: number;
    inputs: PlayerInput;
    desiredWeapon: WeaponType;
  }>({
    lastDecisionTime: 0,
    decisionInterval: 260, // Reacts every 260ms instead of 16ms, creating realistic hesitation
    inputs: { left: false, right: false, jump: false, attack: false },
    desiredWeapon: WeaponType.FIST
  });

  // Mobile Controls Toggle
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);

  // Load hats
  useEffect(() => {
    // Read equipped hats
    if (mode !== "online") {
      const storedRedHat = localStorage.getItem("copadam_equipped_hat") || "none";
      p1Ref.current.hatId = storedRedHat;
    } else {
      // online: host equips their selected hat, guest equips client's
      const localEquipped = localStorage.getItem("copadam_equipped_hat") || "none";
      if (playerId.startsWith("Host")) {
        p1Ref.current.hatId = localEquipped;
        p2Ref.current.hatId = opponentHat;
      } else {
        p2Ref.current.hatId = localEquipped;
        p1Ref.current.hatId = opponentHat;
      }
    }
  }, [mapId, mode, opponentHat, playerId]);

  // Smart Bot auto readiness trigger with realistic delay
  useEffect(() => {
    if (roundStateRef.current === "ready_check" && mode === "bot" && !p2Ready) {
      const timeout = setTimeout(() => {
        setP2Ready(true);
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [mode, p2Ready, p1Ready, internalRound]);

  // Transition to countdown phase when both players are ready
  useEffect(() => {
    if (p1Ready && p2Ready && roundStateRef.current === "ready_check") {
      roundStateRef.current = "countdown";
      setUiCountdown(3);
      countdownTimerRef.current = 3;
    }
  }, [p1Ready, p2Ready]);

  // Setup detectors for mobile or PC controls
  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setShowTouchControls(isTouch);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Ready triggers when game is preparing
      if (roundStateRef.current === "ready_check") {
        const isRed = mode !== "online" || playerId.startsWith("Host");
        const isBlue = mode === "local_2p" || (mode === "online" && playerId.startsWith("Guest"));

        if (e.code === "KeyF" || e.code === "KeyW" || e.key.toLowerCase() === "f" || e.key.toLowerCase() === "w") {
          if (isRed) setP1Ready(true);
        }
        if (e.code === "KeyK" || e.code === "KeyI" || e.key.toLowerCase() === "k" || e.key.toLowerCase() === "i" || e.code === "ArrowUp") {
          if (isBlue) setP2Ready(true);
        }
      }

      keysPressedRef.current[e.code] = true;
      keysPressedRef.current[e.key.toLowerCase()] = true;

      // Prevent window scrolling of Space
      if (e.code === "Space") {
        e.preventDefault();
      }

      // Allow quick weapon change via hotkeys (1-4) ONLY during ready check (between rounds)
      if (roundStateRef.current === "ready_check") {
        if (e.key === "1") {
          setP1Weapon(WeaponType.FIST);
          changeWeapon(p1Ref.current, WeaponType.FIST);
        }
        if (e.key === "2") {
          setP1Weapon(WeaponType.SWORD);
          changeWeapon(p1Ref.current, WeaponType.SWORD);
        }
        if (e.key === "3") {
          setP1Weapon(WeaponType.PISTOL);
          changeWeapon(p1Ref.current, WeaponType.PISTOL);
        }
        if (e.key === "4") {
          setP1Weapon(WeaponType.PUSH_STICK);
          changeWeapon(p1Ref.current, WeaponType.PUSH_STICK);
        }

        if (mode === "local_2p") {
          if (e.key === "7" || e.key === "u" || e.key === "U") {
            setP2Weapon(WeaponType.FIST);
            changeWeapon(p2Ref.current, WeaponType.FIST);
          }
          if (e.key === "8" || e.key === "i" || e.key === "I") {
            setP2Weapon(WeaponType.SWORD);
            changeWeapon(p2Ref.current, WeaponType.SWORD);
          }
          if (e.key === "9" || e.key === "o" || e.key === "O") {
            setP2Weapon(WeaponType.PISTOL);
            changeWeapon(p2Ref.current, WeaponType.PISTOL);
          }
          if (e.key === "0" || e.key === "p" || e.key === "P") {
            setP2Weapon(WeaponType.PUSH_STICK);
            changeWeapon(p2Ref.current, WeaponType.PUSH_STICK);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode]);

  // Synchronize player metadata when the game mode or map ID changes
  useEffect(() => {
    // Correctly set name based on chosen game mode
    p1Ref.current.name = mode === "online" && playerId.startsWith("Host") ? "Sen (Kırmızı)" : "Kırmızı Oyuncu";
    p2Ref.current.name = mode === "online" && playerId.startsWith("Guest") ? "Sen (Mavi)" : mode === "bot" ? "Robot Çöp Adam" : "Mavi Oyuncu";
    
    // Correctly set isBot flag based on game mode
    p2Ref.current.isBot = (mode === "bot");
    
    // Reset round scores, winner, and states
    setRedScore(0);
    setBlueScore(0);
    p1Ref.current.score = 0;
    p2Ref.current.score = 0;
    setGameEnded(false);
    setFinalWinner(null);
    setRoundWinnerMsg("");
    
    // Prepare for clean starting check
    setP1Ready(false);
    setP2Ready(false);
    p1Ref.current.isReady = false;
    p2Ref.current.isReady = false;
    
    // Reset starter weapons
    setP1Weapon(WeaponType.FIST);
    setP2Weapon(WeaponType.FIST);
    p1Ref.current.weapon = WeaponType.FIST;
    p2Ref.current.weapon = WeaponType.FIST;
    
    // Restart from Raund 1
    setInternalRound(1);
    startNewRound(1);
  }, [mode, mapId]);

  // Handle core loops
  useEffect(() => {
    let animationId: number;
    let secondsTimerInterval: NodeJS.Timeout;

    // Start 1-second interval timer
    secondsTimerInterval = setInterval(() => {
      if (roundStateRef.current === "countdown") {
        playSound("countdown");
        countdownTimerRef.current -= 1;
        setUiCountdown(countdownTimerRef.current);
        if (countdownTimerRef.current <= 0) {
          playSound("matchNew");
          roundStateRef.current = "active";
          roundTimerRef.current = 60;
          setUiTimer(60);
        }
      } else if (roundStateRef.current === "active") {
        roundTimerRef.current -= 1;
        setUiTimer(roundTimerRef.current);

        // Check if time expired
        if (roundTimerRef.current <= 0) {
          evaluateRoundEnd();
        }
      }
    }, 1000);

    // Initialize Game State
    startNewRound(1);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Game loop inside animation frame
    const gameTick = () => {
      updatePhysics();
      renderGame(ctx);
      animationId = requestAnimationFrame(gameTick);
    };

    gameTick();

    // Setup network sync if online mode
    if (mode === "online") {
      stateUpdateIntervalRef.current = setInterval(async () => {
        await syncOnlineState();
      }, 55); // ~18 syncs per second
    }

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(secondsTimerInterval);
      if (stateUpdateIntervalRef.current) {
        clearInterval(stateUpdateIntervalRef.current);
      }
    };
  }, [mapId, mode]);

  // Change active weapon with ammo reset
  const changeWeapon = (p: PlayerState, wType: WeaponType) => {
    p.weapon = wType;
    const data = WEAPONS_DATA[wType];
    p.ammo = data.maxAmmo || 0;
    p.ammoMax = data.maxAmmo || 0;
    spawnParticles(p.x, p.y, p.color === "red" ? "#ef4444" : "#3b82f6", 12);
  };

  // Sync multiplayer state over REST polling
  const syncOnlineState = async () => {
    try {
      const isRed = playerId.startsWith("Host");
      const ourRef = isRed ? p1Ref : p2Ref;
      const opponentRef = isRed ? p2Ref : p1Ref;

      // Extract only essential variables to send
      const mySyncState = {
        name: ourRef.current.name,
        color: ourRef.current.color,
        x: ourRef.current.x,
        y: ourRef.current.y,
        vx: ourRef.current.vx,
        vy: ourRef.current.vy,
        health: ourRef.current.health,
        weapon: ourRef.current.weapon,
        ammo: ourRef.current.ammo,
        facingRight: ourRef.current.facingRight,
        attackAnimTimer: ourRef.current.attackAnimTimer,
        hatId: ourRef.current.hatId,
        input: ourRef.current.input,
        isReady: isRed ? p1Ready : p2Ready
      };

      // Compile current bullet updates from bullet state
      const spawnedBulletsToSend: Bullet[] = [];
      bulletsRef.current.forEach(b => {
        if (b.ownerId === playerId && (b.vx !== 0 || b.vy !== 0)) {
          spawnedBulletsToSend.push(b);
        }
      });

      const response = await fetch(`/api/lobby/sync/${lobbyCode}/${playerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerState: mySyncState,
          bullets: spawnedBulletsToSend,
          event: isRed ? {
            type: roundStateRef.current === "round_end" ? "round_over" : roundStateRef.current === "game_end" ? "match_over" : "timer_update",
            winnerId: roundWinnerMsg.includes("Kırmızı") ? p1Ref.current.id : roundWinnerMsg.includes("Mavi") ? p2Ref.current.id : null,
            timer: roundTimerRef.current,
            round: internalRound
          } : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedLobby = data.lobby;

        // Sync opponents variables smoothly
        const opponentId = Object.keys(updatedLobby.players).find(id => id !== playerId);
        if (opponentId && updatedLobby.players[opponentId]) {
          const remoteOpponent = updatedLobby.players[opponentId];
          opponentRef.current.x = Number(remoteOpponent.x);
          opponentRef.current.y = Number(remoteOpponent.y);
          opponentRef.current.vx = Number(remoteOpponent.vx);
          opponentRef.current.vy = Number(remoteOpponent.vy);
          opponentRef.current.health = Number(remoteOpponent.health);
          opponentRef.current.weapon = remoteOpponent.weapon;
          opponentRef.current.ammo = Number(remoteOpponent.ammo);
          opponentRef.current.facingRight = Boolean(remoteOpponent.facingRight);
          opponentRef.current.attackAnimTimer = Number(remoteOpponent.attackAnimTimer);
          opponentRef.current.hatId = remoteOpponent.hatId;
          opponentRef.current.input = remoteOpponent.input;

          // Sync remote readiness
          const remoteReady = Boolean(remoteOpponent.isReady);
          if (isRed) {
            setP2Ready(remoteReady);
          } else {
            setP1Ready(remoteReady);
          }
        }

        // Set round score and states synced from server
        setRedScore(updatedLobby.players[p1Ref.current.id]?.score || 0);
        setBlueScore(updatedLobby.players[p2Ref.current.id]?.score || 0);

        if (updatedLobby.gameState.status === "round-end" && roundStateRef.current !== "round_end") {
          const winName = updatedLobby.gameState.winnerId === p1Ref.current.id ? p1Ref.current.name : p2Ref.current.name;
          setRoundWinnerMsg(`${winName} raundu kazandı!`);
          roundStateRef.current = "round_end";
        } else if (updatedLobby.gameState.status === "final-end" && roundStateRef.current !== "game_end") {
          const matchWinnerId = updatedLobby.gameState.winnerId;
          const finalWinName = matchWinnerId === p1Ref.current.id ? "Kırmızı" : "Mavi";
          triggerMatchConclusion(finalWinName);
        } else if (updatedLobby.gameState.status === "playing" && roundStateRef.current === "round_end") {
          // Restart round client side
          setInternalRound(updatedLobby.gameState.currentRound);
          startNewRound(updatedLobby.gameState.currentRound);
        }

        // Incorporate remote bullets spawned
        if (data.bullets && data.bullets.length > 0) {
          data.bullets.forEach((rb: Bullet) => {
            if (rb.ownerId !== playerId && !bulletsRef.current.some(b => b.id === rb.id)) {
              bulletsRef.current.push(rb);
            }
          });
        }
      }
    } catch (e) {
      console.error("Multiplayer Sync fail", e);
    }
  };

  const triggerMatchConclusion = (winnerColor: "Kırmızı" | "Mavi") => {
    roundStateRef.current = "game_end";
    setFinalWinner(winnerColor);
    setGameEnded(true);

    // Persist coins to localStorage
    const winBonus = (playerId.startsWith("Host") && winnerColor === "Kırmızı") || (playerId.startsWith("Guest") && winnerColor === "Mavi") || (mode === "bot" && winnerColor === "Kırmızı") ? 100 : 0;
    const totalAward = 50 + winBonus;
    setMatchCoinsReward(totalAward);

    const currentCoins = parseInt(localStorage.getItem("copadam_coins") || "0") || 0;
    localStorage.setItem("copadam_coins", (currentCoins + totalAward).toString());

    onMatchComplete(winnerColor === "Kırmızı" ? "red" : "blue");
  };

  const handleRematchVote = async () => {
    if (mode === "online") {
      setRematchLoading(true);
      try {
        await fetch(`/api/lobby/action/${lobbyCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rematch", playerId }),
        });
      } catch (err) {
        console.error(err);
      }
      setRematchLoading(false);
    } else {
      // offline reset instantly
      setRedScore(0);
      setBlueScore(0);
      setGameEnded(false);
      setFinalWinner(null);
      startNewRound(1);
    }
  };

  // Spawns dust particles
  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y: y - Math.random() * 20,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        color,
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        duration: Math.random() * 20 + 20
      });
    }
  };

  // Begin customizable round
  const startNewRound = (roundNum: number) => {
    roundStateRef.current = "ready_check";
    setP1Ready(false);
    setP2Ready(false);
    p1Ref.current.isReady = false;
    p2Ref.current.isReady = false;
    countdownTimerRef.current = 3;
    setUiCountdown(3);
    roundTimerRef.current = 60;
    setUiTimer(60);
    setRoundWinnerMsg("");

    const spawns = getSpawnPoints(activeMap.id);

    // Reset coordinates to platform starting markers
    p1Ref.current.x = spawns.p1.x;
    p1Ref.current.y = spawns.p1.y;
    p1Ref.current.vx = 0;
    p1Ref.current.vy = 0;
    p1Ref.current.health = 55;
    p1Ref.current.maxHealth = 55;
    p1Ref.current.facingRight = true;

    p2Ref.current.x = spawns.p2.x;
    p2Ref.current.y = spawns.p2.y;
    p2Ref.current.vx = 0;
    p2Ref.current.vy = 0;
    p2Ref.current.health = 55;
    p2Ref.current.maxHealth = 55;
    p2Ref.current.facingRight = false;

    bulletsRef.current = [];
    particlesRef.current = [];

    spawnParticles(spawns.p1.x, spawns.p1.y + 20, "#ef4444", 20);
    spawnParticles(spawns.p2.x, spawns.p2.y + 20, "#3b82f6", 20);
  };

  const evaluateRoundEnd = () => {
    if (roundStateRef.current !== "active") return;
    roundStateRef.current = "round_end";

    // Who has more health?
    let roundWinner: PlayerState | null = null;
    if (p1Ref.current.health > p2Ref.current.health) {
      roundWinner = p1Ref.current;
    } else if (p2Ref.current.health > p1Ref.current.health) {
      roundWinner = p2Ref.current;
    }

    if (roundWinner) {
      roundWinner.score += 1;
      if (roundWinner.color === "red") setRedScore(roundWinner.score);
      else setBlueScore(roundWinner.score);

      setRoundWinnerMsg(`${roundWinner.name} raundu kazandı!`);
    } else {
      setRoundWinnerMsg("Yenişen Olmadı! Berabere!");
    }

    // Check if total score reaches 3 (Best of 5)
    setTimeout(() => {
      if (p1Ref.current.score >= 3) {
        triggerMatchConclusion("Kırmızı");
      } else if (p2Ref.current.score >= 3) {
        triggerMatchConclusion("Mavi");
      } else {
        // Increment round
        const nextRound = internalRound + 1;
        setInternalRound(nextRound);
        startNewRound(nextRound);
      }
    }, 3000);
  };

  // Simulate a fun, humanized, and easier platform battle AI
  const runSmartBotStrategy = (bot: PlayerState, target: PlayerState) => {
    // Only operate active behaviors if the match is running
    if (roundStateRef.current !== "active") {
      bot.input.left = false;
      bot.input.right = false;
      bot.input.jump = false;
      bot.input.attack = false;
      return;
    }

    const now = Date.now();
    const elapsed = now - botDecisionRef.current.lastDecisionTime;

    // Re-evaluate inputs at standard human reaction delay frequency (260ms)
    if (elapsed > botDecisionRef.current.decisionInterval) {
      botDecisionRef.current.lastDecisionTime = now;

      const decInputs = { left: false, right: false, jump: false, attack: false };
      const distanceX = target.x - bot.x;
      const absDistX = Math.abs(distanceX);
      const distanceY = target.y - bot.y;

      // 1. WEAPON CHOICE & SWITCHING (More casual, slower change chance to feel natural)
      let targetWeapon = bot.weapon;
      if (absDistX > 220) {
        targetWeapon = WeaponType.PISTOL;
      } else if (absDistX > 90) {
        targetWeapon = WeaponType.SWORD;
      } else {
        targetWeapon = (bot.health < 60 && Math.random() < 0.25) ? WeaponType.PUSH_STICK : WeaponType.FIST;
      }

      if (targetWeapon !== bot.weapon && Math.random() < 0.12) {
        changeWeapon(bot, targetWeapon);
      }

      // 2. MOVEMENT & PATROLS (Sometimes hesitates or walks slower)
      const currentRange = WEAPONS_DATA[bot.weapon].range;
      const isTooNear = absDistX < 45;
      
      // Stand still / Hesitate a bit (18% chance) to give player opening
      const hesitating = Math.random() < 0.18;

      if (!hesitating) {
        if (absDistX > currentRange - 20) {
          // Pursue player
          if (distanceX > 0) decInputs.right = true;
          else decInputs.left = true;
        } else if (isTooNear && Math.random() < 0.45) {
          // Back off slightly
          if (distanceX > 0) decInputs.left = true;
          else decInputs.right = true;
        }
      }

      // 3. COMBAT / ATTACK TIMING (Hesitates to avoid instant frame-perfect combos)
      const inZone = absDistX <= currentRange + 5;
      if (inZone && !hesitating) {
        // Only attack with a fun 25% chance per evaluation, preventing relentless spamming
        if (Math.random() < 0.25) {
          decInputs.attack = true;
        }
      }

      // 4. JUMP PATHFINDING & OBSTACLE EVASION
      // Evasion jump if stuck or moving against a wall
      if (Math.abs(bot.vx) < 0.15 && (decInputs.left || decInputs.right) && bot.onPlatform && Math.random() < 0.25) {
        decInputs.jump = true;
      }

      // Jump if target lies on a platform higher than bot (lowered frequency to feel easy)
      if (distanceY < -55 && bot.onPlatform && Math.random() < 0.08) {
        decInputs.jump = true;
      }

      // Rescue jump: Falling off platform edge
      if (bot.y > 300 && bot.onPlatform && Math.random() < 0.8) {
        decInputs.jump = true;
        if (bot.x < CANVAS_WIDTH / 2) {
          decInputs.right = true;
          decInputs.left = false;
        } else {
          decInputs.left = true;
          decInputs.right = false;
        }
      }

      // Store decisions
      botDecisionRef.current.inputs = decInputs;
    }

    // Apply stored decisions to active frame inputs
    bot.input.left = botDecisionRef.current.inputs.left;
    bot.input.right = botDecisionRef.current.inputs.right;
    bot.input.jump = botDecisionRef.current.inputs.jump;
    bot.input.attack = botDecisionRef.current.inputs.attack;

    // Keep facing direction synchronized smoothly
    if (bot.input.left) bot.facingRight = false;
    if (bot.input.right) bot.facingRight = true;
  };

  // Perform physical updates
  const updatePhysics = () => {
    if (roundStateRef.current === "round_end" || roundStateRef.current === "game_end") return;

    // Keep state and refs aligned
    p1Ref.current.isReady = p1Ready;
    p2Ref.current.isReady = p2Ready;

    const isFightActive = roundStateRef.current === "active";

    // Freeze motion and zero actions when not in fight mode
    if (!isFightActive) {
      p1Ref.current.vx = 0;
      p1Ref.current.vy = 0;
      p2Ref.current.vx = 0;
      p2Ref.current.vy = 0;
      p1Ref.current.input = { left: false, right: false, jump: false, attack: false };
      p2Ref.current.input = { left: false, right: false, jump: false, attack: false };

      // Force correct spawn positions during preparation & countdown to prevent overlap/drift
      if (roundStateRef.current === "ready_check" || roundStateRef.current === "countdown") {
        const spawns = getSpawnPoints(activeMap.id);
        p1Ref.current.x = spawns.p1.x;
        p1Ref.current.y = spawns.p1.y;
        p1Ref.current.onPlatform = true;

        p2Ref.current.x = spawns.p2.x;
        p2Ref.current.y = spawns.p2.y;
        p2Ref.current.onPlatform = true;
      }
    }

    const gravityVal = 0.5 * (activeMap.gravityModifier || 1.0);
    const regularFriction = scaledPlatforms[0]?.isSlippery ? 0.015 : 0.15;

    // --- P1 INPUT GATHER ---
    if (mode === "online") {
      const isRed = playerId.startsWith("Host");
      if (isRed) {
        // Red is local
        p1Ref.current.input.left = keysPressedRef.current["KeyA"] || keysPressedRef.current["a"] || false;
        p1Ref.current.input.right = keysPressedRef.current["KeyD"] || keysPressedRef.current["d"] || false;
        p1Ref.current.input.jump = keysPressedRef.current["Space"] || keysPressedRef.current["w"] || false;
      }
    } else {
      // Offline local/bot modes
      p1Ref.current.input.left = keysPressedRef.current["KeyA"] || keysPressedRef.current["a"] || false;
      p1Ref.current.input.right = keysPressedRef.current["KeyD"] || keysPressedRef.current["d"] || false;
      p1Ref.current.input.jump = keysPressedRef.current["Space"] || keysPressedRef.current["w"] || keysPressedRef.current["arrowup"] || false;
    }

    // --- P2 INPUT GATHER ---
    if (mode === "online") {
      const isGuest = playerId.startsWith("Guest");
      if (isGuest) {
        // Blue is local
        p2Ref.current.input.left = keysPressedRef.current["KeyA"] || keysPressedRef.current["a"] || false;
        p2Ref.current.input.right = keysPressedRef.current["KeyD"] || keysPressedRef.current["d"] || false;
        p2Ref.current.input.jump = keysPressedRef.current["Space"] || keysPressedRef.current["w"] || false;
      }
    } else if (mode === "local_2p") {
      p2Ref.current.input.left = keysPressedRef.current["ArrowLeft"] || keysPressedRef.current["arrowleft"] || keysPressedRef.current["j"] || keysPressedRef.current["keyj"] || keysPressedRef.current["KeyJ"] || false;
      p2Ref.current.input.right = keysPressedRef.current["ArrowRight"] || keysPressedRef.current["arrowright"] || keysPressedRef.current["l"] || keysPressedRef.current["keyl"] || keysPressedRef.current["KeyL"] || false;
      p2Ref.current.input.jump = keysPressedRef.current["ArrowUp"] || keysPressedRef.current["arrowup"] || keysPressedRef.current["i"] || keysPressedRef.current["keyi"] || keysPressedRef.current["KeyI"] || false;
    } else if (mode === "bot") {
      runSmartBotStrategy(p2Ref.current, p1Ref.current);
    }

    // --- APPLY GAME LOOP FOR P1 & P2 ---
    const players = [p1Ref.current, p2Ref.current];

    players.forEach((p) => {
      // Horizontal accel (Lowered for Bot to naturally give local players a tactical speed edge)
      const maxSpeed = p.isBot ? 3.3 : 4.5;
      const speedIncr = scaledPlatforms[0]?.isSlippery ? 0.15 : (p.isBot ? 0.35 : 0.55);

      if (p.input.left) {
        p.vx = Math.max(-maxSpeed, p.vx - speedIncr);
        p.facingRight = false;
      } else if (p.input.right) {
        p.vx = Math.min(maxSpeed, p.vx + speedIncr);
        p.facingRight = true;
      } else {
        // Apply Drag friction
        p.vx *= (1 - regularFriction);
        if (Math.abs(p.vx) < 0.15) p.vx = 0;
      }

      // GRAVITY
      p.vy += gravityVal;

      // X/Y displacement
      p.x += p.vx;
      p.y += p.vy;

      // Platform check before checking ground landing
      let landed = false;
      let leftWallTouch = false;
      let rightWallTouch = false;

      scaledPlatforms.forEach((plat) => {
        const pLeft = p.x - STICKMAN_WIDTH / 2;
        const pRight = p.x + STICKMAN_WIDTH / 2;
        const pBottom = p.y + STICKMAN_HEIGHT;
        const pTop = p.y;

        const platLeft = plat.x;
        const platRight = plat.x + plat.width;
        const platTop = plat.y;
        const platBottom = plat.y + plat.height;

        // Is there an overlap between player and platform?
        if (pRight > platLeft && pLeft < platRight && pBottom > platTop && pTop < platBottom) {
          // Calculate overlaps on both axes
          const overlapLeft = pRight - platLeft;
          const overlapRight = platRight - pLeft;
          const overlapTop = pBottom - platTop;
          const overlapBottom = platBottom - pTop;

          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);

          // Resolve based on axis of smallest depth
          if (minOverlapY < minOverlapX) {
            if (overlapTop < overlapBottom) {
              // Landing on top cleanly
              if (p.vy >= 0) {
                p.y = platTop - STICKMAN_HEIGHT;
                p.vy = 0;
                landed = true;
              }
            } else {
              // Bumping head on bottom
              if (p.vy < 0) {
                p.y = platBottom;
                p.vy = 0.5; // push down with minor bounce
              }
            }
          } else {
            // Side wall collision: resolve horizontally
            if (overlapLeft < overlapRight) {
              p.x = platLeft - STICKMAN_WIDTH / 2 - 0.5;
              p.vx = -0.5; // push away slightly to slide smoothly
              leftWallTouch = true;
            } else {
              p.x = platRight + STICKMAN_WIDTH / 2 + 0.5;
              p.vx = 0.5; // push away slightly to slide smoothly
              rightWallTouch = true;
            }
          }
        }
      });

      p.onPlatform = landed;

      // Wall slide: if touching a side wall while falling, slide down slowly
      if ((leftWallTouch || rightWallTouch) && !landed) {
        if (p.vy > 1.2) {
          p.vy = 1.2; // slow, responsive wall slide
        }
      }

      // Jump or Wall Jump Impulse
      if (p.input.jump) {
        if (p.onPlatform) {
          p.vy = activeMap.id === "nebula_station" ? -8 : -11; // floaty or high jumps
          p.onPlatform = false;
          spawnParticles(p.x, p.y + STICKMAN_HEIGHT, "#71717a", 5);
        } else if (leftWallTouch) {
          // Wall jump to the left (away from platform, e.g. bouncing off)
          p.vy = -10;
          p.vx = -4.5;
          spawnParticles(p.x + STICKMAN_WIDTH / 2, p.y + STICKMAN_HEIGHT / 2, "#38bdf8", 8);
          leftWallTouch = false;
        } else if (rightWallTouch) {
          // Wall jump to the right (away from platform, e.g. bouncing off)
          p.vy = -10;
          p.vx = 4.5;
          spawnParticles(p.x - STICKMAN_WIDTH / 2, p.y + STICKMAN_HEIGHT / 2, "#38bdf8", 8);
          rightWallTouch = false;
        }
      }
    });

    // --- SOLID PLAYER-TO-PLAYER COLLISION RESOLUTION (ROBOT İÇİNE GİRMESİN) ---
    const dx = p2Ref.current.x - p1Ref.current.x;
    const dy = p2Ref.current.y - p1Ref.current.y;
    const minDistanceX = STICKMAN_WIDTH + 8; // stickman width margin
    const minDistanceY = STICKMAN_HEIGHT - 6; // stickman height margin

    if (Math.abs(dx) < minDistanceX && Math.abs(dy) < minDistanceY && p1Ref.current.health > 0 && p2Ref.current.health > 0) {
      const overlapX = minDistanceX - Math.abs(dx);
      // Soft push both players apart to resolve overlap instantly
      if (dx > 0) {
        p1Ref.current.x = Math.max(15, p1Ref.current.x - overlapX * 0.5);
        p2Ref.current.x = Math.min(CANVAS_WIDTH - 15, p2Ref.current.x + overlapX * 0.5);
      } else {
        p1Ref.current.x = Math.min(CANVAS_WIDTH - 15, p1Ref.current.x + overlapX * 0.5);
        p2Ref.current.x = Math.max(15, p2Ref.current.x - overlapX * 0.5);
      }
      // Bounce horizontal momentum slightly
      const tempVx = p1Ref.current.vx;
      p1Ref.current.vx = p1Ref.current.vx * 0.3 + p2Ref.current.vx * 0.3;
      p2Ref.current.vx = p2Ref.current.vx * 0.3 + tempVx * 0.3;
    }

    players.forEach((p) => {
      // Keep inside border bounds (X)
      if (p.x < 15) p.x = 15;
      if (p.x > CANVAS_WIDTH - 15) p.x = CANVAS_WIDTH - 15;

      // Check Fall damage / death bounds (Y > 500)
      if (p.y > CANVAS_HEIGHT + 30) {
        p.health = 0;
        evaluateRoundEnd();
        spawnParticles(p.x, CANVAS_HEIGHT - 10, p.color === "red" ? "#ef4444" : "#3b82f6", 30);
      }

      // Tick attack timers
      if (p.attackAnimTimer > 0) {
        p.attackAnimTimer -= 1;
      }

      // Attack checking
      const keyboardSaldır1 = keysPressedRef.current["KeyF"] || keysPressedRef.current["f"];
      const keyboardSaldır2 = keysPressedRef.current["KeyK"] || keysPressedRef.current["k"];

      if (
        (p.color === "red" && (p.input.attack || keyboardSaldır1)) ||
        (p.color === "blue" && (p.input.attack || (mode === "local_2p" ? keyboardSaldır2 : false)))
      ) {
        triggerWeaponAttack(p);
      }
    });

    // --- BULLETS PHYSICS AND DAMAGE COLLISIONS ---
    const activeBullets = bulletsRef.current;
    bulletsRef.current = activeBullets.filter((b) => {
      b.x += b.vx;
      b.y += b.vy;

      // bullet wall collision
      if (b.x < 0 || b.x > CANVAS_WIDTH) return false;

      // Check hitting the opponent, not the owner
      const pTarget = b.ownerId === p1Ref.current.id ? p2Ref.current : p1Ref.current;

      if (
        b.x >= pTarget.x - STICKMAN_WIDTH / 2 &&
        b.x <= pTarget.x + STICKMAN_WIDTH / 2 &&
        b.y >= pTarget.y &&
        b.y <= pTarget.y + STICKMAN_HEIGHT
      ) {
        // Direct hit!
        damagePlayer(pTarget, b.damage, b.vx > 0 ? 8 : -8);
        spawnParticles(b.x, b.y, "#ef4444", 8);
        return false;
      }

      return true;
    });

    // --- Lava bottom burning check ---
    if (activeMap.id === "lava_island") {
      players.forEach((p) => {
        if (p.y > 410) {
          damagePlayer(p, 2.5, 0); // Melt player slowly in the boiling lava pool
        }
      });
    }

    // --- TICK PARTICLES ---
    particlesRef.current = particlesRef.current.filter((pr) => {
      pr.x += pr.vx;
      pr.y += pr.vy;
      pr.alpha -= 0.02;
      pr.duration -= 1;
      return pr.duration > 0 && pr.alpha > 0;
    });
  };

  const damagePlayer = (p: PlayerState, dmg: number, knockbackX: number) => {
    if (roundStateRef.current !== "active") return;

    // Direct health subtraction
    p.health = Math.max(0, p.health - dmg);

    // Play hit sound effect!
    playSound("hit");

    // Disabled knockback entirely as requested: "ittirmek olmasın sıfır vurdugunda geri gitmekte olmasın"
    // p.vx += knockbackX;
    // p.vy -= Math.abs(knockbackX) * 0.3 + 1;

    // Check of death
    if (p.health <= 0) {
      playSound("victory");
      evaluateRoundEnd();
    }
  };

  const triggerWeaponAttack = (p: PlayerState) => {
    const now = Date.now();
    const data = WEAPONS_DATA[p.weapon];

    if (now - p.lastAttackTime < data.cooldown) return;

    p.lastAttackTime = now;
    p.attackAnimTimer = 8; // set attack visual timer frame

    const faceDir = p.facingRight ? 1 : -1;

    if (p.weapon === WeaponType.PISTOL) {
      if (p.ammo <= 0) {
        // Auto trigger reload sound/timer or skip
        p.ammo = p.ammoMax;
        playSound("select");
        spawnParticles(p.x, p.y + 10, "#fbbf24", 5);
        return;
      }
      p.ammo -= 1;
      playSound("shoot");

      // Spawn bullet packet
      bulletsRef.current.push({
        id: "b_" + Math.random().toString(36).substring(2, 9),
        x: p.x + faceDir * 15,
        y: p.y + 15,
        vx: faceDir * (data.bulletSpeed || 12),
        vy: 0,
        ownerId: p.id,
        damage: data.damage
      });

      // gun flash sparks
      spawnParticles(p.x + faceDir * 18, p.y + 15, "#eab308", 4);
    } else {
      // Close Range Attacks (FIST, SWORD, PUSH_STICK)
      const opponent = p.color === "red" ? p2Ref.current : p1Ref.current;
      playSound("swing");

      const deltaX = opponent.x - p.x;
      const deltaY = opponent.y - p.y;
      const isOpponentInRange =
        Math.abs(deltaX) <= data.range &&
        deltaY >= -20 &&
        deltaY <= STICKMAN_HEIGHT + 20 &&
        ((p.facingRight && deltaX >= 0) || (!p.facingRight && deltaX <= 0));

      if (isOpponentInRange) {
        damagePlayer(opponent, data.damage, faceDir * data.knockback);
        spawnParticles(opponent.x, opponent.y + 20, p.color === "red" ? "#f87171" : "#60a5fa", 12);
      } else {
        // swing sound visual sparks
        spawnParticles(p.x + faceDir * data.range * 0.6, p.y + 20, "#e4e4e7", 3);
      }
    }
  };

  // Canvas visual drawing
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    // 1. Draw static gradients background
    ctx.fillStyle = activeMap.bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle sky gradient panel
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGrad.addColorStop(0, activeMap.skyColor);
    skyGrad.addColorStop(0.7, activeMap.bgColor);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Map-specific background decoration drawing
    drawMapDecorations(ctx);

    // 3. Draw static platforms
    scaledPlatforms.forEach((plat) => {
      // Gradient stone look
      const pGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
      pGrad.addColorStop(0, activeMap.platformColor);
      pGrad.addColorStop(1, "#07070d");

      ctx.fillStyle = pGrad;
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

      // Neon LED line top
      ctx.strokeStyle = activeMap.textColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y);
      ctx.lineTo(plat.x + plat.width, plat.y);
      ctx.stroke();

      if (plat.isSlippery) {
        // Draw slippery frozen frost dots
        ctx.fillStyle = "#e0f2fe";
        for (let i = 5; i < plat.width; i += 25) {
          ctx.fillRect(plat.x + i, plat.y + 2, 2.5, 2.5);
        }
      }
    });

    // 4. Draw stickmen characters
    drawStickman(ctx, p1Ref.current);
    drawStickman(ctx, p2Ref.current);

    // 5. Draw bullet lines (laser projectile pills with double glowing layer)
    bulletsRef.current.forEach((b) => {
      ctx.save();
      // Neon Outer Glow
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#10b981";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(b.x - 7, b.y - 2.5, 14, 5, 2.5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 6. Draw dynamic particles
    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // reset
  };

  const drawMapDecorations = (ctx: CanvasRenderingContext2D) => {
    const id = activeMap.id;

    if (id === "cyber_grid") {
      // 1. Cyber city neon columns
      ctx.fillStyle = "rgba(6, 182, 212, 0.05)";
      ctx.fillRect(150, 0, 50, CANVAS_HEIGHT);
      ctx.fillRect(760, 0, 50, CANVAS_HEIGHT);

      // Neon horizontal wire markings
      ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
      ctx.lineWidth = 1.5;
      for (let y = 60; y < CANVAS_HEIGHT; y += 100) {
        ctx.beginPath();
        ctx.moveTo(150, y); ctx.lineTo(200, y);
        ctx.moveTo(760, y); ctx.lineTo(810, y);
        ctx.stroke();
      }

      // Wind or cyber stream glowing particles floating across
      if (Math.random() < 0.1) {
        particlesRef.current.push({
          x: 0,
          y: Math.random() * 300 + 40,
          vx: Math.random() * 4 + 4,
          vy: (Math.random() - 0.5) * 0.5,
          color: "rgba(6, 182, 212, 0.25)",
          size: Math.random() * 2 + 1,
          alpha: 0.6,
          duration: 150
        });
      }
    } else if (id === "lava_island") {
      // Boiling orange lava background lake at Y=410
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(0, 410, CANVAS_WIDTH, 130);

      // boiling orange sine wave top
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      const waveT = Date.now() * 0.003;
      for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
        const y = 410 + Math.sin(x * 0.02 + waveT) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineTo(0, CANVAS_HEIGHT);
      ctx.fill();

      // Emit rising flame sparks
      if (Math.random() < 0.2) {
        particlesRef.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: 400,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 3 - 1,
          color: "#f97316",
          size: Math.random() * 3.5 + 1.5,
          alpha: 1.0,
          duration: 110
        });
      }
    } else if (id === "crystal_cave") {
      // Draw background amethyst crystals in the deep caverns
      ctx.fillStyle = "rgba(168, 85, 247, 0.08)";
      
      // Giant background cave crystal pillars
      ctx.beginPath();
      ctx.moveTo(300, 0); ctx.lineTo(340, 150); ctx.lineTo(380, 0);
      ctx.moveTo(580, 0); ctx.lineTo(620, 120); ctx.lineTo(660, 0);
      ctx.fill();

      ctx.fillStyle = "#a855f7";
      ctx.font = "14px Arial";
      ctx.fillText("🔮", 330, 165);
      ctx.fillText("🔮", 610, 135);

      // Sparkly magic dust particles falling slowly
      if (Math.random() < 0.07) {
        particlesRef.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * 100,
          vx: (Math.random() - 0.5) * 1.2,
          vy: Math.random() * 0.8 + 0.4,
          color: "rgba(192, 132, 252, 0.45)",
          size: Math.random() * 3 + 1,
          alpha: 0.8,
          duration: 200
        });
      }
    } else if (id === "frozen_peak") {
      // Snowy falling flakes
      if (Math.random() < 0.35) {
        particlesRef.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: 0,
          vx: Math.random() * 1.5 - 0.5,
          vy: Math.random() * 1.5 + 1.2,
          color: "#ffffff",
          size: Math.random() * 3 + 1,
          alpha: 0.9,
          duration: 220
        });
      }

      // Draw cool snowflake symbols in sky
      ctx.strokeStyle = "rgba(147, 197, 253, 0.05)";
      ctx.lineWidth = 2;
      ctx.strokeRect(100, 80, 30, 30);
      ctx.strokeRect(800, 120, 25, 25);
    } else if (id === "nebula_station") {
      // Cosmic glow swirling reactor dots (violet energy sparkles)
      if (Math.random() < 0.15) {
        particlesRef.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: 100 + Math.random() * 300,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          color: Math.random() < 0.5 ? "#f472b6" : "#c084fc",
          size: Math.random() * 4 + 1,
          alpha: 0.9,
          duration: 90
        });
      }

      // Drawn station radar ring lines in background
      ctx.strokeStyle = "rgba(244, 114, 182, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 140, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const drawStickman = (ctx: CanvasRenderingContext2D, p: PlayerState) => {
    if (p.health <= 0) return; // do not rendering deceased

    const cx = p.x;
    const cy = p.y;
    const weaponData = WEAPONS_DATA[p.weapon];
    const isAttacking = p.attackAnimTimer > 0;
    const faceDir = p.facingRight ? 1 : -1;

    // Head center is cy + 12
    const hx = cx;
    const hy = cy + 12;
    const radius = 7.0; // Hollow Head radius

    // Body spine line coordinates
    const sx_top = cx;
    const sy_top = cy + 20;
    const sx_bot = cx;
    const sy_bot = cy + 34;

    // Walking animation phase calculation
    const isMoving = Math.abs(p.vx) > 0.4;
    const walkCycle = isMoving ? Math.sin(Date.now() * 0.015) : 0;

    // Left/Right Leg movements
    const lLeg_end_x = cx - 7 + walkCycle * 6;
    const lLeg_end_y = cy + STICKMAN_HEIGHT;
    const rLeg_end_x = cx + 7 - walkCycle * 6;
    const rLeg_end_y = cy + STICKMAN_HEIGHT;

    // Arms & Weapon hands coordinates
    let lHand_x = cx - 8;
    let lHand_y = cy + 24;
    let rHand_x = cx + 8;
    let rHand_y = cy + 24;

    if (isAttacking) {
      if (p.facingRight) {
        rHand_x = cx + 18;
        rHand_y = cy + 15 - (p.attackAnimTimer * 1.5);
      } else {
        lHand_x = cx - 18;
        lHand_y = cy + 15 - (p.attackAnimTimer * 1.5);
      }
    } else if (isMoving) {
      rHand_x = cx + 7 + walkCycle * 4;
      lHand_x = cx - 7 - walkCycle * 4;
    }

    // Colors setting
    const neonColor = p.color === "red" ? "#ff3333" : "#00d2ff";

    // Helper to trace skeleton lines to support dual-pass rendering (Glow + Core)
    const traceSkeleton = () => {
      // 1. Draw head circle
      ctx.beginPath();
      ctx.arc(hx, hy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Body spine
      ctx.beginPath();
      ctx.moveTo(sx_top, sy_top);
      ctx.lineTo(sx_bot, sy_bot);

      // 3. Legs
      ctx.moveTo(sx_bot, sy_bot);
      ctx.lineTo(lLeg_end_x, lLeg_end_y);
      ctx.moveTo(sx_bot, sy_bot);
      ctx.lineTo(rLeg_end_x, rLeg_end_y);

      // 4. Arms
      ctx.moveTo(sx_top, sy_top);
      ctx.lineTo(lHand_x, lHand_y);
      ctx.moveTo(sx_top, sy_top);
      ctx.lineTo(rHand_x, rHand_y);
      
      ctx.stroke();
    };

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // --- PASS 1: GORGEOUS OUTER NEON GLOW ---
    ctx.shadowBlur = 15;
    ctx.shadowColor = neonColor;
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 5.0;
    traceSkeleton();

    // --- PASS 2: INNER BRILLIANT WHITE CORE COHESION ---
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    traceSkeleton();

    ctx.restore();

    // 5. Draw equipable Hat/Costume customization (vector visual art matching neon stickman)
    if (p.hatId !== "none") {
      ctx.save();
      // flip hat/torso accessories based on facing direction
      ctx.translate(hx, hy);
      ctx.scale(p.facingRight ? 1 : -1, 1);

      if (p.hatId === "crown") {
        // --- KING ROYAL CAPE & CROWN SKIN ---
        ctx.restore();
        ctx.save();
        // Blow dynamic cape behind player movement
        const capeBlowX = -p.vx * 3.5 - (p.facingRight ? 9 : -9);
        ctx.fillStyle = "rgba(220, 38, 38, 0.35)"; // royal red
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx_top, sy_top);
        ctx.quadraticCurveTo(sx_top + capeBlowX * 0.5, sy_top + 10, sx_bot + capeBlowX, sy_bot + 12);
        ctx.lineTo(sx_bot, sy_bot);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // King Crown
        ctx.translate(hx, hy - 4);
        ctx.scale(p.facingRight ? 1 : -1, 1);
        ctx.strokeStyle = "#fbbf24"; // gold yellow
        ctx.shadowColor = "rgba(251, 191, 36, 0.8)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.8;
        ctx.fillStyle = "rgba(251, 191, 36, 0.25)"; // semi-transparent gold
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(9, 0);
        ctx.lineTo(8, -8);
        ctx.lineTo(3, -3);
        ctx.lineTo(0, -9);
        ctx.lineTo(-3, -3);
        ctx.lineTo(-8, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, -9, 1.6, 0, Math.PI * 2);
        ctx.arc(-8, -8, 1.4, 0, Math.PI * 2);
        ctx.arc(8, -8, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.hatId === "cowboy") {
        // --- SHERIFF COWBOY SKIN ---
        ctx.restore();
        ctx.save();
        
        // Draw Sheriff Vest
        ctx.strokeStyle = "#7c2d12"; // Deep brown leather
        ctx.fillStyle = "rgba(124, 45, 18, 0.35)";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(sx_top - 3, sy_top);
        ctx.lineTo(sx_top + 3, sy_top);
        ctx.lineTo(sx_bot + 4, sy_bot - 1);
        ctx.lineTo(sx_bot - 4, sy_bot - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing gold Sheriff star badge on chest
        ctx.strokeStyle = "#fbbf24";
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(sx_top + (p.facingRight ? 2 : -2), sy_top + 5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Cowboy Hat
        ctx.translate(hx, hy - 4);
        ctx.scale(p.facingRight ? 1 : -1, 1);
        ctx.strokeStyle = "#ea580c"; // cowboy copper/brown
        ctx.shadowColor = "rgba(234, 88, 12, 0.7)";
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.8;
        ctx.fillStyle = "rgba(234, 88, 12, 0.25)";
        
        ctx.beginPath();
        ctx.moveTo(-13, 1);
        ctx.quadraticCurveTo(0, 3, 13, 1);
        ctx.quadraticCurveTo(11, -2, 8, -2);
        ctx.lineTo(-8, -2);
        ctx.quadraticCurveTo(-11, -2, -13, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-7, -2);
        ctx.lineTo(-6, -10);
        ctx.quadraticCurveTo(0, -12, 6, -10);
        ctx.lineTo(7, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (p.hatId === "ninja") {
        // --- GIZEMLI NINJA SKIN ---
        ctx.restore();
        ctx.save();
        
        // Crossed dual Katana swords on back
        ctx.strokeStyle = "#a1a1aa"; // steel
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx_top - 6, sy_top + 12);
        ctx.lineTo(sx_top + 8, sy_top - 4);
        ctx.moveTo(sx_top + 6, sy_top + 12);
        ctx.lineTo(sx_top - 8, sy_top - 4);
        ctx.stroke();

        // Wrapped sash around the waist (sx_bot)
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(sx_bot - 3, sy_bot - 2);
        ctx.lineTo(sx_bot + 3, sy_bot - 2);
        ctx.stroke();

        // Red head bandage ninja wrap
        ctx.translate(hx, hy - 4);
        ctx.scale(p.facingRight ? 1 : -1, 1);
        ctx.strokeStyle = "#f43f5e"; // rose/red band
        ctx.shadowColor = "rgba(244, 63, 94, 0.8)";
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.2;
        ctx.fillStyle = "rgba(244, 63, 94, 0.4)";
        
        ctx.beginPath();
        ctx.arc(0, 3, 8.5, -Math.PI * 0.9, -Math.PI * 0.1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-8, -1);
        ctx.bezierCurveTo(-14, 1, -12, 7, -16, 9);
        ctx.moveTo(-8, -1);
        ctx.bezierCurveTo(-15, -1, -11, 4, -14, 4);
        ctx.stroke();
        ctx.restore();
      } else if (p.hatId === "spartan") {
        // --- SPARTAN DEMIGOD SKIN ---
        ctx.restore();
        ctx.save();

        // Round Spartan Bronze Shield on back
        ctx.strokeStyle = "#b45309";
        ctx.fillStyle = "rgba(180, 83, 9, 0.35)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(sx_top - (p.facingRight ? 5 : -5), sy_top + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Lambda 'Λ' emblem on shield center
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx_top - (p.facingRight ? 7 : -3), sy_top + 11);
        ctx.lineTo(sx_top - (p.facingRight ? 5 : -5), sy_top + 5);
        ctx.lineTo(sx_top - (p.facingRight ? 3 : -7), sy_top + 11);
        ctx.stroke();

        // Helmet
        ctx.translate(hx, hy - 4);
        ctx.scale(p.facingRight ? 1 : -1, 1);
        ctx.strokeStyle = "#ca8a04"; // bronze gold
        ctx.shadowColor = "rgba(202, 138, 4, 0.8)";
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.8;
        ctx.fillStyle = "rgba(202, 138, 4, 0.3)";

        ctx.beginPath();
        ctx.arc(0, 4, 8.5, -Math.PI * 1.15, Math.PI * 0.15);
        ctx.lineTo(8, 8);
        ctx.lineTo(2, 8);
        ctx.lineTo(0, 4); 
        ctx.lineTo(-4, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#ef4444";
        ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.quadraticCurveTo(0, -11, 6, -4);
        ctx.stroke();
        ctx.restore();
      } else if (p.hatId === "wizard") {
        // --- MYSTICAL WIZARD SKIN ---
        ctx.restore();
        ctx.save();

        // Glowing Purple Mage Archrobe covering body spine down to thigh
        ctx.strokeStyle = "#c084fc";
        ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx_top - 3, sy_top);
        ctx.lineTo(sx_top + 3, sy_top);
        ctx.lineTo(sx_bot + 6, sy_bot + 6);
        ctx.lineTo(sx_bot - 6, sy_bot + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wizard pointed hat
        ctx.translate(hx, hy - 4);
        ctx.scale(p.facingRight ? 1 : -1, 1);
        ctx.strokeStyle = "#a855f7"; // magic purple
        ctx.shadowColor = "rgba(168, 85, 247, 0.8)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.8;
        ctx.fillStyle = "rgba(168, 85, 247, 0.25)";

        ctx.beginPath();
        ctx.ellipse(0, 1, 13, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.quadraticCurveTo(-4, -12, 1, -17);
        ctx.lineTo(5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (p.hatId === "astronaut") {
        // --- SPACE ASTRONAUT SKIN ---
        ctx.restore();
        ctx.save();

        // White oxygen life support pack back wear
        ctx.strokeStyle = "#cbd5e1";
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.roundRect(sx_top - (p.facingRight ? 8 : -3), sy_top + 2, 5, 12, 2);
        ctx.fill();
        ctx.stroke();

        // Cosmic sphere visor helmet
        ctx.translate(hx, hy - 4);
        ctx.scale(p.facingRight ? 1 : -1, 1);
        ctx.strokeStyle = "#0ea5e9"; // cosmos cyan
        ctx.shadowColor = "rgba(14, 165, 233, 0.8)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.6;
        ctx.fillStyle = "rgba(14, 165, 233, 0.15)";
        
        ctx.beginPath();
        ctx.arc(0, 4, 11.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 4, 8.5, -Math.PI * 0.7, -Math.PI * 0.35);
        ctx.stroke();
        ctx.restore();
      } else if (p.hatId === "chef") {
        // --- MASTER CHEF SKIN ---
        ctx.restore();
        ctx.save();

        // Chef White double-breasted coat
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(sx_top - 4, sy_top);
        ctx.lineTo(sx_top + 4, sy_top);
        ctx.lineTo(sx_bot + 4, sy_bot - 1);
        ctx.lineTo(sx_bot - 4, sy_bot - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Button dots on chef coat
        ctx.fillStyle = "#18181b";
        ctx.beginPath();
        ctx.arc(sx_top - 1.5, sy_top + 4, 0.8, 0, Math.PI * 2);
        ctx.arc(sx_top - 1.5, sy_top + 8, 0.8, 0, Math.PI * 2);
        ctx.arc(sx_top + 1.5, sy_top + 4, 0.8, 0, Math.PI * 2);
        ctx.arc(sx_top + 1.5, sy_top + 8, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Chef Height white hat
        ctx.translate(hx, hy - 4);
        ctx.scale(p.facingRight ? 1 : -1, 1);
        ctx.strokeStyle = "#e4e4e7"; // chef white
        ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.8;
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";

        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-6, -6);
        ctx.bezierCurveTo(-11, -10, -5, -15, -3, -12);
        ctx.bezierCurveTo(-3, -18, 3, -18, 3, -12);
        ctx.bezierCurveTo(5, -15, 11, -10, 6, -6);
        ctx.lineTo(6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.restore();
      }
    }

    // 6. Draw active weapon icon in the attacking hand
    const weaponHandX = p.facingRight ? rHand_x : lHand_x;
    const weaponHandY = p.facingRight ? rHand_y : lHand_y;

    ctx.save();
    ctx.translate(weaponHandX, weaponHandY);
    ctx.scale(faceDir, 1);

    if (p.weapon === WeaponType.SWORD) {
      // Stunning neon energy laser saber blade
      // Neon Outer Glow
      ctx.shadowColor = p.color === "red" ? "#ff2a2a" : "#00bbff";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = p.color === "red" ? "rgba(239, 68, 68, 0.85)" : "rgba(14, 165, 233, 0.85)";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(18, -14);
      ctx.stroke();

      // Bright White Inner Core for energy effect
      ctx.shadowBlur = 4;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      
      // Hilt guard (Golden yellow)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-3, 3);
      ctx.lineTo(5, -5);
      ctx.stroke();
    } else if (p.weapon === WeaponType.PISTOL) {
      // Neon cyan-green Sci-Fi quantum blaster gun
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 10;
      
      // Gun body
      ctx.fillStyle = "#1e293b"; // metallic slate
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.roundRect(0, -4, 12, 5, 1.5);
      ctx.roundRect(-2, -1, 4, 7, 1);
      ctx.fill();
      ctx.stroke();

      // Glowing green plasma cartridge core
      ctx.fillStyle = "#34d399";
      ctx.shadowBlur = 12;
      ctx.fillRect(1, -3, 6, 2.5);
    } else if (p.weapon === WeaponType.PUSH_STICK) {
      // Yellow glowing electrical thunder spear with electric bolts!
      ctx.shadowColor = "#eab308";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, 5);
      ctx.lineTo(18, -13);
      ctx.stroke();

      // White hot energy tip
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(10, -7);
      ctx.lineTo(18, -13);
      ctx.stroke();

      // Draw active lightning branching sparks
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#f59e0b";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(18, -13);
      // Small randomized zig-zag electrical discharges
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.4;
      const length = 8 + Math.random() * 6;
      const tx1 = 18 + Math.cos(angle - 0.3) * (length * 0.5);
      const ty1 = -13 + Math.sin(angle - 0.3) * (length * 0.5);
      const tx2 = 18 + Math.cos(angle) * length;
      const ty2 = -13 + Math.sin(angle) * length;
      ctx.lineTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    } else {
      // FIST (YUMRUK): dynamic fiery plasma punch orb
      ctx.shadowColor = p.color === "red" ? "#f97316" : "#3b82f6"; // orange fire or cool blue flame
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color === "red" ? "rgba(249, 115, 22, 0.5)" : "rgba(59, 130, 246, 0.5)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Small erratic flame sparks inside the fist orb
      ctx.fillStyle = p.color === "red" ? "#ef4444" : "#a5f3fc";
      ctx.beginPath();
      ctx.arc((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 7. Render swinging sword blade slash arc
    if (isAttacking && p.weapon === WeaponType.SWORD) {
      ctx.save();
      ctx.shadowColor = p.color === "red" ? "#ef4444" : "#3b82f6";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = p.color === "red" ? "rgba(239, 68, 68, 0.75)" : "rgba(59, 130, 246, 0.75)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy + 18, weaponData.range * 0.85, p.facingRight ? -Math.PI / 3 : Math.PI * 0.8, p.facingRight ? Math.PI * 0.35 : Math.PI * 1.45);
      ctx.stroke();

      // Draw sharp white crescent line under the arc to represent speed trail
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }

    // 8. Render punch fist shockwaves
    if (isAttacking && p.weapon === WeaponType.FIST) {
      ctx.save();
      ctx.shadowColor = p.color === "red" ? "#f97316" : "#60a5fa";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = p.color === "red" ? "rgba(249, 115, 22, 0.75)" : "rgba(96, 165, 250, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(weaponHandX + faceDir * 12, weaponHandY, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Health bar & Name label top
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(cx - 24, cy - 25, 48, 5);

    ctx.fillStyle = p.color === "red" ? "#ef4444" : "#3b82f6";
    ctx.fillRect(cx - 24, cy - 25, (p.health / p.maxHealth) * 48, 5);

    // border health box
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - 24, cy - 25, 48, 5);

    // Display Name tag
    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(`${p.name} (${weaponData.icon})`, cx, cy - 32);

    // Show ammo counts on bullet players
    if (p.weapon === WeaponType.PISTOL) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "8px monospace";
      ctx.fillText(`${p.ammo}/${p.ammoMax} AMMO`, cx, cy - 14);
    }
  };

  // Mobile Handlers
  const handleTouchLeft = (state: boolean) => {
    const isRed = playerId.startsWith("Host") || mode !== "online";
    const ref = isRed ? p1Ref : p2Ref;
    ref.current.input.left = state;
  };

  const handleTouchRight = (state: boolean) => {
    const isRed = playerId.startsWith("Host") || mode !== "online";
    const ref = isRed ? p1Ref : p2Ref;
    ref.current.input.right = state;
  };

  const handleTouchJump = () => {
    const isRed = playerId.startsWith("Host") || mode !== "online";
    const ref = isRed ? p1Ref : p2Ref;
    if (ref.current.onPlatform) {
      ref.current.vy = activeMap.id === "nebula_station" ? -8 : -11;
      ref.current.onPlatform = false;
    }
  };

  const handleTouchAttack = () => {
    const isRed = playerId.startsWith("Host") || mode !== "online";
    const ref = isRed ? p1Ref : p2Ref;
    triggerWeaponAttack(ref.current);
  };

  const handleTouchWeaponCycle = () => {
    if (roundStateRef.current !== "ready_check") return;
    const isRed = playerId.startsWith("Host") || mode !== "online";
    const ref = isRed ? p1Ref : p2Ref;
    const currentWeapon = ref.current.weapon;
    const order = [WeaponType.FIST, WeaponType.SWORD, WeaponType.PISTOL, WeaponType.PUSH_STICK];
    const currentIndex = order.indexOf(currentWeapon);
    const nextIndex = (currentIndex + 1) % order.length;
    changeWeapon(ref.current, order[nextIndex]);
    if (isRed) {
      setP1Weapon(order[nextIndex]);
    } else {
      setP2Weapon(order[nextIndex]);
    }
  };

  const handleTouchCustomSelectWeapon = (w: WeaponType) => {
    if (roundStateRef.current !== "ready_check") return;
    const isRed = playerId.startsWith("Host") || mode !== "online";
    const ref = isRed ? p1Ref : p2Ref;
    changeWeapon(ref.current, w);
    if (isRed) {
      setP1Weapon(w);
    } else {
      setP2Weapon(w);
    }
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center select-none">
      
      {/* Game Dashboard Panel */}
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 p-4 rounded-t-2xl flex items-center justify-between">
        
        {/* P1 Scoreboard card */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-lg font-bold">
            {redScore}
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-bold block leading-none">KIRMIZI</span>
            <span className="text-sm font-semibold text-zinc-200">{p1Ref.current.name}</span>
          </div>
        </div>

        {/* Round Counter and Timer */}
        <div className="text-center">
          <span id="round_counter_lbl" className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-0.5">
            Raund {internalRound} / 5
          </span>
          <div id="game_timer_lbl" className="text-3xl font-mono font-black text-amber-400">
            {uiTimer > 9 ? uiTimer : `0${uiTimer}`}
          </div>
        </div>

        {/* P2 Scoreboard card */}
        <div className="flex items-center gap-3 flex-row-reverse text-right">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
            {blueScore}
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-bold block leading-none">MAVİ</span>
            <span className="text-sm font-semibold text-zinc-200">{p2Ref.current.name}</span>
          </div>
        </div>

      </div>

      {/* Main Graph Canvas Container */}
      <div className="relative w-full max-w-4xl overflow-hidden bg-black border-x border-b border-zinc-800 rounded-b-2xl">
        
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full block bg-black"
        />

        {/* Ready Check Overlay */}
        {roundStateRef.current === "ready_check" && (
          <div id="ready_check_overlay" className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center backdrop-blur-md animate-fade-in z-50">
            <span className="text-xs tracking-[0.25em] font-extrabold text-amber-500 uppercase mb-2">MÜCADELE HAZIRLIĞI</span>
            <h2 className="text-3xl font-black text-white font-sans uppercase mb-1">
              Raund {internalRound} Başlıyor
            </h2>
            <p className="text-xs text-zinc-500 mb-8 max-w-sm text-center">
              Savaşa başlamak için her iki oyuncunun da "HAZIR" olması gerekmektedir.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl px-4 justify-center">
              
              {/* P1 State Card */}
              <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col items-center text-center">
                <span className={`w-2.5 h-2.5 rounded-full ${p1Ready ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-ping"} mb-3`}></span>
                <span className="text-xs text-zinc-500 font-bold block uppercase leading-none">Kırmızı Oyuncu</span>
                <h4 className="text-sm font-black text-zinc-200 mt-1 mb-4 select-none">{p1Ref.current.name}</h4>
                
                {/* Starter Weapon Selection for Red Player */}
                <div className="mb-4 w-full">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Başlangıç Silahı Seç</span>
                  {mode === "online" && !playerId.startsWith("Host") ? (
                    <div className="py-5 px-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-center text-xs text-zinc-400 font-medium select-none">
                      🔒 Kırmızı Silah Seçiyor... <br/>
                      <span className="text-[10px] text-zinc-500 mt-1 block">(Sürpriz Seçim!)</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {[
                        { type: WeaponType.FIST, name: "Yumruk", emoji: "🥊" },
                        { type: WeaponType.SWORD, name: "Kılıç", emoji: "⚔️" },
                        { type: WeaponType.PISTOL, name: "Tabanca", emoji: "🔫" },
                        { type: WeaponType.PUSH_STICK, name: "Değnek", emoji: "⚡" }
                      ].map((w) => {
                        const isSelected = p1Weapon === w.type;
                        const isDisabled = p1Ready || (mode === "online" && !playerId.startsWith("Host"));
                        return (
                          <button
                            key={w.type}
                            disabled={isDisabled}
                            onClick={() => {
                              setP1Weapon(w.type);
                              changeWeapon(p1Ref.current, w.type);
                              playSound("select");
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all ${
                              isSelected
                                ? "bg-red-500/20 text-red-400 border-red-500/50 font-bold scale-102 shadow-md"
                                : "bg-zinc-950/70 text-zinc-400 border-zinc-800/80 hover:bg-zinc-850 hover:text-zinc-300"
                            } ${isDisabled && !isSelected ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <span className="text-sm">{w.emoji}</span>
                            <span className="text-[9px] truncate leading-none uppercase font-extrabold">{w.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {p1Ready ? (
                  <div className="px-5 py-2 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 select-none">
                    <span>✓ HAZIR</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const isRed = mode !== "online" || playerId.startsWith("Host");
                      if (isRed) {
                        setP1Ready(true);
                        playSound("ready");
                      }
                    }}
                    disabled={mode === "online" && !playerId.startsWith("Host")}
                    className="w-full px-5 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition text-xs select-none shadow-lg transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Hazır Ol <span className="text-[10px] opacity-70 font-mono ml-1">[F]</span>
                  </button>
                )}
              </div>

              {/* P2 State Card */}
              <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col items-center text-center">
                <span className={`w-2.5 h-2.5 rounded-full ${p2Ready ? "bg-emerald-500 animate-pulse" : "bg-blue-500 animate-ping"} mb-3`}></span>
                <span className="text-xs text-zinc-500 font-bold block uppercase leading-none">Mavi Oyuncu</span>
                <h4 className="text-sm font-black text-zinc-200 mt-1 mb-4 select-none">{p2Ref.current.name}</h4>

                {/* Starter Weapon Selection for Blue Player */}
                <div className="mb-4 w-full">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Başlangıç Silahı Seç</span>
                  {mode === "online" && !playerId.startsWith("Guest") ? (
                    <div className="py-5 px-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-center text-xs text-zinc-400 font-medium select-none">
                      🔒 Mavi Silah Seçiyor... <br/>
                      <span className="text-[10px] text-zinc-500 mt-1 block">(Sürpriz Seçim!)</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {[
                        { type: WeaponType.FIST, name: "Yumruk", emoji: "🥊" },
                        { type: WeaponType.SWORD, name: "Kılıç", emoji: "⚔️" },
                        { type: WeaponType.PISTOL, name: "Tabanca", emoji: "🔫" },
                        { type: WeaponType.PUSH_STICK, name: "Değnek", emoji: "⚡" }
                      ].map((w) => {
                        const isSelected = p2Weapon === w.type;
                        const isDisabled = p2Ready || (mode === "online" && !playerId.startsWith("Guest"));
                        return (
                          <button
                            key={w.type}
                            disabled={isDisabled}
                            onClick={() => {
                              setP2Weapon(w.type);
                              changeWeapon(p2Ref.current, w.type);
                              playSound("select");
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all ${
                              isSelected
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/50 font-bold scale-102 shadow-md"
                                : "bg-zinc-950/70 text-zinc-400 border-zinc-800/80 hover:bg-zinc-850 hover:text-zinc-300"
                            } ${isDisabled && !isSelected ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <span className="text-sm">{w.emoji}</span>
                            <span className="text-[9px] truncate leading-none uppercase font-extrabold">{w.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {p2Ready ? (
                  <div className="px-5 py-2 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 select-none">
                    <span>✓ HAZIR</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (mode === "local_2p") {
                        setP2Ready(true);
                        playSound("ready");
                      } else if (mode === "online" && playerId.startsWith("Guest")) {
                        setP2Ready(true);
                        playSound("ready");
                      } else if (mode === "bot") {
                        setP2Ready(true);
                        playSound("ready");
                      }
                    }}
                    disabled={(mode === "online" && !playerId.startsWith("Guest"))}
                    className="w-full px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition text-xs select-none shadow-lg transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Hazır Ol <span className="text-[10px] opacity-70 font-mono ml-1">[K]</span>
                  </button>
                )}
              </div>

            </div>

            <div className="text-[10px] font-mono text-zinc-600 mt-8">
              Klavye Kısayolları: Kırmızı için [F/W], Mavi için [K/I/Ok Tuşu]
            </div>
          </div>
        )}

        {/* Big visual screen overlay for Round countdown */}
        {uiCountdown > 0 && roundStateRef.current === "countdown" && (
          <div id="countdown_overlay" className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
            <span className="text-xs tracking-[0.2em] font-extrabold text-amber-500 uppercase mb-4">Mücadele Başlıyor</span>
            <div className="text-8xl font-black text-white font-sans animate-bounce">
              {uiCountdown}
            </div>
            <span className="text-xs text-zinc-400 font-medium mt-6 uppercase">Hazır Ol!</span>
          </div>
        )}

        {/* Round Over state banner */}
        {roundStateRef.current === "round_end" && (
          <div id="round_end_overlay" className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center animate-fade-in">
            <span className="text-red-500 text-lg uppercase tracking-widest font-black animate-pulse mb-2">Round bitti</span>
            <h3 className="text-2xl font-black text-zinc-200">{roundWinnerMsg}</h3>
            <p className="text-xs text-zinc-500 mt-4 font-mono">Sonraki raund hazırlanıyor...</p>
          </div>
        )}

        {/* Game is Over Final Screen */}
        {gameEnded && finalWinner && (
          <div id="game_win_overlay" className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 animate-fade-in backdrop-blur-md">
            
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse mb-4 text-3xl">
              👑
            </div>

            <span className="text-amber-500 font-mono tracking-widest text-xs uppercase font-bold mb-1">MÜCADELE SONUCU</span>
            <h2 className="text-3xl font-black text-white mb-2 font-sans tracking-tight">
              {finalWinner === "Kırmızı" ? p1Ref.current.name : p2Ref.current.name} MAÇI KAZANDI!
            </h2>
            <p className="text-zinc-400 text-sm mb-6 max-w-sm text-center">
              Kıyasıya düello sona erdi. {redScore} - {blueScore} skorla nihai galip belirlendi!
            </p>

            {/* Scorecard Stats layout */}
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 text-center">Maç İçi Skor Tablosu</h4>
              <div className="grid grid-cols-2 text-center border-t border-zinc-800/60 pt-3">
                <div className="border-r border-zinc-800/60">
                  <p className="text-xs text-zinc-500 font-medium">{p1Ref.current.name}</p>
                  <p className="text-xl font-bold font-mono text-white mt-1">{redScore} Galibiyet</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium">{p2Ref.current.name}</p>
                  <p className="text-xl font-bold font-mono text-white mt-1">{blueScore} Galibiyet</p>
                </div>
              </div>

              {/* Earned gold coins feed */}
              <div className="mt-4 pt-3 border-t border-zinc-800/60 text-center flex items-center justify-center gap-1.5 text-xs text-amber-400 font-mono font-bold">
                💰 Havuz Ödülü: +{matchCoinsReward} Altın Kazanıldı!
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                id="rematch_btn"
                onClick={handleRematchVote}
                disabled={rematchLoading}
                className="px-6 py-2.5 rounded-xl font-bold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{rematchLoading ? "Oynanıyor..." : "Tekrar Oyna"}</span>
              </button>
              <button
                id="exit_to_lobby_btn"
                onClick={onExit}
                className="px-6 py-2.5 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-750 text-white transition border border-zinc-700/50"
              >
                Menüye Dön
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Informative controls display below canvas with locked weapon message */}
      {roundStateRef.current === "active" && (
        <div className="mt-4 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl w-full max-w-4xl flex items-center justify-between gap-3 text-zinc-400 flex-wrap text-xs font-medium animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold font-mono text-[10px] uppercase bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded select-none">SİLAH KİLİTLİ</span>
            <span>Raund boyunca seçtiğiniz silahla dövüşürsünüz (Sadece tur arasında seçim yapılabilir).</span>
          </div>

          <div id="pc_controls_info" className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-[10px] text-zinc-500 font-mono">
            <span>🔴 <b>[Kırmızı]:</b> A/D = Sol/Sağ | Boşluk/W = Zıpla | F = Saldırı (1,2,3,4 Hotkeyleri)</span>
            <span>🔵 <b>[Mavi]:</b> Oklar (←/→)/J/L = Sol/Sağ | Ok-Yukarı/I = Zıpla | K = Saldırı (7,8,9,0 Hotkeyleri)</span>
          </div>
        </div>
      )}

      {/* Mobile/Touch Screen Layout Buttons bar */}
      {showTouchControls && roundStateRef.current === "active" && (
        <div id="touch_controller_pad" className="w-full max-w-4xl grid grid-cols-12 gap-2 mt-4 px-1 bg-zinc-950 border border-zinc-900 p-4 rounded-2xl select-none">
          
          {/* Joystick buttons */}
          <div className="col-span-5 flex gap-2">
            <button
              onMouseDown={() => handleTouchLeft(true)}
              onMouseUp={() => handleTouchLeft(false)}
              onTouchStart={() => handleTouchLeft(true)}
              onTouchEnd={() => handleTouchLeft(false)}
              className="flex-1 max-w-[90px] h-14 bg-zinc-800 active:bg-red-600 rounded-xl flex items-center justify-center font-black text-xl text-white select-none touch-none scale-100 active:scale-95 transition"
            >
              ◀
            </button>
            <button
              onMouseDown={() => handleTouchRight(true)}
              onMouseUp={() => handleTouchRight(false)}
              onTouchStart={() => handleTouchRight(true)}
              onTouchEnd={() => handleTouchRight(false)}
              className="flex-1 max-w-[90px] h-14 bg-zinc-800 active:bg-red-600 rounded-xl flex items-center justify-center font-black text-xl text-white select-none touch-none scale-100 active:scale-95 transition"
            >
              ▶
            </button>
          </div>

          <div className="col-span-1"></div>

          {/* Action Triggers */}
          <div className="col-span-6 flex gap-2 justify-end">
            {/* Cycle Weapon button */}
            <button
              onClick={handleTouchWeaponCycle}
              className="px-4 h-14 bg-zinc-800 active:bg-amber-500 active:text-zinc-950 rounded-xl text-xs font-bold text-zinc-300 select-none flex flex-col items-center justify-center leading-none"
            >
              <span>♻️</span>
              <span className="mt-1">Silah Değiş</span>
            </button>
            
            {/* Jump button */}
            <button
              onClick={handleTouchJump}
              className="w-14 h-14 bg-zinc-800 active:bg-blue-600 rounded-xl font-bold text-white select-none flex items-center justify-center"
            >
              ▲ JUMP
            </button>

            {/* Fire button */}
            <button
              onClick={handleTouchAttack}
              className="w-16 h-14 bg-red-600 active:bg-red-500 text-white font-black text-xs uppercase rounded-xl shadow-lg ring-1 ring-red-500/50 flex flex-col items-center justify-center leading-none select-none touch-none scale-100 active:scale-95 transition"
            >
              💥
              <span className="mt-1">SALDIR</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
