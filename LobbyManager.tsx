/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { GameLobby, ChatMessage, HATS_DATA } from "../types";
import { GAME_MAPS } from "../maps";
import { Copy, Plus, LogIn, Users, Send, MapPin, Shield, CheckCircle, ArrowLeft } from "lucide-react";
import { HatGraphic } from "./HatGraphic";

interface LobbyManagerProps {
  playerName: string;
  equippedHat: string;
  onStartMatch: (config: { mode: "online"; code: string; playerId: string; mapId: string; opponentHat: string }) => void;
  onExitLobby: () => void;
}

export default function LobbyManager({ playerName, equippedHat, onStartMatch, onExitLobby }: LobbyManagerProps) {
  const [activeStep, setActiveStep] = useState<"menu" | "create" | "join" | "room">("menu");
  const [lobbyCodeInput, setLobbyCodeInput] = useState<string>("");
  const [lobby, setLobby] = useState<GameLobby | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Stop sync loop on unmount
  useEffect(() => {
    return () => {
      stopSyncLoop();
    };
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lobby?.chat]);

  // Handle active game/lobby transitions
  useEffect(() => {
    if (lobby && lobby.gameState.status !== "lobby" && lobby.gameState.status !== "countdown") {
      // Game has officially started!
      stopSyncLoop();
      const guestId = Object.keys(lobby.players).find(id => id !== playerId);
      const opponentHat = guestId ? lobby.players[guestId].hatId : "none";
      onStartMatch({
        mode: "online",
        code: lobby.code,
        playerId,
        mapId: lobby.mapId,
        opponentHat
      });
    }
  }, [lobby?.gameState?.status, lobby?.mapId]);

  const startSyncLoop = (code: string, pId: string) => {
    stopSyncLoop();

    syncIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/lobby/status/${code}`);
        if (response.ok) {
          const updatedLobby: GameLobby = await response.json();
          setLobby(updatedLobby);
        } else {
          // Lobby deleted or server crashed
          setErrorText("Lobi sunucuyla bağlantısı kesildi.");
          setActiveStep("menu");
          stopSyncLoop();
        }
      } catch (err) {
        console.error("Lobby sync failed", err);
      }
    }, 1000); // Poll lobby every second in lobby phase
  };

  const stopSyncLoop = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  const handleCreateLobby = async () => {
    try {
      const response = await fetch("/api/lobby/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName, hatId: equippedHat }),
      });

      if (response.ok) {
        const data = await response.json();
        setLobby(data.lobby);
        setPlayerId(data.playerId);
        setActiveStep("room");
        startSyncLoop(data.code, data.playerId);
      } else {
        const err = await response.json();
        setErrorText(err.message || "Lobi kurulamadı.");
      }
    } catch (e) {
      setErrorText("Lobi sunucusuna bağlanılamadı.");
    }
  };

  const handleJoinLobby = async () => {
    if (!lobbyCodeInput.trim()) return;
    setErrorText("");

    try {
      const response = await fetch("/api/lobby/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: lobbyCodeInput.toUpperCase().trim(),
          name: playerName,
          hatId: equippedHat,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLobby(data.lobby);
        setPlayerId(data.playerId);
        setActiveStep("room");
        startSyncLoop(data.code, data.playerId);
      } else {
        const err = await response.json();
        setErrorText(err.message || "Lobiye katılınamadı.");
      }
    } catch (e) {
      setErrorText("Lobiye katılma başarısız oldu. Sunucu hatası.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !lobby) return;

    const textToSend = chatInput;
    setChatInput("");

    try {
      const response = await fetch(`/api/lobby/chat/${lobby.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          senderName: playerName,
          text: textToSend,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLobby((prev) => (prev ? { ...prev, chat: data.chat } : prev));
      }
    } catch (err) {
      console.error("Chat sync failed", err);
    }
  };

  const handleSelectMap = async (mapId: string) => {
    if (!lobby || lobby.hostId !== playerId) return;

    try {
      await fetch(`/api/lobby/action/${lobby.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select_map",
          mapId,
          playerId,
        }),
      });
      // the status sync loop will pick up this game transition and trigger onStartMatch
    } catch (e) {
      console.error("Map selection trigger failed", e);
    }
  };

  const handleLeaveLobby = async () => {
    stopSyncLoop();
    if (lobby && playerId) {
      try {
        await fetch(`/api/lobby/action/${lobby.code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "exit",
            playerId,
          }),
        });
      } catch (e) {
        // silent fail
      }
    }
    setLobby(null);
    setPlayerId("");
    setActiveStep("menu");
    onExitLobby();
  };

  const copyCodeToClipboard = () => {
    if (!lobby) return;
    navigator.clipboard.writeText(lobby.code);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl p-6 mx-auto bg-zinc-950 border border-zinc-900 rounded-2xl shadow-xl">
      
      {/* Navigation top bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-900">
        <button
          onClick={handleLeaveLobby}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-zinc-900/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri Dön</span>
        </button>
        <span className="text-zinc-500 text-xs font-mono">Çevrimiçi Sunucu Bağlantısı Etkin</span>
      </div>

      {errorText && (
        <div className="mb-6 p-3 text-sm text-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
          {errorText}
        </div>
      )}

      {/* STEP 1: INITIAL SELECTION MENU */}
      {activeStep === "menu" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          
          {/* Create Card */}
          <div
            id="lobby_create_card"
            onClick={handleCreateLobby}
            className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-red-500/30 rounded-2xl group cursor-pointer transition duration-300 transform hover:-translate-y-1"
          >
            <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-4 group-hover:scale-110 transition">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Yeni Lobi Oluştur</h3>
            <p className="text-sm text-zinc-400 text-center max-w-xs">
              4 karakterli özel bir oda kodu oluşturur. Arkadaşını davet ederek hemen oynamaya başlayabilirsin. Emeklerinize değer!
            </p>
          </div>

          {/* Join Card */}
          <div
            id="lobby_join_card"
            onClick={() => setActiveStep("join")}
            className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-blue-500/30 rounded-2xl group cursor-pointer transition duration-300 transform hover:-translate-y-1"
          >
            <div className="p-4 rounded-full bg-blue-500/10 text-blue-500 mb-4 group-hover:scale-110 transition">
              <LogIn className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Lobiye Katıl</h3>
            <p className="text-sm text-zinc-400 text-center max-w-xs">
              Arkadaşının verdiği 4 haneli lobi kodunu girerek onun odasına katıl ve düelloya ortak ol!
            </p>
          </div>

        </div>
      )}

      {/* STEP 2: JOINING FILL-IN */}
      {activeStep === "join" && (
        <div className="max-w-md mx-auto py-8">
          <h3 className="text-lg font-bold text-white mb-4 text-center">Lobi Giriş Kodu</h3>
          <div className="flex gap-2">
            <input
              id="lobby_code_input"
              type="text"
              placeholder="Örn: HG4Y"
              value={lobbyCodeInput}
              onChange={(e) => setLobbyCodeInput(e.target.value.toUpperCase())}
              maxLength={4}
              className="flex-1 px-4 py-3 text-lg font-mono tracking-widest text-center border font-bold rounded-xl border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              id="lobby_join_confirm_btn"
              onClick={handleJoinLobby}
              className="px-6 py-3 font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              Giriş Yap
            </button>
          </div>
          <button
            onClick={() => setActiveStep("menu")}
            className="mt-4 text-sm text-zinc-400 hover:text-white transition block mx-auto underline"
          >
            Seçim menüsüne geri dön
          </button>
        </div>
      )}

      {/* STEP 3: LOBBY ROOM PREVIEW & CHAT */}
      {activeStep === "room" && lobby && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ROOM SIDEBAR: Players and Room Info */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Code Box */}
            <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Lobi Kodu</span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-3xl font-mono font-black text-amber-400 tracking-wide">{lobby.code}</span>
                <button
                  id="copy_code_btn"
                  onClick={copyCodeToClipboard}
                  className="p-1 px-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1 text-xs"
                  title="Kodu kopyala"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyFeedback ? "Kopyalandı!" : "Kopyala"}</span>
                </button>
              </div>
            </div>

            {/* Players Status List */}
            <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800 flex-1">
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <h4 className="text-sm font-bold text-zinc-200">Oyuncular (Maks 2)</h4>
              </div>

              <div className="flex flex-col gap-3">
                {Object.keys(lobby.players).map((pId) => {
                  const player = lobby.players[pId];
                  const isHost = lobby.hostId === pId;

                  return (
                    <div
                      key={pId}
                      className={`flex items-center justify-between p-3 rounded-lg border bg-zinc-950 ${
                        player.color === "red" ? "border-red-500/20" : "border-blue-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <HatGraphic id={player.hatId} size={28} />
                        <div>
                          <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                            {player.name}
                            {isHost && (
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono flex items-center">
                                <Shield className="w-2.5 h-2.5 mr-0.5" /> kurucu
                              </span>
                            )}
                          </p>
                          <span className={`text-[10px] uppercase font-bold ${
                            player.color === "red" ? "text-red-500" : "text-blue-500"
                          }`}>
                            {player.color === "red" ? "Kırmızı Çöp Adam" : "Mavi Çöp Adam"}
                          </span>
                        </div>
                      </div>
                      <span className="text-emerald-500 flex items-center text-xs gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Hazır
                      </span>
                    </div>
                  );
                })}

                {Object.keys(lobby.players).length < 2 && (
                  <div className="flex flex-col items-center justify-center p-4 py-6 border border-dashed border-zinc-800 rounded-lg text-center">
                    <span className="text-xl animate-pulse mb-1">🎮</span>
                    <p className="text-xs text-zinc-500">Rakip bekleniyor...</p>
                    <p className="text-[10px] text-zinc-600 mt-1 max-w-[150px]">Lobi kodunu arkadaşına göndererek davet et</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ROOM MAIN PANEL: Map Selector (Host) or Chat + Ready Screen (Guest) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Chat Room Card */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col h-[280px]">
              <div className="px-4 py-2 border-b border-zinc-800/80 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                Lobi Sohbeti
              </div>
              
              {/* Chat view box */}
              <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5">
                {lobby.chat.map((msg) => {
                  const isSys = msg.senderId === "system";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        isSys
                          ? "mx-auto bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-md text-zinc-400 text-xs"
                          : msg.senderId === playerId
                          ? "ml-auto items-end"
                          : "mr-auto items-start"
                      }`}
                    >
                      {!isSys && (
                        <span className="text-[10px] font-bold text-zinc-500 mb-0.5 px-0.5">
                          {msg.senderName}
                        </span>
                      )}
                      
                      <div
                        className={`text-sm px-3.5 py-2 rounded-2xl ${
                          isSys
                            ? "text-center text-zinc-400 leading-snug font-mono"
                            : msg.senderId === playerId
                            ? "bg-zinc-800 text-white rounded-tr-none"
                            : msg.color === "red"
                            ? "bg-red-950/30 text-red-200 border border-red-900/30 rounded-tl-none"
                            : "bg-blue-950/30 text-blue-200 border border-blue-900/30 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Mesaj yaz..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={100}
                  className="flex-1 px-3 py-2 text-sm border bg-zinc-950 border-zinc-800 focus:outline-none focus:border-muted rounded-xl text-white"
                />
                <button
                  type="submit"
                  className="p-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* MAP CONFIG SELECTION */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
              {lobby.hostId === playerId ? (
                <div>
                  <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                    <MapPin className="w-4 h-4 text-amber-500" /> Harita Seç ve Savaşı Başlat (Kurucu)
                  </h4>
                  <p className="text-xs text-zinc-400 mb-4">
                    Alttaki haritalardan birine tıklayarak düelloyu başlatabilirsin. Hazır ol, hemen sayım başlayacaktır!
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {GAME_MAPS.map((map) => (
                      <button
                        key={map.id}
                        id={`map_select_btn_${map.id}`}
                        onClick={() => handleSelectMap(map.id)}
                        disabled={Object.keys(lobby.players).length < 2}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-200 ${
                          Object.keys(lobby.players).length < 2
                            ? "border-zinc-800/40 bg-zinc-900/10 opacity-40 cursor-not-allowed"
                            : "border-zinc-800 bg-zinc-950 hover:border-amber-500/50 hover:bg-zinc-900/50 active:scale-95"
                        }`}
                      >
                        <span className="text-xs font-bold text-white mb-0.5 line-clamp-1">{map.name}</span>
                        <span className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{map.description}</span>
                      </button>
                    ))}
                  </div>

                  {Object.keys(lobby.players).length < 2 && (
                    <div className="mt-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center text-xs text-amber-400">
                      Oyun başlatmak için lobiye en az bir rakibin katılması gerekmektedir!
                    </div>
                  )}
                </div>
              ) : (
                <div id="guest_waiting_panel" className="text-center p-6 flex flex-col items-center justify-center">
                  <div className="relative flex items-center justify-center w-12 h-12 mb-3 bg-indigo-500/10 text-indigo-400 rounded-full animate-pulse">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-semibold text-white mb-1">Harita Seçimi Bekleniyor</h5>
                  <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                    Oda kurucusu <b>{lobby.players[lobby.hostId]?.name || "Kurucu"}</b> haritaları inceliyor. O seçtiği anda duel başlayacak!
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
