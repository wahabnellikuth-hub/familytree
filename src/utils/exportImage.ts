import { FamilyTreeData, TreeLayoutResult } from '../types';
import { calculateTreeLayout, computeNodeDimensions } from './layoutEngine';

export type ExportFormat = 'png' | 'svg' | 'jpeg' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  scale: number; // 2 = High-Res, 4 = Ultra HD (recommended), 6 = Extreme Zoom, 8 = Maximum Print
  quality?: number; // 0.1 to 1.0 for jpeg (default 0.98)
  backgroundColor?: string;
  excludePlaceholders?: boolean;
  focusPersonId?: string | null;
  includeTitle?: boolean;
}

export interface SafeExportDimensions {
  effectiveScale: number;
  pixelWidth: number;
  pixelHeight: number;
  megapixels: number;
  wasClamped: boolean;
}

export interface ExportResult {
  success: boolean;
  width?: number;
  height?: number;
  effectiveScale?: number;
  fileSizeBytes?: number;
  wasClamped?: boolean;
  error?: string;
}

/**
 * Safely quotes multi-word font names and appends crisp Malayalam + system fallbacks.
 */
export function buildFontStack(fontFamily?: string): string {
  const fallbacks =
    '"Noto Sans Malayalam", "Manjari", "Gayathri", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  if (!fontFamily || !fontFamily.trim()) {
    return fallbacks;
  }
  const trimmed = fontFamily.trim();
  if (trimmed.includes(',')) {
    return trimmed;
  }
  const clean = trimmed.replace(/^["']|["']$/g, '');
  if (clean === 'Noto Sans Malayalam') {
    return fallbacks;
  }
  return `"${clean}", ${fallbacks}`;
}

/**
 * Calculates the highest safe pixel resolution the current browser canvas can allocate
 * without silently dropping scale down via integer flooring.
 */
export function getSafeExportDimensions(
  totalWidth: number,
  totalHeight: number,
  requestedScale: number
): SafeExportDimensions {
  const isMobile =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Desktop Chrome/Edge/Firefox support up to 32767px per side & ~268M px total area.
  // Wide family trees have small height, so 30,000px width easily fits inside 220M px!
  const maxDim = isMobile ? 16000 : 30000;
  const maxArea = isMobile ? 55_000_000 : 220_000_000;

  const safeW = Math.max(1, totalWidth);
  const safeH = Math.max(1, totalHeight);

  const maxScaleByDim = maxDim / Math.max(safeW, safeH);
  const maxScaleByArea = Math.sqrt(maxArea / (safeW * safeH));
  const maxAllowedScale = Math.min(maxScaleByDim, maxScaleByArea);

  const rawEffective = Math.min(requestedScale, maxAllowedScale);
  // Floor to 2 decimal places so rounding never pushes dimensions above maxDim
  const effectiveScale = Math.max(
    Math.min(1, maxAllowedScale),
    Math.floor(rawEffective * 100) / 100
  );

  const pixelWidth = Math.max(1, Math.round(safeW * effectiveScale));
  const pixelHeight = Math.max(1, Math.round(safeH * effectiveScale));
  const megapixels = Number(((pixelWidth * pixelHeight) / 1_000_000).toFixed(1));
  const wasClamped = effectiveScale < requestedScale - 0.05;

  return {
    effectiveScale,
    pixelWidth,
    pixelHeight,
    megapixels,
    wasClamped,
  };
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a pure mathematical vector SVG document of the family tree.
 * Provides infinite zoom quality with zero pixelation at any zoom level.
 */
export function buildSvgMarkup(
  tree: FamilyTreeData,
  layout: TreeLayoutResult,
  options: Pick<ExportOptions, 'backgroundColor' | 'focusPersonId' | 'includeTitle'>
): { svg: string; width: number; height: number } {
  const bgColor = options.backgroundColor || '#ffffff';
  const titlePadding = options.includeTitle !== false ? 60 : 0;
  const totalWidth = Math.round(layout.bounds.width);
  const totalHeight = Math.round(layout.bounds.height + titlePadding);
  const fontStack = buildFontStack(tree.fontFamily);
  const rootName =
    tree.people[options.focusPersonId || tree.rootPersonId]?.name || 'Lineage';

  const parts: string[] = [];
  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">`,
    `<defs>`,
    `  <style>`,
    `    @import url('https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700&amp;family=Gayathri:wght@400;700&amp;family=Manjari:wght@400;700&amp;family=Noto+Sans+Malayalam:wght@400;500;600;700&amp;display=swap');`,
    `    text { font-family: ${fontStack}; }`,
    `  </style>`,
    `</defs>`,
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${escapeXml(bgColor)}" />`
  );

  // Title header
  if (options.includeTitle !== false) {
    parts.push(
      `<text x="60" y="36" fill="#0f172a" font-size="20" font-weight="700" dominant-baseline="central">${escapeXml(
        `${tree.title} — Lineage of ${rootName}`
      )}</text>`,
      `<text x="60" y="58" fill="#64748b" font-size="12" font-weight="400" dominant-baseline="central">${escapeXml(
        `Paternal Lineage Chart • ${layout.nodes.length} members • Generated on ${new Date().toLocaleDateString()}`
      )}</text>`
    );
  }

  parts.push(`<g transform="translate(0, ${titlePadding})">`);

  // 1. Orthogonal Connection Lines
  for (const line of layout.lines) {
    if (line.points.length < 2) continue;
    const strokeColor = line.isDashed ? '#d97706' : '#64748b';
    const dashAttr = line.isDashed ? ' stroke-dasharray="5 4"' : '';
    const d = line.points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
    parts.push(
      `  <path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"${dashAttr} />`
    );

    if (line.hasArrow) {
      const from = line.points[line.points.length - 2];
      const to = line.points[line.points.length - 1];
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const arrowLen = 7;
      const p1x = to.x - arrowLen * Math.cos(angle - Math.PI / 6);
      const p1y = to.y - arrowLen * Math.sin(angle - Math.PI / 6);
      const p2x = to.x - arrowLen * Math.cos(angle + Math.PI / 6);
      const p2y = to.y - arrowLen * Math.sin(angle + Math.PI / 6);
      parts.push(
        `  <polygon points="${to.x.toFixed(2)},${to.y.toFixed(2)} ${p1x.toFixed(2)},${p1y.toFixed(2)} ${p2x.toFixed(2)},${p2y.toFixed(2)}" fill="${strokeColor}" />`
      );
    }
  }

  // 2. Person Boxes
  for (const node of layout.nodes) {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;
    const cx = x + w / 2;

    if (node.isPlaceholder) {
      parts.push(
        `  <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="5" ry="5" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.25" stroke-dasharray="4 4" />`,
        `  <text x="${cx.toFixed(2)}" y="${(y + h / 2).toFixed(2)}" fill="#64748b" font-size="12" font-style="italic" text-anchor="middle" dominant-baseline="central">${escapeXml(
          node.name || 'Empty Box'
        )}</text>`
      );
    } else if (node.isExtraNote) {
      parts.push(
        `  <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="5" ry="5" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.75" stroke-dasharray="5 4" />`
      );

      // - - Note - - badge pill matching PersonBox
      const badgeW = 48;
      const badgeH = 12;
      const badgeX = x + w - badgeW - 4;
      const badgeY = y - 6;
      parts.push(
        `  <rect x="${badgeX.toFixed(2)}" y="${badgeY.toFixed(2)}" width="${badgeW}" height="${badgeH}" rx="3" ry="3" fill="#fef3c7" stroke="#fcd34d" stroke-width="0.75" />`,
        `  <text x="${(badgeX + badgeW / 2).toFixed(2)}" y="${(badgeY + badgeH / 2).toFixed(2)}" fill="#92400e" font-size="7.5" font-weight="700" text-anchor="middle" dominant-baseline="central">- - Note - -</text>`
      );

      const dims = computeNodeDimensions(node.name, false, node.extraNote);
      const nameLines = dims.lines;
      const lineSpacing = 16;
      const nameBlockH = nameLines.length * lineSpacing;
      const startY = node.extraNote
        ? y + 14
        : y + h / 2 - ((nameLines.length - 1) * lineSpacing) / 2;

      for (let li = 0; li < nameLines.length; li++) {
        parts.push(
          `  <text x="${cx.toFixed(2)}" y="${(startY + li * lineSpacing).toFixed(2)}" fill="#78350f" font-size="12" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(
            nameLines[li]
          )}</text>`
        );
      }

      if (node.extraNote && dims.noteLines) {
        const dividerY = startY + nameBlockH - 2;
        parts.push(
          `  <line x1="${(x + 10).toFixed(2)}" y1="${dividerY.toFixed(2)}" x2="${(x + w - 10).toFixed(2)}" y2="${dividerY.toFixed(2)}" stroke="#d97706" stroke-width="1" stroke-dasharray="3 3" />`
        );
        for (let ni = 0; ni < dims.noteLines.length; ni++) {
          parts.push(
            `  <text x="${cx.toFixed(2)}" y="${(dividerY + 12 + ni * 13).toFixed(2)}" fill="#92400e" font-size="10" font-style="italic" text-anchor="middle" dominant-baseline="central">${escapeXml(
              dims.noteLines[ni]
            )}</text>`
          );
        }
      }
    } else {
      const isRoot = node.id === tree.rootPersonId;
      const stroke = isRoot ? '#0284c7' : '#94a3b8';
      const strokeWidth = isRoot ? 2 : 1.25;
      const fontWeight = isRoot ? 700 : 500;

      parts.push(
        `  <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="5" ry="5" fill="#ffffff" stroke="${stroke}" stroke-width="${strokeWidth}" />`
      );

      const dims = computeNodeDimensions(node.name, false, node.extraNote);
      const textLines = dims.lines;
      const lineSpacing = 16;
      const nameBlockH = textLines.length * lineSpacing;
      const startY = node.extraNote
        ? y + 14
        : y + h / 2 - ((textLines.length - 1) * lineSpacing) / 2;

      for (let li = 0; li < textLines.length; li++) {
        parts.push(
          `  <text x="${cx.toFixed(2)}" y="${(startY + li * lineSpacing).toFixed(2)}" fill="#0f172a" font-size="12" font-weight="${fontWeight}" text-anchor="middle" dominant-baseline="central">${escapeXml(
            textLines[li]
          )}</text>`
        );
      }

      if (node.extraNote && dims.noteLines) {
        const dividerY = startY + nameBlockH - 2;
        parts.push(
          `  <line x1="${(x + 8).toFixed(2)}" y1="${dividerY.toFixed(2)}" x2="${(x + w - 8).toFixed(2)}" y2="${dividerY.toFixed(2)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3" />`
        );
        for (let ni = 0; ni < dims.noteLines.length; ni++) {
          parts.push(
            `  <text x="${cx.toFixed(2)}" y="${(dividerY + 12 + ni * 13).toFixed(2)}" fill="#475569" font-size="10" font-style="italic" text-anchor="middle" dominant-baseline="central">${escapeXml(
              dims.noteLines[ni]
            )}</text>`
          );
        }
      }
    }
  }

  parts.push(`</g>`, `</svg>`);

  return {
    svg: parts.join('\n'),
    width: totalWidth,
    height: totalHeight,
  };
}

/**
 * Renders the full layout onto a 2D canvas context at the given high-DPI scale.
 */
function renderTreeToCanvas(
  ctx: CanvasRenderingContext2D,
  tree: FamilyTreeData,
  layout: TreeLayoutResult,
  scale: number,
  options: ExportOptions
): void {
  const bgColor = options.backgroundColor || '#ffffff';
  const titlePadding = options.includeTitle !== false ? 60 : 0;
  const totalWidth = layout.bounds.width;
  const totalHeight = layout.bounds.height + titlePadding;
  const fontFamilyName = buildFontStack(tree.fontFamily);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // High-DPI scale transform
  ctx.scale(scale, scale);

  // Fill solid background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Optional Title header
  if (options.includeTitle !== false) {
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 20px ${fontFamilyName}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const rootName =
      tree.people[options.focusPersonId || tree.rootPersonId]?.name || 'Lineage';
    ctx.fillText(`${tree.title} — Lineage of ${rootName}`, 60, 36);

    ctx.fillStyle = '#64748b';
    ctx.font = `400 12px ${fontFamilyName}`;
    ctx.fillText(
      `Paternal Lineage Chart • ${layout.nodes.length} members • Generated on ${new Date().toLocaleDateString()}`,
      60,
      58
    );
  }

  ctx.save();
  ctx.translate(0, titlePadding);

  // 1. Draw Orthogonal Connection Lines
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.75;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const line of layout.lines) {
    if (line.points.length < 2) continue;
    ctx.save();
    if (line.isDashed) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#d97706';
    }
    ctx.beginPath();
    ctx.moveTo(line.points[0].x, line.points[0].y);
    for (let i = 1; i < line.points.length; i++) {
      ctx.lineTo(line.points[i].x, line.points[i].y);
    }
    ctx.stroke();

    if (line.hasArrow) {
      const pPenultimate = line.points[line.points.length - 2];
      const pLast = line.points[line.points.length - 1];
      drawArrowhead(
        ctx,
        pPenultimate,
        pLast,
        line.isDashed ? '#d97706' : '#64748b'
      );
    }
    ctx.restore();
  }

  // 2. Draw Rectangular Person Boxes
  for (const node of layout.nodes) {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;
    const radius = 5;

    if (node.isPlaceholder) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.25;

      drawRoundedRect(ctx, x, y, w, h, radius);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#64748b';
      ctx.font = `italic 12px ${fontFamilyName}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name || 'Empty Box', x + w / 2, y + h / 2);
    } else if (node.isExtraNote) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.fillStyle = '#fffbeb';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.75;

      drawRoundedRect(ctx, x, y, w, h, radius);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // - - Note - - badge pill matching UI
      const badgeW = 48;
      const badgeH = 12;
      const badgeX = x + w - badgeW - 4;
      const badgeY = y - 6;
      ctx.save();
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 0.75;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#92400e';
      ctx.font = `700 7.5px ${fontFamilyName}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('- - Note - -', badgeX + badgeW / 2, badgeY + badgeH / 2);
      ctx.restore();

      ctx.fillStyle = '#78350f';
      ctx.font = `600 12px ${fontFamilyName}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const dims = computeNodeDimensions(node.name, false, node.extraNote);
      const nameLines = dims.lines;
      const lineSpacing = 16;
      const nameBlockH = nameLines.length * lineSpacing;
      const startY = node.extraNote
        ? y + 14
        : y + h / 2 - ((nameLines.length - 1) * lineSpacing) / 2;

      for (let li = 0; li < nameLines.length; li++) {
        ctx.fillText(nameLines[li], x + w / 2, startY + li * lineSpacing);
      }

      if (node.extraNote && dims.noteLines) {
        const dividerY = startY + nameBlockH - 2;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 10, dividerY);
        ctx.lineTo(x + w - 10, dividerY);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#92400e';
        ctx.font = `italic 10px ${fontFamilyName}`;
        for (let ni = 0; ni < dims.noteLines.length; ni++) {
          ctx.fillText(dims.noteLines[ni], x + w / 2, dividerY + 12 + ni * 13);
        }
      }
    } else {
      const isRoot = node.id === tree.rootPersonId;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = isRoot ? '#0284c7' : '#94a3b8';
      ctx.lineWidth = isRoot ? 2 : 1.25;

      drawRoundedRect(ctx, x, y, w, h, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = isRoot
        ? `700 12px ${fontFamilyName}`
        : `500 12px ${fontFamilyName}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const dims = computeNodeDimensions(node.name, false, node.extraNote);
      const textLines = dims.lines;
      const lineSpacing = 16;
      const nameBlockH = textLines.length * lineSpacing;
      const startY = node.extraNote
        ? y + 14
        : y + h / 2 - ((textLines.length - 1) * lineSpacing) / 2;

      for (let li = 0; li < textLines.length; li++) {
        ctx.fillText(textLines[li], x + w / 2, startY + li * lineSpacing);
      }

      if (node.extraNote && dims.noteLines) {
        const dividerY = startY + nameBlockH - 2;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8, dividerY);
        ctx.lineTo(x + w - 8, dividerY);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#475569';
        ctx.font = `italic 10px ${fontFamilyName}`;
        for (let ni = 0; ni < dims.noteLines.length; ni++) {
          ctx.fillText(dims.noteLines[ni], x + w / 2, dividerY + 12 + ni * 13);
        }
      }
    }
  }

  ctx.restore();
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } catch {
      resolve(null);
    }
  });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Keep URL alive long enough for large files to finish saving
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Opens browser print dialog with an embedded pure vector SVG for saving as an infinite-zoom PDF.
 */
