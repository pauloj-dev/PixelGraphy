# PixelGraphy

Gerador de gráficos em pixel art (React + Vite). Barras, barras horizontais, linha, área, pizza e rosca, com exportação em PNG, SVG, JPG, WebP, CSV e projeto JSON.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes do motor de gráficos (vitest)
npm run build    # gera dist/
```

## Estrutura

- `src/chart/` — motor de renderização, sem React:
  - `scene.js` monta o gráfico como uma lista de retângulos alinhados a uma grade de pixels;
  - `font.js` é uma fonte bitmap 5×7 (com acentos), então o texto também vira pixels;
  - `render.js` desenha a cena no Canvas ou a serializa como SVG (`crispEdges`, sem fontes externas);
  - `exporters.js` cuida de downloads, cópia para a área de transferência e importação/exportação de CSV e JSON.
- `src/components/` — interface (Header, Hero, Studio, painéis de dados, estilo e exportação).
- `src/i18n/` — textos em PT-BR e EN.
- `legacy/` — versão anterior em HTML/JS puro, guardada como referência.

Tema claro/escuro, idioma e o projeto atual ficam salvos no `localStorage`.
