# ESP32 Desktop Hardware Simulator Makefile

.PHONY: help dev dev-web build package package-mac package-win package-linux test clean

help:
	@echo "ESP32 Simulator Parancsok:"
	@echo "  make dev          - Asztali Electron alkalmazás indítása fejlesztői módban"
	@echo "  make dev-web      - Webes felület indítása böngészőben (http://localhost:5173)"
	@echo "  make build        - Teljes TypeScript + Vite + Electron fordítás"
	@echo "  make package      - Telepítő készítése az aktuális operációs rendszerre"
	@echo "  make package-mac  - macOS (.dmg / .app) telepítő csomagolása"
	@echo "  make package-win  - Windows (.exe) telepítő csomagolása"
	@echo "  make package-linux- Linux (.AppImage / .deb) telepítő csomagolása"
	@echo "  make test         - Típusellenőrzés és tesztek futtatása"
	@echo "  make clean        - Fordítási fájlok (dist, dist-electron, release) törlése"

dev:
	@./scripts/dev.sh electron

dev-web:
	@./scripts/dev.sh web

build:
	@./scripts/build.sh

package:
	@./scripts/package.sh

package-mac:
	@./scripts/package.sh mac

package-win:
	@./scripts/package.sh win

package-linux:
	@./scripts/package.sh linux

test:
	@./scripts/test.sh

clean:
	@rm -rf dist dist-electron release
	@echo "🧹 Tisztítás kész!"
