import { FamilyTreeData } from '../types';
import { calculateTreeLayout, computeNodeDimensions } from './layoutEngine';

export interface ExportOptions {
  format: 'png' | 'jpeg';
  scale: number; // 1 = 1x (standard), 2 = 2x (retina/print), 3 = 3x (high-res poster)
  quality?: number; // 0.1 to 1.0 for jpeg
  backgroundColor?: string;
  excludePlaceholders?: boolean;
  focusPersonId?: string | null;
  includeTitle?: boolean;
}

/**
 * Renders the entire family tree (or selected branch) to an offscreen high-resolution Canvas
 * and triggers a download of PNG or JPG.
 */
export async function exportTreeImage(
  tree: FamilyTreeData,
  options: ExportOptions
): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  try {
    let scale = options.scale || 2;
    const format = options.format || 'png';
    const bgColor = options.backgroundColor || '#ffffff';
    const quality = options.quality ?? 0.95;

    // Calculate complete layout coordinates (not just visible screen)
    const layout = calculateTreeLayout(tree, {
      layoutMode: tree.layoutMode,
      focusPersonId: options.focusPersonId,
      excludePlaceholders: options.excludePlaceholders,
    });

    if (layout.nodes.length === 0) {
      return { success: false, error: 'No family members to export in the selected branch.' };
    }

    // Determine total dimensions with extra header padding if title is included
    const titlePadding = options.includeTitle !== false ? 60 : 0;
    const totalWidth = layout.bounds.width;
    const totalHeight = layout.bounds.height + titlePadding;

    // Safe dimension cap to prevent browser canvas memory allocation failures on giant trees
    const maxSafeDimension = 14000;
    if (totalWidth * scale > maxSafeDimension || totalHeight * scale > maxSafeDimension) {
      scale = Math.max(1, Math.min(scale, Math.floor(maxSafeDimension / Math.max(totalWidth, totalHeight))));
    }

    // Create high-res canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(totalWidth * scale);
    canvas.height = Math.round(totalHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Failed to create 2D canvas rendering context.' };
    }

    // Wait for fonts (especially Malayalam web fonts) to be fully loaded
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    const fontFamilyName = tree.fontFamily || '"Noto Sans Malayalam", "Manjari", "Gayathri", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Set scale for high-DPI rendering
    ctx.scale(scale, scale);

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Optional Title header
    if (options.includeTitle !== false) {
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 20px ${fontFamilyName}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const rootName = tree.people[options.focusPersonId || tree.rootPersonId]?.name || 'Lineage';
      ctx.fillText(`${tree.title} — Lineage of ${rootName}`, 60, 36);

      ctx.fillStyle = '#64748b';
      ctx.font = `12px ${fontFamilyName}`;
      ctx.fillText(`Paternal Lineage Chart • ${layout.nodes.length} members • Generated on ${new Date().toLocaleDateString()}`, 60, 58);
    }

    // Translate down if title padding is active
    ctx.save();
    ctx.translate(0, titlePadding);

    // 1. Draw Orthogonal Connection Lines
    ctx.strokeStyle = '#64748b'; // Slate 500
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
        drawArrowhead(ctx, pPenultimate, pLast, line.isDashed ? '#d97706' : '#64748b');
      }
      ctx.restore();
    }

    // 2. Draw Rectangular Person Boxes (Pure minimal design: name only, no icons/emojis)
    for (const node of layout.nodes) {
      const x = node.x;
      const y = node.y;
      const w = node.width;
      const h = node.height;
      const radius = 5;

      if (node.isPlaceholder) {
        // Placeholder Box: dashed border, light muted fill
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.fillStyle = '#f8fafc'; // Slate 50
        ctx.strokeStyle = '#94a3b8'; // Slate 400
        ctx.lineWidth = 1.25;

        drawRoundedRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Placeholder Text
        ctx.fillStyle = '#64748b';
        ctx.font = `italic 12px ${fontFamilyName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name || 'Empty Box', x + w / 2, y + h / 2);
      } else if (node.isExtraNote) {
        // Extra Note / Person: amber fill, dashed breaking line border -------
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.fillStyle = '#fffbeb'; // Amber 50
        ctx.strokeStyle = '#f59e0b'; // Amber 500
        ctx.lineWidth = 1.75;

        drawRoundedRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#78350f'; // Amber 900
        ctx.font = `600 12px ${fontFamilyName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const dims = computeNodeDimensions(node.name, false, node.extraNote);
        const nameLines = dims.lines;
        const lineSpacing = 16;
        const nameBlockH = nameLines.length * lineSpacing;
        const startY = node.extraNote ? y + 14 : y + h / 2 - ((nameLines.length - 1) * lineSpacing) / 2;

        for (let li = 0; li < nameLines.length; li++) {
          ctx.fillText(nameLines[li], x + w / 2, startY + li * lineSpacing);
        }

        // Draw breaking line ------- divider inside box if extraNote exists
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
        // Named Person Box: clean white background, crisp border
        const isRoot = node.id === tree.rootPersonId;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = isRoot ? '#0284c7' : '#94a3b8'; // Sky-600 for root, slate-400 for others
        ctx.lineWidth = isRoot ? 2 : 1.25;

        drawRoundedRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a'; // Slate 900
        ctx.font = isRoot
          ? `bold 12px ${fontFamilyName}`
          : `500 12px ${fontFamilyName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const dims = computeNodeDimensions(node.name, false, node.extraNote);
        const textLines = dims.lines;
        const lineSpacing = 16;
        const nameBlockH = textLines.length * lineSpacing;
        const startY = node.extraNote ? y + 14 : y + h / 2 - ((textLines.length - 1) * lineSpacing) / 2;

        for (let li = 0; li < textLines.length; li++) {
          ctx.fillText(textLines[li], x + w / 2, startY + li * lineSpacing);
        }

        // Breaking line ------- divider if extraNote exists
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

    // Export to data URL or blob
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, quality);

    // Trigger download
    const link = document.createElement('a');
    const cleanTitle = (tree.title || 'family-tree').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.download = `${cleanTitle}_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true, dataUrl };
  } catch (err: any) {
    console.error('Export error:', err);
    return { success: false, error: err.message || 'Failed to export image.' };
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
