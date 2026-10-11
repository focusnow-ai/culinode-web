# Culinode Web

Next.js 16 web uygulaması (Vercel). Tamamen online; public tarif/şef sayfaları sunucuda üretilir,
özel defter Firebase girişiyle çalışır. API ve altyapı: [`focusnow-ai/culinode`](https://github.com/focusnow-ai/culinode).

## Kurulum

```sh
npm ci
cp .env.example .env.local      # yerel API (:7071) + Auth Emulator
# veya: cp .env.dev-azure.example .env.local  → dev Azure API + gerçek culinode-dev Firebase
npm run dev
```

Yerel API ve emulator'ların başlatılması: `culinode` reposu → `docs/LOCAL_DEVELOPMENT.md`.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run lint` / `typecheck` / `test` / `build` | CI'daki kontroller |
| `npm run e2e` | Playwright (çalışan API + Auth Emulator + web gerekir) |
| `npm run contract:sync` | `../culinode/contracts/openapi.yaml` → `contracts/` (kardeş checkout) |
| `npm run gen:api` | `contracts/openapi.yaml` → `src/lib/api/schema.d.ts` |

API sözleşmesinin asıl kaynağı `culinode` reposudur; buradaki kopya sabitlenmiş sürümdür.
Sözleşme değişince: `contract:sync` → `gen:api` → typecheck → commit.

## Ortam değişkenleri

`.env.example` dosyasına bakın. Vercel: Production → prod API + `culinode-prod` Firebase;
Preview → yalnız dev API + `culinode-dev` Firebase. `NEXT_PUBLIC_AUTH_EMULATOR_URL` production'da boş olmalı.
