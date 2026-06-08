/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { HATS_DATA, HatCustomization } from "./types";
import { Coins, Check, Lock, ShoppingBag } from "lucide-react";
import { HatGraphic } from "./HatGraphic";

interface SkinShopProps {
  onClose: () => void;
  onEquipHat: (hatId: string) => void;
}

export default function SkinShop({ onClose, onEquipHat }: SkinShopProps) {
  const [coins, setCoins] = useState<number>(0);
  const [unlockedHats, setUnlockedHats] = useState<string[]>(["none"]);
  const [equippedHat, setEquippedHat] = useState<string>("none");
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    // Load local storage values
    const storedCoins = localStorage.getItem("copadam_coins");
    if (storedCoins === null) {
      localStorage.setItem("copadam_coins", "150"); // Give 150 coins for free
      setCoins(150);
    } else {
      setCoins(parseInt(storedCoins) || 0);
    }

    const storedUnlocked = localStorage.getItem("copadam_unlocked_hats");
    if (storedUnlocked === null) {
      localStorage.setItem("copadam_unlocked_hats", JSON.stringify(["none"]));
      setUnlockedHats(["none"]);
    } else {
      try {
        setUnlockedHats(JSON.parse(storedUnlocked));
      } catch {
        setUnlockedHats(["none"]);
      }
    }

    const storedEquipped = localStorage.getItem("copadam_equipped_hat");
    if (storedEquipped) {
      setEquippedHat(storedEquipped);
    }
  }, []);

  const handleBuyOrEquip = (hat: HatCustomization) => {
    const isUnlocked = unlockedHats.includes(hat.id);

    if (isUnlocked) {
      // Equip
      localStorage.setItem("copadam_equipped_hat", hat.id);
      setEquippedHat(hat.id);
      onEquipHat(hat.id);
      showFeedback(`"${hat.name}" başarıyla kuşanıldı!`);
    } else {
      // Buy
      if (coins >= hat.price) {
        const newCoins = coins - hat.price;
        const newUnlocked = [...unlockedHats, hat.id];

        localStorage.setItem("copadam_coins", newCoins.toString());
        localStorage.setItem("copadam_unlocked_hats", JSON.stringify(newUnlocked));
        localStorage.setItem("copadam_equipped_hat", hat.id);

        setCoins(newCoins);
        setUnlockedHats(newUnlocked);
        setEquippedHat(hat.id);
        onEquipHat(hat.id);

        showFeedback(`"${hat.name}" satın alındı ve kuşanıldı! -${hat.price} Altın`);
      } else {
        showFeedback("Yetersiz Altın! Savaşlar tamamlayarak altın kazanabilirsin.");
      }
    }
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3000);
  };

  return (
    <div id="shop_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden border border-amber-500/30 rounded-2xl bg-zinc-950 shadow-2xl shadow-amber-500/5">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-amber-500 animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              Çöp Adam Özelleştirme Mağazası
            </h2>
          </div>
          <button
            id="close_shop_btn"
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium transition rounded-lg text-zinc-400 bg-zinc-800 hover:text-white hover:bg-zinc-700"
          >
            Kapat
          </button>
        </div>

        {/* Coin Balance Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/30 border-b border-zinc-900">
          <span className="text-sm font-medium text-zinc-400">Görünümünü özelleştirmek için şapkalar satın al!</span>
          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-full border-amber-500/30 bg-amber-500/10">
            <Coins className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="font-mono text-base font-bold text-amber-400">{coins} Altın</span>
          </div>
        </div>

        {/* Feedback Alert banner */}
        {feedback && (
          <div className="mx-6 mt-4 p-3 text-center text-sm font-semibold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-fade-in">
            {feedback}
          </div>
        )}

        {/* Grid List */}
        <div className="p-6 max-h-[380px] overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {HATS_DATA.map((hat) => {
            const isUnlocked = unlockedHats.includes(hat.id);
            const isEquipped = equippedHat === hat.id;

            return (
              <div
                key={hat.id}
                id={`shop_item_${hat.id}`}
                onClick={() => handleBuyOrEquip(hat)}
                className={`group relative flex flex-col items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isEquipped
                    ? "border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-500/10"
                    : isUnlocked
                    ? "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700"
                    : "border-zinc-900 bg-zinc-950 hover:border-zinc-800 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Visual Accent for Equip status */}
                {isEquipped && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                    <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />
                  </span>
                )}

                {/* Hat Emoji View */}
                <div className="relative flex items-center justify-center w-16 h-16 my-2 bg-zinc-800/20 group-hover:bg-zinc-800/40 rounded-full transition-transform group-hover:scale-110">
                  <HatGraphic id={hat.id} size={44} />
                </div>

                {/* Info Text */}
                <span className="text-sm font-semibold text-center text-zinc-200">{hat.name}</span>

                {/* Price tag or equip status */}
                <div className="w-full mt-3">
                  {isEquipped ? (
                    <div className="w-full py-1 text-xs font-bold text-center text-amber-400 bg-amber-500/10 rounded-md">
                      Kuşanıldı
                    </div>
                  ) : isUnlocked ? (
                    <div className="w-full py-1 text-xs font-semibold text-center text-zinc-300 bg-zinc-800 rounded-md group-hover:bg-zinc-700 transition">
                      Kuşan
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 w-full py-1 text-xs font-mono font-bold rounded-md bg-zinc-900 group-hover:bg-amber-500 group-hover:text-zinc-950 text-amber-500 transition-all">
                      <Lock className="w-3 h-3 group-hover:hidden" />
                      <span>{hat.price} G</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 text-center border-t border-zinc-900 text-xs text-zinc-500">
          Savaş bitirerek her el için <b>50 Altın</b>, kazanırsan ek olarak <b>100 Altın</b> kazanırsın.
        </div>

      </div>
    </div>
  );
}
