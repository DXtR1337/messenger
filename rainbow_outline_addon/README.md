# 🏳️‍🌈 Rainbow Outline Addon for Deadlock

Addon zmieniający kolory outline postaci na kolory tęczy (LGBT Pride).

## Kolory

| Element | Kolor | RGB |
|---------|-------|-----|
| Przyjaciele (Friend) | 🔴 Czerwony | 255, 0, 0 |
| Wrogowie (Enemy) | 🟠 Pomarańczowy | 255, 165, 0 |
| Bohaterowie wroga (Enemy Hero) | 🟡 Żółty | 255, 255, 0 |
| Drużyna 1 (Team 1) | 🟢 Zielony | 0, 255, 0 |
| Drużyna 2 (Team 2) | 🔵 Niebieski | 0, 0, 255 |
| Neutralny (Neutral) | 🟣 Fioletowy | 128, 0, 128 |

## Instalacja

### Krok 1: Skompiluj plik vdata

Ponieważ Deadlock wymaga skompilowanych plików `.vdata_c`, musisz skompilować `generic_data.vdata`:

**Opcja A** — użyj Deadlock Workshop Tools (jeśli masz):
1. Skopiuj folder `scripts/` do `deadlock/game/citadel_addons/outline/`
2. Skompiluj przez `resourcecompiler`

**Opcja B** — podmień plik w istniejącym VPK:
1. Pobierz [Source 2 Viewer (VRF)](https://valveresourceformat.github.io/)
2. Użyj go do otwarcia oryginalnego `pak05_dir.vpk`
3. Podmień zawartość `scripts/generic_data.vdata_c` na skompilowaną wersję

### Krok 2: Umieść VPK w folderze addons

1. Skopiuj gotowy plik `.vpk` do:
   ```
   Steam/steamapps/common/Deadlock/game/citadel/addons/
   ```
2. Upewnij się, że `gameinfo.gi` zawiera:
   ```
   Game    citadel/addons
   ```

## Struktura plików

```
rainbow_outline_addon/
└── scripts/
    └── generic_data.vdata    ← plik źródłowy z kolorami tęczy
```
