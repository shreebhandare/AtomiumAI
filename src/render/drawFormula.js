// Draws chemical formula text on the canvas with proper subscripts, charges,
// parentheses, and dot notation.

export function drawFormula(ctx, W, H, tokens, zoom) {
  const baseFontSize = 58; // baseline font size
  ctx.save();

  // Measure all tokens first to calculate total width
  let totalWidth = 0;
  const tokenLayouts = [];

  tokens.forEach((token) => {
    let fontSize = baseFontSize;
    let yOffset = 0;

    if (token.type === "subscript") {
      fontSize = baseFontSize * 0.6;
      yOffset = baseFontSize * 0.25;
    } else if (token.type === "charge") {
      fontSize = baseFontSize * 0.55;
      yOffset = -baseFontSize * 0.35;
    } else if (token.type === "dot") {
      fontSize = baseFontSize;
      yOffset = -baseFontSize * 0.05;
    }

    ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
    const metrics = ctx.measureText(token.text);
    const width = metrics.width;

    const padding = token.type === "dot" ? 10 : 1;

    tokenLayouts.push({
      token,
      width: width + padding * 2,
      padding,
      fontSize,
      yOffset
    });

    totalWidth += width + padding * 2;
  });

  const visibleWidth = W / zoom;
  const visibleHeight = H / zoom;
  const maxW = visibleWidth * 0.85;
  const maxH = visibleHeight * 0.45;

  let scale = 1;
  if (totalWidth > maxW) {
    scale = maxW / totalWidth;
  }
  const totalHeight = baseFontSize * 1.5;
  if (totalHeight > maxH) {
    scale = Math.min(scale, maxH / totalHeight);
  }

  let currentX = - (totalWidth * scale) / 2;

  tokenLayouts.forEach((layout) => {
    const token = layout.token;
    ctx.font = `bold ${layout.fontSize * scale}px "Space Grotesk", sans-serif`;
    
    if (token.type === "element") {
      ctx.fillStyle = "#ffffff";
    } else if (token.type === "subscript") {
      ctx.fillStyle = "#60a5fa";
    } else if (token.type === "charge") {
      ctx.fillStyle = "#f87171";
    } else if (token.type === "parenthesis") {
      ctx.fillStyle = "#c084fc";
    } else if (token.type === "dot") {
      ctx.fillStyle = "#22d3ee";
    } else if (token.type === "coefficient") {
      ctx.fillStyle = "#fbbf24";
    } else {
      ctx.fillStyle = "#cbd5e1";
    }

    const drawX = currentX + layout.padding * scale;
    const drawY = layout.yOffset * scale;

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(token.text, drawX, drawY);

    currentX += layout.width * scale;
  });

  ctx.restore();
}

