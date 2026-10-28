(() => {
  const palette = ['#316b4d', '#e7a95e', '#82b4b3', '#df7b73', '#8aa774', '#8b82b7', '#d08b5b', '#5d93a8'];
  const state = { type: 'bar', lineColor: palette[0], labelMode: 'value', data: [{ label: 'Seg', value: 3 }, { label: 'Ter', value: 5 }, { label: 'Qua', value: 4 }, { label: 'Qui', value: 7 }, { label: 'Sex', value: 6 }, { label: 'Sáb', value: 9 }] };
  const rows = document.querySelector('#dataRows');
  const canvas = document.querySelector('#chartCanvas');
  const ctx = canvas.getContext('2d');
  const titleInput = document.querySelector('#chartTitle');
  const previewTitle = document.querySelector('#previewTitle');
  const legend = document.querySelector('#previewLegend');
  const transparent = document.querySelector('#transparentBg');
  const pixel = 8;

  function renderRows() {
    rows.innerHTML = '';
    state.data.forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'data-row';
      row.innerHTML = `<input class="row-input" aria-label="Categoria ${index + 1}" maxlength="18" value="${escapeAttr(item.label)}"><input class="row-input value-input" aria-label="Valor ${index + 1}" type="number" min="0" max="999999" step="any" value="${item.value}"><button class="remove-row" type="button" aria-label="Remover linha">×</button>`;
      const [label, value] = row.querySelectorAll('input');
      label.addEventListener('input', () => { item.label = label.value; draw(); });
      value.addEventListener('input', () => { item.value = value.value; draw(); });
      row.querySelector('button').addEventListener('click', () => { if (state.data.length > 1) { state.data.splice(index, 1); renderRows(); draw(); } });
      rows.append(row);
    });
  }
  function escapeAttr(text) { return String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
  function block(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x / pixel) * pixel, Math.round(y / pixel) * pixel, Math.max(pixel, Math.round(w / pixel) * pixel), Math.max(pixel, Math.round(h / pixel) * pixel)); }
  function text(value, x, y, color = '#899187', size = 14, align = 'center') { ctx.fillStyle = color; ctx.font = `500 ${size}px "DM Mono", monospace`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y); }
  function draw() {
    const w = canvas.width, h = canvas.height, values = state.data.map(d => Math.max(0, Number(d.value) || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    const formatValue = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
    const formatLabel = value => state.labelMode === 'percent' ? `${total ? Math.round(value / total * 100) : 0}%` : formatValue(value);
    ctx.clearRect(0, 0, w, h);
    if (!transparent.checked) { ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, w, h); }
    const left = 78, right = w - 34, top = state.labelMode === 'none' ? 30 : 54, bottom = h - 64, plotW = right - left, plotH = bottom - top;
    if (state.type === 'bar' || state.type === 'line') {
      const max = Math.max(1, ...values), ticks = 4;
      ctx.save(); ctx.setLineDash([4, 7]); ctx.lineWidth = 2;
      for (let i = 0; i <= ticks; i++) { const y = top + plotH * i / ticks; ctx.strokeStyle = '#e9ece4'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); text(String(Math.round(max * (ticks - i) / ticks)), left - 21, y, '#a0a79d', 12, 'right'); }
      ctx.restore();
      if (state.type === 'bar') {
        const step = plotW / state.data.length, bw = Math.min(72, step * .55);
        state.data.forEach((d, i) => { const x = left + step * i + (step - bw) / 2, bh = plotH * values[i] / max, y = bottom - bh; block(x + 7, y, bw, bh, palette[i % palette.length]); block(x, y + 5, 7, Math.max(0, bh - 5), palette[i % palette.length]); block(x + bw + 7, y + 5, 7, Math.max(0, bh - 5), palette[i % palette.length]); if (state.labelMode !== 'none') text(formatLabel(values[i]), x + bw / 2 + 7, Math.max(16, y - 15), '#435047', 14); text(d.label, x + bw / 2 + 7, bottom + 28, '#939a91', 12); });
      } else {
        const points = state.data.map((d, i) => ({ x: left + (state.data.length === 1 ? plotW / 2 : plotW * i / (state.data.length - 1)), y: bottom - plotH * values[i] / max }));
        ctx.strokeStyle = state.lineColor; ctx.lineWidth = 8; ctx.lineJoin = 'miter'; ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
        points.forEach((p, i) => { block(p.x - 8, p.y - 8, 16, 16, '#fffefa'); block(p.x - 5, p.y - 5, 10, 10, state.lineColor); if (state.labelMode !== 'none') text(formatLabel(values[i]), p.x, Math.max(16, p.y - 20), '#435047', 14); });
        points.forEach((p, i) => text(state.data[i].label, p.x, bottom + 28, '#939a91', 12));
      }
    } else {
      const sum = values.reduce((a, b) => a + b, 0) || 1, cx = w / 2, cy = h / 2 + 1, r = Math.min(plotH, plotW * .63) * .44;
      const cuts = []; let angle = -Math.PI / 2;
      state.data.forEach((d, i) => { const next = angle + Math.PI * 2 * values[i] / sum; cuts.push({ start: angle, end: next, color: palette[i % palette.length] }); angle = next; });
      // Paint each slice as square cells so the circular charts share the same pixel-art finish.
      for (let y = Math.floor((cy - r) / pixel) * pixel; y <= cy + r; y += pixel) {
        for (let x = Math.floor((cx - r) / pixel) * pixel; x <= cx + r; x += pixel) {
          const dx = x + pixel / 2 - cx, dy = y + pixel / 2 - cy, distance = Math.hypot(dx, dy);
          if (distance > r || (state.type === 'donut' && distance < r * .5)) continue;
          let pointAngle = Math.atan2(dy, dx); if (pointAngle < -Math.PI / 2) pointAngle += Math.PI * 2;
          const slice = cuts.find(part => pointAngle >= part.start && pointAngle < part.end);
          if (slice) block(x, y, pixel, pixel, slice.color);
        }
      }
      if (state.labelMode !== 'none') {
        cuts.forEach((slice, i) => {
          const portion = values[i] / sum, middle = (slice.start + slice.end) / 2;
          if (portion < .055) return;
          const labelRadius = state.type === 'donut' ? r * .75 : r * .66;
          text(formatLabel(values[i]), cx + Math.cos(middle) * labelRadius, cy + Math.sin(middle) * labelRadius, '#26322d', 13);
        });
      }
      if (state.type === 'donut' && state.labelMode !== 'none') { text(state.labelMode === 'percent' ? `${total ? '100' : '0'}%` : formatValue(total), cx, cy - 3, '#344239', 29); text('TOTAL', cx, cy + 24, '#9aa096', 10); }
    }
    previewTitle.textContent = titleInput.value.trim() || 'Seu gráfico pixel art';
    legend.innerHTML = state.data.map((d, i) => {
      const color = state.type === 'line' ? state.lineColor : palette[i % palette.length];
      const detail = state.labelMode === 'none' ? '' : ` · ${formatLabel(values[i])}`;
      return `<span class="legend-item"><i class="legend-swatch" style="background:${color}"></i>${escapeAttr(d.label || `Item ${i + 1}`)}${['pie', 'donut'].includes(state.type) ? detail : ''}</span>`;
    }).join('');
  }
  document.querySelector('#addRow').addEventListener('click', () => { if (state.data.length >= 12) return; state.data.push({ label: `Item ${state.data.length + 1}`, value: 1 }); renderRows(); draw(); });
  const lineColorControl = document.querySelector('#lineColorControl');
  document.querySelectorAll('.type-button').forEach(button => button.addEventListener('click', () => { document.querySelector('.type-button.selected')?.classList.remove('selected'); button.classList.add('selected'); state.type = button.dataset.type; lineColorControl.hidden = state.type !== 'line'; draw(); }));
  document.querySelectorAll('.color-swatch').forEach(button => button.addEventListener('click', () => { state.lineColor = button.dataset.color; document.querySelector('.color-swatch.selected')?.classList.remove('selected'); button.classList.add('selected'); document.querySelector('#lineColorPicker').value = state.lineColor; draw(); }));
  document.querySelector('#lineColorPicker').addEventListener('input', event => { state.lineColor = event.target.value; document.querySelector('.color-swatch.selected')?.classList.remove('selected'); draw(); });
  document.querySelectorAll('.label-mode').forEach(button => button.addEventListener('click', () => { document.querySelector('.label-mode.selected')?.classList.remove('selected'); button.classList.add('selected'); state.labelMode = button.dataset.mode; draw(); }));
  titleInput.addEventListener('input', draw); transparent.addEventListener('change', draw); document.querySelector('#refreshButton').addEventListener('click', draw);
  document.querySelector('#downloadButton').addEventListener('click', () => { const link = document.createElement('a'); link.download = `${(titleInput.value.trim() || 'grafico-pixel-art').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`; link.href = canvas.toDataURL('image/png'); link.click(); });
  renderRows(); draw();
})();
