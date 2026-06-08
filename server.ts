/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GameLobby, PlayerState, ChatMessage, WeaponType } from "./src/types";

// In-memory lobby database
const LOBBIES: Record<string, GameLobby> = {};

// Clean inactive lobbies older than 15 minutes to prevent leak
setInterval(() => {
  const now = Date.now();
  for (const code in LOBBIES) {
    if (now - LOBBIES[code].lastUpdate > 15 * 60 * 1000) {
      delete LOBBIES[code];
      console.log(`Lobby ${code} cleaned up due to inactivity.`);
    }
  }
}, 5 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper: generate 4-character uppercase code
  function generateLobbyCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // readable chars
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return LOBBIES[code] ? generateLobbyCode() : code;
  }

  // --- API Routes ---

  // Create lobby
  app.post("/api/lobby/create", (req, res) => {
    const { name, hatId } = req.body;
    const code = generateLobbyCode();
    const hostId = "Host_" + Math.random().toString(36).substring(2, 9);

    const initialHostState: PlayerState = {
      id: hostId,
      name: name || "Kırmızı Oyuncu",
      color: "red",
      x: 200,
      y: 100,
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
      hatId: hatId || "none",
      input: { left: false, right: false, jump: false, attack: false },
      isBot: false,
      isReady: true,
    };

    LOBBIES[code] = {
      code,
      hostId,
      players: {
        [hostId]: initialHostState,
      },
      chat: [
        {
          id: "sys_" + Date.now(),
          senderId: "system",
          senderName: "Sistem",
          color: "red",
          text: `Lobi kuruldu! Arkadaşının girmesi için kod: ${code}`,
          timestamp: Date.now(),
        },
      ],
      mapId: "temple_stairs",
      gameState: {
        status: "lobby",
        currentRound: 1,
        timer: 60,
        winnerId: null,
        countdownTime: 0,
      },
      lastUpdate: Date.now(),
    };

    console.log(`Lobby ${code} created by ${hostId}`);
    res.json({ success: true, code, playerId: hostId, lobby: LOBBIES[code] });
  });

  // Join lobby
  app.post("/api/lobby/join", (req, res) => {
    const { code, name, hatId } = req.body;
    const targetCode = String(code).toUpperCase().trim();
    const lobby = LOBBIES[targetCode];

    if (!lobby) {
      return res.status(404).json({ success: false, message: "Lobi bulunamadı!" });
    }

    const playerKeys = Object.keys(lobby.players);
    if (playerKeys.length >= 2) {
      return res.status(400).json({ success: false, message: "Lobi dolu! Maksimum 2 oyuncu." });
    }

    const playerId = "Guest_" + Math.random().toString(36).substring(2, 9);
    const guestState: PlayerState = {
      id: playerId,
      name: name || "Mavi Oyuncu",
      color: "blue",
      x: 600,
      y: 100,
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
      hatId: hatId || "none",
      input: { left: false, right: false, jump: false, attack: false },
      isBot: false,
      isReady: true,
    };

    lobby.players[playerId] = guestState;
    lobby.chat.push({
      id: "sys_" + Date.now(),
      senderId: "system",
      senderName: "Sistem",
      color: "blue",
      text: `${guestState.name} lobiye katıldı!`,
      timestamp: Date.now(),
    });

    lobby.lastUpdate = Date.now();
    console.log(`Player ${playerId} joined lobby ${targetCode}`);
    res.json({ success: true, code: targetCode, playerId, lobby });
  });

  // Lobi details/status API
  app.get("/api/lobby/status/:code", (req, res) => {
    const lobby = LOBBIES[String(req.params.code).toUpperCase()];
    if (!lobby) {
      return res.status(404).json({ success: false, message: "Lobi bulunamadı." });
    }
    res.json(lobby);
  });

  // Rapid sync channel (sends own state, gets full lobby state)
  app.post("/api/lobby/sync/:code/:playerId", (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const playerId = req.params.playerId;
    const lobby = LOBBIES[code];

    if (!lobby) {
      return res.status(404).json({ success: false, message: "Lobi bulunamadı." });
    }

    // Update state of our player
    const ourState = req.body.playerState;
    const bulletsList = req.body.bullets; // optional sync bullet spawns
    const triggerEvent = req.body.event; // optional match lifecycle prompts

    if (ourState && lobby.players[playerId]) {
      lobby.players[playerId] = {
        ...lobby.players[playerId],
        ...ourState,
        id: playerId, // prevent tempering player uuid
      };
    }

    // Handle round endings, match syncs from host
    if (triggerEvent && playerId === lobby.hostId) {
      if (triggerEvent.type === "round_over") {
        lobby.gameState.status = "round-end";
        lobby.gameState.winnerId = triggerEvent.winnerId;
        if (triggerEvent.winnerId && lobby.players[triggerEvent.winnerId]) {
          lobby.players[triggerEvent.winnerId].score += 1;
        }
        lobby.gameState.timer = 0;
      } else if (triggerEvent.type === "match_over") {
        lobby.gameState.status = "final-end";
        lobby.gameState.winnerId = triggerEvent.winnerId;
      } else if (triggerEvent.type === "timer_update") {
        lobby.gameState.timer = triggerEvent.timer;
      } else if (triggerEvent.type === "start_match") {
        lobby.gameState.status = "playing";
        lobby.gameState.currentRound = triggerEvent.round || 1;
        lobby.gameState.timer = 60;
        lobby.gameState.winnerId = null;
        // reset players health for new round
        Object.keys(lobby.players).forEach((id) => {
          lobby.players[id].health = 55;
        });
      }
    }
    
    // Attach bullets to response if they exist in sync packet to replicate across clients
    lobby.lastUpdate = Date.now();
    res.json({
      lobby,
      bullets: bulletsList || []
    });
  });

  // Action / State Triggering (Change Map, Ready Status, Rematch or Start Game)
  app.post("/api/lobby/action/:code", (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const { action, mapId, playerId } = req.body;
    const lobby = LOBBIES[code];

    if (!lobby) {
      return res.status(404).json({ success: false, message: "Lobi bulunamadı." });
    }

    if (action === "select_map") {
      lobby.mapId = mapId;
      lobby.gameState.status = "countdown";
      lobby.gameState.countdownTime = 3;
      lobby.chat.push({
        id: "sys_" + Date.now(),
        senderId: "system",
        senderName: "Sistem",
        color: "red",
        text: `Harita "${mapId}" seçildi! Savaş başlıyor...`,
        timestamp: Date.now(),
      });
    } else if (action === "countdown_tick") {
      if (lobby.gameState.status === "countdown") {
        lobby.gameState.countdownTime = Math.max(0, req.body.time);
        if (lobby.gameState.countdownTime === 0) {
          lobby.gameState.status = "playing";
          lobby.gameState.timer = 60;
          lobby.gameState.currentRound = 1;
          // reset score
          Object.keys(lobby.players).forEach((id) => {
            lobby.players[id].score = 0;
            lobby.players[id].health = 55;
          });
        }
      }
    } else if (action === "rematch") {
      lobby.gameState.status = "countdown";
      lobby.gameState.currentRound = 1;
      lobby.gameState.countdownTime = 3;
      lobby.gameState.timer = 60;
      lobby.gameState.winnerId = null;
      Object.keys(lobby.players).forEach((id) => {
        lobby.players[id].score = 0;
        lobby.players[id].health = 55;
      });
      lobby.chat.push({
        id: "sys_" + Date.now(),
        senderId: "system",
        senderName: "Sistem",
        color: "red",
        text: `Tekrar oynama seçildi! Savaş yeniden başlıyor.`,
        timestamp: Date.now(),
      });
    } else if (action === "exit") {
      if (playerId) {
        delete lobby.players[playerId];
        if (Object.keys(lobby.players).length === 0) {
          delete LOBBIES[code];
        } else {
          // delegate host if host left
          if (lobby.hostId === playerId) {
            lobby.hostId = Object.keys(lobby.players)[0];
          }
          lobby.chat.push({
            id: "sys_" + Date.now(),
            senderId: "system",
            senderName: "Sistem",
            color: "blue",
            text: `Bir oyuncu ayrıldı.`,
            timestamp: Date.now(),
          });
        }
      }
    }

    lobby.lastUpdate = Date.now();
    res.json({ success: true, lobby });
  });

  // Chat message sending
  app.post("/api/lobby/chat/:code", (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const { playerId, senderName, text } = req.body;
    const lobby = LOBBIES[code];

    if (!lobby) {
      return res.status(404).json({ success: false, message: "Lobi bulunamadı." });
    }

    const player = lobby.players[playerId];
    if (!player) {
      return res.status(403).json({ success: false, message: "Oyuncu lobiye ait değil." });
    }

    const msg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      senderId: playerId,
      senderName: senderName || player.name,
      color: player.color,
      text: String(text).slice(0, 100), // safe char limit
      timestamp: Date.now(),
    };

    lobby.chat.push(msg);
    // restrict of total messages count
    if (lobby.chat.length > 40) {
      lobby.chat.shift();
    }

    lobby.lastUpdate = Date.now();
    res.json({ success: true, chat: lobby.chat });
  });

  // --- Vite Dev & Production Serving ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
