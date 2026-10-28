(() => {
  const palette = ['#316b4d', '#e7a95e', '#82b4b3', '#df7b73', '#8aa774', '#8b82b7', '#d08b5b', '#5d93a8'];
  const state = { type: 'bar', lineColor: palette[0], labelMode: 'value', data: [{ label: 'Seg', value: 3, color: palette[0] }, { label: 'Ter', value: 5, color: palette[1] }, { label: 'Qua', value: 4, color: palette[2] }, { label: 'Qui', value: 7, color: palette[3] }, { label: 'Sex', value: 6, color: palette[4] }, { label: 'Sáb', value: 9, color: palette[5] }] };
  const rows = document.querySelector('#dataRows');
  const canvas = document.querySelector('#chartCanvas');
  const ctx = canvas.getContext('2d');
  const titleInput = document.querySelector('#chartTitle');
  const previewTitle = document.querySelector('#previewTitle');
  const legend = document.querySelector('#previewLegend');
  const transparent = document.querySelector('#transparentBg');
  const axisMaxInput = document.querySelector('#axisMax');
  const axisScaleControl = document.querySelector('#axisScaleControl');
  const pixel = 8;

  function renderRows() {
    rows.innerHTML = '';
    state.data.forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'data-row';
      row.innerHTML = `<input class="row-input" aria-label="Categoria ${index + 1}" maxlength="18" value="${escapeAttr(item.label)}"><input class="row-input value-input" aria-label="Valor ${index + 1}" type="number" min="0" max="999999" step="any" value="${item.value}"><input class="row-color" type="color" aria-label="Cor de ${escapeAttr(item.label || `item ${index + 1}`)}" value="${item.color || palette[index % palette.length]}" ${state.type === 'line' ? 'disabled title="As cores por categoria funcionam em barras, pizza e rosca"' : ''}><button class="remove-row" type="button" aria-label="Remover linha">×</button>`;
      const [label, value, color] = row.querySelectorAll('input');
      label.addEventListener('input', () => { item.label = label.value; draw(); });
      value.addEventListener('input', () => { item.value = value.value; draw(); });
      color.addEventListener('input', () => { item.color = color.value; draw(); });
      row.querySelector('button').addEventListener('click', () => { if (state.data.length > 1) { state.data.splice(index, 1); renderRows(); draw(); } });
      rows.append(row);
    });
  }
  function escapeAttr(text) { return String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
  function block(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x / pixel) * pixel, Math.round(y / pixel) * pixel, Math.max(pixel, Math.round(w / pixel) * pixel), Math.max(pixel, Math.round(h / pixel) * pixel)); }
  function tint(hex, amount) {
    const value = Number.parseInt(hex.slice(1), 16), target = amount < 0 ? 0 : 255, weight = Math.abs(amount);
    const channel = shift => Math.round(((value >> shift) & 255) * (1 - weight) + target * weight).toString(16).padStart(2, '0');
    return `#${channel(16)}${channel(8)}${channel(0)}`;
  }
  function text(value, x, y, color = '#899187', size = 14, align = 'center') { ctx.fillStyle = color; ctx.font = `500 ${size}px "DM Mono", monospace`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y); }
  function drawExportLegend() {
    ctx.font = '12px "DM Sans", sans-serif';
    const entries = state.data.map((d, i) => {
      const label = d.label || `Item ${i + 1}`;
      const detail = state.labelMode === 'none' ? '' : ` · ${formatLegendValue(Number(d.value) || 0)}`;
      const suffix = ['pie', 'donut'].includes(state.type) ? detail : '';
      return { label: `${label}${suffix}`, color: state.type === 'line' ? state.lineColor : (d.color || palette[i % palette.length]) };
    });
    const lines = [[]]; let lineWidth = 0;
    entries.forEach(entry => {
      const width = 8 + 7 + ctx.measureText(entry.label).width + 22;
      if (lineWidth && lineWidth + width > canvas.width - 52) { lines.push([]); lineWidth = 0; }
      lines[lines.length - 1].push({ ...entry, width }); lineWidth += width;
    });
    const lineGap = 22, firstY = canvas.height - 18 - (lines.length - 1) * lineGap;
    lines.forEach((line, row) => {
      const totalWidth = line.reduce((sum, entry) => sum + entry.width, 0) - 22;
      let x = (canvas.width - totalWidth) / 2; const y = firstY + row * lineGap;
      line.forEach(entry => {
        block(x, y - 4, 8, 8, entry.color);
        ctx.fillStyle = '#758075'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(entry.label, x + 15, y);
        x += entry.width;
      });
    });
  }
  function formatLegendValue(value) {
    const total = state.data.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
    return state.labelMode === 'percent' ? `${total ? Math.round(value / total * 100) : 0}%` : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  }
  function draw(includeExportLegend = false) {
    const w = canvas.width, h = canvas.height, values = state.data.map(d => Math.max(0, Number(d.value) || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    const formatValue = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
    const formatLabel = value => state.labelMode === 'percent' ? `${total ? Math.round(value / total * 100) : 0}%` : formatValue(value);
    ctx.clearRect(0, 0, w, h);
    if (!transparent.checked) { ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, w, h); }
    const left = 78, right = w - 34, top = state.labelMode === 'none' ? 30 : 54, bottom = h - (includeExportLegend ? 100 : 64), plotW = right - left, plotH = bottom - top;
    if (state.type === 'bar' || state.type === 'line') {
      const largestValue = Math.max(0, ...values), requestedMax = Number(axisMaxInput.value);
      const max = axisMaxInput.value && Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : Math.max(4, Math.ceil(largestValue / 4) * 4);
      const ticks = 4;
      ctx.save(); ctx.setLineDash([4, 7]); ctx.lineWidth = 2;
      for (let i = 0; i <= ticks; i++) { const y = top + plotH * i / ticks; ctx.strokeStyle = '#e9ece4'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); text(formatValue(max * (ticks - i) / ticks), left - 21, y, '#a0a79d', 12, 'right'); }
      ctx.restore();
      if (state.type === 'bar') {
        const step = plotW / state.data.length, barCols = Math.max(4, Math.min(7, Math.floor(step * .5 / pixel))), barWidth = barCols * pixel;
        const baseY = Math.floor(bottom / pixel) * pixel;
        state.data.forEach((d, i) => {
            const color = d.color || palette[i % palette.length], x = Math.round((left + step * i + (step - barWidth) / 2) / pixel) * pixel;
          const height = values[i] <= 0 ? 0 : Math.max(pixel * 2, Math.round(plotH * Math.min(values[i], max) / max / pixel) * pixel), y = baseY - height;
          const bodyHeight = baseY - y;
          // Flat columns with stepped shoulders and a small highlight keep the chart clear and pixel-like.
          if (height > 0) {
            if (barWidth > pixel * 2) block(x + pixel, y, barWidth - pixel * 2, pixel, color);
            block(x, y + pixel, barWidth, bodyHeight - pixel, color);
            block(x, baseY - pixel, barWidth, pixel, tint(color, -.14));
            if (bodyHeight > pixel * 2) block(x + pixel, y + pixel, pixel, pixel, tint(color, .28));
          }
          if (state.labelMode !== 'none') text(formatLabel(values[i]), x + barWidth / 2, Math.max(16, y - 15), '#435047', 14);
          text(d.label, x + barWidth / 2, bottom + 28, '#939a91', 12);
        });
      } else {
        const points = state.data.map((d, i) => ({ x: left + (state.data.length === 1 ? plotW / 2 : plotW * i / (state.data.length - 1)), y: bottom - plotH * Math.min(values[i], max) / max }));
        ctx.strokeStyle = state.lineColor; ctx.lineWidth = 8; ctx.lineJoin = 'miter'; ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
        points.forEach((p, i) => { block(p.x - 8, p.y - 8, 16, 16, '#fffefa'); block(p.x - 5, p.y - 5, 10, 10, state.lineColor); if (state.labelMode !== 'none') text(formatLabel(values[i]), p.x, Math.max(16, p.y - 20), '#435047', 14); });
        points.forEach((p, i) => text(state.data[i].label, p.x, bottom + 28, '#939a91', 12));
      }
    } else {
      const sum = values.reduce((a, b) => a + b, 0) || 1, cx = w / 2, cy = h / 2 + 1, r = Math.min(plotH, plotW * .63) * .44;
      const cuts = []; let angle = -Math.PI / 2;
      const active = values.map((value, index) => value > 0 ? index : -1).filter(index => index >= 0);
      const visualPortions = Array(values.length).fill(0);
      const minSlice = active.length ? Math.min(.055, .48 / active.length) : 0;
      let remaining = [...active], remainingValue = active.reduce((acc, index) => acc + values[index], 0), remainingPortion = 1;
      // Give tiny nonzero categories enough visible pixels to read as a slice, while keeping labels exact.
      while (remaining.length) {
        const tiny = remaining.filter(index => values[index] / remainingValue * remainingPortion < minSlice);
        if (!tiny.length) {
          remaining.forEach(index => { visualPortions[index] = values[index] / remainingValue * remainingPortion; });
          break;
        }
        tiny.forEach(index => { visualPortions[index] = minSlice; remainingPortion -= minSlice; remainingValue -= values[index]; });
        remaining = remaining.filter(index => !tiny.includes(index));
      }
      state.data.forEach((d, i) => { const next = angle + Math.PI * 2 * visualPortions[i]; cuts.push({ start: angle, end: next, color: d.color || palette[i % palette.length] }); angle = next; });
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
      const color = state.type === 'line' ? state.lineColor : (d.color || palette[i % palette.length]);
      const detail = state.labelMode === 'none' ? '' : ` · ${formatLabel(values[i])}`;
      return `<span class="legend-item"><i class="legend-swatch" style="background:${color}"></i>${escapeAttr(d.label || `Item ${i + 1}`)}${['pie', 'donut'].includes(state.type) ? detail : ''}</span>`;
    }).join('');
    if (includeExportLegend) drawExportLegend();
  }
  document.querySelector('#addRow').addEventListener('click', () => { if (state.data.length >= 12) return; state.data.push({ label: `Item ${state.data.length + 1}`, value: 1, color: palette[state.data.length % palette.length] }); renderRows(); draw(); });
  const lineColorControl = document.querySelector('#lineColorControl');
  document.querySelectorAll('.type-button').forEach(button => button.addEventListener('click', () => { document.querySelector('.type-button.selected')?.classList.remove('selected'); button.classList.add('selected'); state.type = button.dataset.type; lineColorControl.hidden = state.type !== 'line'; axisScaleControl.hidden = !['bar', 'line'].includes(state.type); renderRows(); draw(); }));
  axisMaxInput.addEventListener('input', draw);
  document.querySelectorAll('.color-swatch').forEach(button => button.addEventListener('click', () => { state.lineColor = button.dataset.color; document.querySelector('.color-swatch.selected')?.classList.remove('selected'); button.classList.add('selected'); document.querySelector('#lineColorPicker').value = state.lineColor; draw(); }));
  document.querySelector('#lineColorPicker').addEventListener('input', event => { state.lineColor = event.target.value; document.querySelector('.color-swatch.selected')?.classList.remove('selected'); draw(); });
  document.querySelectorAll('.label-mode').forEach(button => button.addEventListener('click', () => { document.querySelector('.label-mode.selected')?.classList.remove('selected'); button.classList.add('selected'); state.labelMode = button.dataset.mode; draw(); }));
  titleInput.addEventListener('input', draw); transparent.addEventListener('change', draw); document.querySelector('#refreshButton').addEventListener('click', draw);
  document.querySelector('#downloadButton').addEventListener('click', () => { const link = document.createElement('a'); link.download = `${(titleInput.value.trim() || 'grafico-pixel-art').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`; draw(!transparent.checked); link.href = canvas.toDataURL('image/png'); link.click(); draw(); });
  renderRows(); draw();
})();
