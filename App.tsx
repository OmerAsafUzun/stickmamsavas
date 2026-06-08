/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import LobbyManager from "./components/LobbyManager";
import SkinShop from "./components/SkinShop";
import GameCanvas from "./components/GameCanvas";
import { GAME_MAPS } from "./maps";
import { HATS_DATA } from "./types";
import { Play, Users, ShoppingBag, ShieldCheck, Coins, Award, HelpCircle, Edit3, ArrowLeft } from "lucide-react";
import { HatGraphic } from "./components/HatGraphic";

export default function App() {
  // Navigation states
  const [screen, setScreen] = useState<"menu" | "map_select_offline" | "gameplay" | "lobby">("menu");
  
  // Game running states
  const [gameMode, setGameMode] = useState<"bot" | "online" | "local_2p">("bot");
  const [selectedMapId, setSelectedMapId] = useState<string>("cyber_grid");
  const [lobbyCode, setLobbyCode] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [opponentHat, setOpponentHat] = useState<string>("none");

  // Customization & Shop states
  const [playerName, setPlayerName] = useState<string>("Çöp Adam");
  const [equippedHat, setEquippedHat] = useState<string>("none");
  const [coins, setCoins] = useState<number>(0);
  const [showShop, setShowShop] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  // Sync state values on load
  useEffect(() => {
    // Coins
    const storedCoins = localStorage.getItem("copadam_coins");
    if (storedCoins === null) {
      localStorage.setItem("copadam_coins", "150");
      setCoins(150);
    } else {
      setCoins(parseInt(storedCoins) || 0);
    }

    // Name
    const storedName = localStorage.getItem("copadam_playerName");
    if (storedName) {
      setPlayerName(storedName);
    } else {
      localStorage.setItem("copadam_playerName", "Çöp Adam");
    }

    // Equipped Hat
    const storedHat = localStorage.getItem("copadam_equipped_hat");
    if (storedHat) {
      setEquippedHat(storedHat);
    } else {
      localStorage.setItem("copadam_equipped_hat", "none");
    }
  }, [screen, showShop]);

  const updateCoinsFromLocal = () => {
    const storedCoins = localStorage.getItem("copadam_coins");
    setCoins(parseInt(storedCoins || "0") || 0);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim().substring(0, 14) || "Çöp Adam";
    localStorage.setItem("copadam_playerName", finalName);
    setPlayerName(finalName);
    setIsEditingName(false);
  };

  // Launch Offline matches
  const launchOfflineGame = (mapId: string) => {
    setSelectedMapId(mapId);
    setScreen("gameplay");
  };

  const handleStartLobbyMatch = (config: {
    mode: "online";
    code: string;
    playerId: string;
    mapId: string;
    opponentHat: string;
  }) => {
    setGameMode("online");
    setLobbyCode(config.code);
    setPlayerId(config.playerId);
    setSelectedMapId(config.mapId);
    setOpponentHat(config.opponentHat);
    setScreen("gameplay");
  };

  const quitToMainMenu = () => {
    setScreen("menu");
    updateCoinsFromLocal();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-red-500/30 selection:text-white">
      
      {/* Decorative colored ambient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col relative z-10 justify-center">
        
        {/* APP SCREEN 1: MENU DASHBOARD */}
        {screen === "menu" && (
          <div className="flex-1 flex flex-col justify-center py-10">
            
            {/* Visual Header Branding */}
            <div className="text-center mb-8 relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 border rounded-full border-zinc-800 bg-zinc-900/60 text-xs font-mono font-bold text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>v1.2 Stabilized Edition</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white font-sans uppercase">
                ÇÖP ADAM <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-zinc-400 to-blue-500">SAVAŞLARI</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
                Kırmızı ve Mavi efsanevi çöp adamların platform üzerindeki destansı, dengeli silahlı düello arenası!
              </p>
            </div>

            {/* Profile Config Card & Coin displays */}
            <div className="w-full max-w-xl mx-auto bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-800 border border-zinc-700/50 rounded-full flex items-center justify-center relative shadow-md">
                  <HatGraphic id={equippedHat} size={32} />
                </div>
                <div>
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="flex gap-1.5">
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="İsim yaz..."
                        className="px-2 py-1 text-xs border bg-zinc-950 border-zinc-800 rounded focus:outline-none focus:border-red-500 text-white font-bold"
                        maxLength={14}
                        autoFocus
                      />
                      <button type="submit" className="px-2 py-1 text-[10px] bg-red-600 text-white font-bold rounded hover:bg-red-500 transition">Kaydet</button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-100">{playerName}</span>
                      <button onClick={() => setIsEditingName(true)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition" title="İsmi Düzenle">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block leading-none">Profil Karakteri</span>
                </div>
              </div>

              {/* Coins counter */}
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full border-amber-500/20 bg-amber-500/5 text-amber-400">
                <Coins className="w-4 h-4 fill-amber-400" />
                <span className="font-mono text-xs font-bold">{coins} Altın</span>
              </div>
            </div>

            {/* Dynamic Buttons grid of modes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto w-full mb-8">
              
              {/* Bot selection action */}
              <button
                id="mode_bot_btn"
                onClick={() => {
                  setGameMode("bot");
                  setScreen("map_select_offline");
                }}
                className="flex items-center gap-4 p-5 rounded-2xl border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-red-500/30 text-left transition transform hover:-translate-y-0.5 active:scale-95 group font-sans"
              >
                <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 text-red-500 transition">
                  <Play className="w-6 h-6 fill-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Robot ile Oyna</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Gelişmiş bota karşı 6 özgün haritadan birini seçerek kıyasıya savaş!
                  </p>
                </div>
              </button>

              {/* Local 2player action */}
              <button
                id="mode_local_btn"
                onClick={() => {
                  setGameMode("local_2p");
                  setScreen("map_select_offline");
                }}
                className="flex items-center gap-4 p-5 rounded-2xl border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-blue-500/30 text-left transition transform hover:-translate-y-0.5 active:scale-95 group font-sans"
              >
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-500 transition">
                  <Play className="w-6 h-6 fill-blue-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">İki Kişilik (Aynı Bilgisayardan)</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Arkadaşınla aynı klavyeden biriniz A/D öbürü Ok Tuşlarıyla yan yana mücadele edin!
                  </p>
                </div>
              </button>

              {/* Online Multiplayer room action */}
              <button
                id="mode_online_btn"
                onClick={() => {
                  setGameMode("online");
                  setScreen("lobby");
                }}
                className="flex items-center gap-4 p-5 rounded-2xl border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-indigo-500/30 text-left transition transform hover:-translate-y-0.5 active:scale-95 group font-sans col-span-1 md:col-span-2"
              >
                <div className="p-3 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-500 transition">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Çevrimiçi Çok Oyunculu (Lobi Kodu İle)</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Özel bir oda kodu oluşturup arkadaşınla farklı bilgisayarlar üzerinden internet aracılığıyla anlık lobi sohbeti ve savaş deneyimi yaşayın!
                  </p>
                </div>
              </button>

              {/* Skins shop action */}
              <button
                id="open_shop_btn"
                onClick={() => setShowShop(true)}
                className="flex items-center gap-3 p-3.5 px-4 rounded-xl border border-zinc-900 bg-zinc-900/20 hover:border-amber-500/35 transition cursor-pointer text-xs font-semibold text-center text-zinc-300 hover:text-white"
              >
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Görünüm ve Şapka Özelleştirme Mağazası</span>
              </button>

              {/* Help guidelines display trigger */}
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 p-3.5 px-4 rounded-xl border border-zinc-900 bg-zinc-900/20 hover:border-zinc-700 transition cursor-pointer text-xs font-semibold text-center text-zinc-300 hover:text-white justify-center"
              >
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span>Oyun Kuralları, Silahlar ve Kontroller</span>
              </button>

            </div>

            {/* Quick credit */}
            <div className="text-center text-xs text-zinc-600 font-mono mt-4">
              © 2026 Efsane Çöp Adam Savaşları • Her savaş 5 raund üzerinden oynanır!
            </div>

          </div>
        )}

        {/* APP SCREEN 2: MAP SELECTION (OFFLINE MODES ONLY) */}
        {screen === "map_select_offline" && (
          <div className="flex-1 py-4">
            
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
              <div>
                <h2 className="text-2xl font-black text-white">Harita Seçimi Yap</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Savaşacağınız platformu ve ortamı belirleyin.</p>
              </div>
              <button
                onClick={() => setScreen("menu")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Geri Dön
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {GAME_MAPS.map((map) => (
                <div
                  key={map.id}
                  id={`map_box_${map.id}`}
                  onClick={() => launchOfflineGame(map.id)}
                  className="flex flex-col justify-between p-5 rounded-2xl border border-zinc-900 bg-gradient-to-b from-zinc-900 to-zinc-950 hover:border-red-500/30 cursor-pointer transform hover:-translate-y-1 transition duration-250 group"
                >
                  <div>
                    <span className="text-xs font-bold font-mono tracking-wide text-zinc-500 block uppercase mb-1">
                      Platform Arenası
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition">
                      {map.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {map.description}
                    </p>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] text-zinc-500 font-mono">
                    <span>Özel Tema: {map.theme.toUpperCase()}</span>
                    <span className="text-red-500 font-bold group-hover:translate-x-1 transition-transform">Savaşı Başlat →</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* APP SCREEN 3: GAMEPLAY ARENA */}
        {screen === "gameplay" && (
          <div className="flex-1 flex flex-col justify-center py-2 animate-fade-in">
            
            <div className="flex items-center justify-between mb-4 w-full max-w-4xl mx-auto px-1">
              <span className="text-xs font-bold font-mono text-zinc-500">
                Mod: <span className="text-zinc-300">{gameMode === "bot" ? "Robot (Yapay Zeka)" : gameMode === "local_2p" ? "Yerel 2p" : `Online (Lobi Kodu: ${lobbyCode})`}</span>
              </span>
              <button
                id="quit_gameplay_btn"
                onClick={quitToMainMenu}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-900/20 border border-zinc-800 hover:border-red-500/20 text-xs font-semibold text-zinc-300 hover:text-red-400 transition"
              >
                Savaştan Çık
              </button>
            </div>

            <GameCanvas
              mode={gameMode}
              lobbyCode={lobbyCode}
              playerId={playerId}
              mapId={selectedMapId}
              opponentHat={opponentHat}
              onMatchComplete={() => {}}
              onExit={quitToMainMenu}
            />

          </div>
        )}

        {/* APP SCREEN 4: ONLINE LOBBY MANAGER VIEW */}
        {screen === "lobby" && (
          <LobbyManager
            playerName={playerName}
            equippedHat={equippedHat}
            onStartMatch={handleStartLobbyMatch}
            onExitLobby={quitToMainMenu}
          />
        )}

      </div>

      {/* OVERLAY: Skins shop and customizing hats */}
      {showShop && (
        <SkinShop
          onClose={() => setShowShop(false)}
          onEquipHat={(id) => setEquippedHat(id)}
        />
      )}

      {/* OVERLAY: Help Controls Dialog popup */}
      {showHelp && (
        <div id="help_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-zinc-900 pb-2">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              Nasıl Oynanır? Kurallar ve Silah Dengesi
            </h3>

            <div className="text-xs text-zinc-400 leading-relaxed space-y-4 max-h-[350px] overflow-y-auto pr-2">
              
              <div>
                <h4 className="text-sm font-bold text-zinc-200 mb-1">🎮 Oyun Kuralları</h4>
                <p>
                  Her savaş en fazla <b>5 raund</b> üzerinden oynanır. Toplamda <b>3 raund</b> kazanan maçı yener. Raundlar rakiplerden biri ölene, platformdan aşağı düşene veya 60 saniyelik süre dolana kadar sürer. Süre bittiğinde canı fazla olan raundu kazanır.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-200 mb-1">💻 PC Kontrolleri</h4>
                <ul className="list-disc pl-4 space-y-1 mt-1">
                  <li><b>Kırmızı Oyuncu (Sol Çöp Adam):</b> <b>A</b> (Sola git), <b>D</b> (Sağa git), <b>W / Space</b> (Zıpla). Savaş vuruşu için <b>F</b> tuşuna bas veya fare ile ekrana tıklat. Silah seçmek için <b>1, 2, 3, 4</b> tuşlarını kullanabilirsin.</li>
                  <li><b>Mavi Oyuncu (Yerel modda Sağ Çöp Adam):</b> <b>Yön Tuşları Sola/Sağa/Yukarı</b> (Hareket ve Zıpla). Savaş vuruşu için <b>K</b> tuşuna basın. Silah seçimi için <b>7, 8, 9, 0</b> tuşlarını kullanabilirsiniz.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-200 mb-1">📱 Mobil Dokunmatik Kontroller</h4>
                <p>
                  Mobil veya tabletlerden girdiğinde ekranın altında joystick yön okları (Sola/Sağa gitmek), silah değiştirmek için çevrim butonu, zıplama tuşu ve büyük kırmızı vuruş butonu belirecektir.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-200 mb-1">⚔️ Dengeli Silah Özellikleri (Can ile Orantılı)</h4>
                <p className="mb-2">Her silahın kendine has hasar, ittirme ve bekleme süresi dengine sahiptir:</p>
                <ul className="list-decimal pl-4 space-y-1">
                  <li>🥊 <b>Yumruk (Menzil 45px):</b> Hasar: 12, Geri Tepme: 18. Orta menzilde ve hızlı saldırılar yapar.</li>
                  <li>⚔️ <b>Kılıç (Menzil 75px):</b> Hasar: 25, Geri Tepme: 12. Ağır ve geniş menzilli hasar vermek için eşsizdir.</li>
                  <li>🔫 <b>Piston Tabanca (Menzil 450px):</b> Hasar: 15, Geri Tepme: 8, Mermi: 6. Uzaktan mermi fırlatır, bitince otomatik dolup yenilenir.</li>
                  <li>🦯 <b>İttirme Çubuğu (Menzil 65px):</b> Hasar: 5, Geri Tepme: 40! Çok az hasar verir ama rakipleri platformdan aşağı uçurmakta kusursuzdur!</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-200 mb-1">💰 Altın ve Karakter Özelleştirmeleri</h4>
                <p>
                  Tarihi tapınak, kaynar lav krateri, gökdelen kuleleri, gizemli ormanlar, kaygan buz zirveleri ve düşük yerçekimli uzay üssünde savaşarak biten her maç için <b>50 Altın</b>, kazanırsan ek olarak <b>100 Altın</b> elde edersin. Kazandıklarınla <b>Görünüm Mağazasından</b> taç, miğfer vb. efsanevi şapkalar satın alabilirsin!
                </p>
              </div>

            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-5 py-2 font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition text-xs"
              >
                Anladım, Kapat
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
