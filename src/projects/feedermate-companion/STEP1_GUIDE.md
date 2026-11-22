# 🎣 FeederMate – 1. Lépés: Hardver Alapok

## 🎯 Célkitűzés
Ez a tesztprogram közvetlenül ellenőrzi az ESP32 és az integrált kijelzős egység működését:
1. **Kijelző (ST7789 320x240):** Színes felület, valós idejű számláló, célidő kártya.
2. **Integrált Rotary:** Forgatással +/- 5 másodperccel állítható a célidő (5 .. 600 mp).
3. **Rotary Belső Gomb (SW):** Megnyomásra azonnal nullázza (Reset) a stoppert.
4. **1 db Dedikált Gomb (GPIO 14):** Start / Pause váltókapcsoló a bedobáshoz.
5. **LED (GPIO 13):** Visszajelzés gombnyomáskor és villogás célidő túllépésekor.