function exportVectorPdfPrint(
  svgMarkup: string,
  width: number,
  height: number,
  title: string
): Promise<ExportResult> {
  return new Promise((resolve) => {
    const orientation = width >= height ? 'landscape' : 'portrait';
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      resolve({ success: false, error: 'Unable to open vector PDF print preview.' });
      return;
    }

    doc.open();
    doc.write(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(title || 'Family Tree')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700&family=Gayathri:wght@400;700&family=Manjari:wght@400;700&family=Noto+Sans+Malayalam:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: ${orientation}; margin: 6mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #ffffff; display: flex; align-items: center; justify-content: center; }
    svg { width: 100%; height: auto; max-width: 100%; max-height: 100vh; display: block; }
  </style>
</head>
<body>
  ${svgMarkup}
</body>
</html>`);
    doc.close();

    const triggerPrint = async () => {
      try {
        if (doc.fonts) {
          await doc.fonts.ready;
        }
      } catch {
        // Ignore font wait failure
      }
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve({ success: true, width, height });
        } catch (err: any) {
          resolve({
            success: false,
            error: err?.message || 'Failed to launch PDF print dialog.',
          });
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 2000);
        }
      }, 250);
    };

    triggerPrint();
  });
}

/**
 * Exports the entire family tree (or selected branch) in ultra-high resolution
 * PNG / JPG or infinite-zoom vector SVG / PDF.
 */
export async function exportTreeImage(
  tree: FamilyTreeData,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const format = options.format || 'png';
    const requestedScale = options.scale || 4;
    const quality = options.quality ?? 0.98;

    // Wait for fonts (especially Malayalam web fonts) to be fully loaded
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    // Calculate complete layout coordinates (not just visible screen)
    const layout = calculateTreeLayout(tree, {
      layoutMode: tree.layoutMode,
      focusPersonId: options.focusPersonId,
      excludePlaceholders: options.excludePlaceholders,
    });

    if (layout.nodes.length === 0) {
      return {
        success: false,
        error: 'No family members to export in the selected branch.',
      };
    }

    const cleanTitle = (tree.title || 'family-tree')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');

    // Pure Vector SVG (Infinite zoom, zero pixelation)
    if (format === 'svg') {
      const { svg, width, height } = buildSvgMarkup(tree, layout, options);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      triggerBlobDownload(blob, `${cleanTitle}_vector_${Date.now()}.svg`);
      return {
        success: true,
        width,
        height,
        fileSizeBytes: blob.size,
      };
    }

    // Pure Vector PDF via native browser vector print engine
    if (format === 'pdf') {
      const { svg, width, height } = buildSvgMarkup(tree, layout, options);
      return await exportVectorPdfPrint(svg, width, height, tree.title);
    }

    // Ultra High-Resolution Raster PNG / JPEG with Blob export and automatic fallback
    const titlePadding = options.includeTitle !== false ? 60 : 0;
    const totalWidth = layout.bounds.width;
    const totalHeight = layout.bounds.height + titlePadding;
    const safeDims = getSafeExportDimensions(totalWidth, totalHeight, requestedScale);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    let currentScale = safeDims.effectiveScale;
    let blob: Blob | null = null;
    let finalW = safeDims.pixelWidth;
    let finalH = safeDims.pixelHeight;

    // Try up to 4 attempts; if device GPU rejects an extreme canvas size, step down smoothly
    for (let attempt = 0; attempt < 4; attempt++) {
      finalW = Math.max(1, Math.round(totalWidth * currentScale));
      finalH = Math.max(1, Math.round(totalHeight * currentScale));

      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        renderTreeToCanvas(ctx, tree, layout, currentScale, options);
        blob = await canvasToBlob(canvas, mimeType, quality);
      }

      // Free GPU/RAM buffer immediately
      canvas.width = 0;
      canvas.height = 0;

      if (blob && blob.size > 0) {
        break;
      }

      currentScale = Math.max(1, Math.floor(currentScale * 0.78 * 100) / 100);
    }

    if (!blob || blob.size === 0) {
      return {
        success: false,
        error:
          'This tree is too large for a raster image on this device. Please choose SVG (Infinite Zoom) or PDF instead.',
      };
    }

    triggerBlobDownload(
      blob,
      `${cleanTitle}_${finalW}x${finalH}_${Date.now()}.${ext}`
    );

    return {
      success: true,
      width: finalW,
      height: finalH,
      effectiveScale: currentScale,
      fileSizeBytes: blob.size,
      wasClamped: currentScale < requestedScale - 0.05,
    };
  } catch (err: any) {
    console.error('Export error:', err);
    return {
      success: false,
      error: err.message || 'Failed to export image.',
    };
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string = '#64748b'
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const arrowLength = 7;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - arrowLength * Math.cos(angle - Math.PI / 6),
    to.y - arrowLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    to.x - arrowLength * Math.cos(angle + Math.PI / 6),
    to.y - arrowLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
