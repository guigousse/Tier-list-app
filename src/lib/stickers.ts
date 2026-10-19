/**
 * Badge stickers, drawn in SVG (viewBox 0 0 100 100): a cartoon illustration with
 * dark outlines, die-cut with a thick white border and a soft drop shadow.
 *
 * Each sticker gives its silhouette (plain shapes, painted white and stroked wide
 * for the border) and its art.
 */

const OL = '#2A1B14';
/** Outline attributes for a filled shape. */
const line = (w = 2.4) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

type Drawing = { silhouette: string; art: (uid: string) => string };

/** Points of a star (or sun) polygon centred on (cx, cy). */
function star(cx: number, cy: number, outer: number, inner: number, points: number, turn = -Math.PI / 2): string {
  return (
    'M' +
    Array.from({ length: points * 2 }, (_, k) => {
      const r = k % 2 ? inner : outer;
      const a = turn + (Math.PI * k) / points;
      return `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
    }).join(' L') +
    ' Z'
  );
}

/** A small sparkle (four-pointed star). */
const sparkle = (x: number, y: number, r: number, fill = '#FFFFFF') =>
  `<path fill="${fill}" d="M${x} ${y - r} C${x + r * 0.15} ${y - r * 0.15} ${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} C${x + r * 0.15} ${y + r * 0.15} ${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} C${x - r * 0.15} ${y + r * 0.15} ${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} C${x - r * 0.15} ${y - r * 0.15} ${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r} Z"/>`;

/** A squeeze bottle (ketchup, mayo), tilted by `tilt` degrees. */
function bottle(tilt: number, body: string, shade: string, cap: string, capShade: string, label: string, emblem: string): Drawing {
  const t = `transform="rotate(${tilt} 50 54)"`;
  return {
    silhouette: `<g ${t}><path d="M28 38 C28 31 33 28 38 28 H62 C67 28 72 31 72 38 V82 C72 89 67 92 60 92 H40 C33 92 28 89 28 82 Z"/><rect x="37" y="14" width="26" height="17" rx="4"/><path d="M45 15 L47.5 6 H52.5 L55 15 Z"/></g>`,
    art: () => `<g ${t}>
<path fill="${cap}" ${line(2)} d="M45 15 L47.5 6 H52.5 L55 15 Z"/>
<rect fill="${cap}" ${line()} x="37" y="14" width="26" height="17" rx="4"/>
<path fill="${capShade}" d="M38.5 25 H61.5 V27 C61.5 28.5 60.5 29.5 59 29.5 H41 C39.5 29.5 38.5 28.5 38.5 27 Z"/>
<path fill="none" stroke="${capShade}" stroke-width="1.6" stroke-linecap="round" d="M43 17 V24 M50 17 V24 M57 17 V24"/>
<path fill="${body}" ${line()} d="M28 38 C28 31 33 28 38 28 H62 C67 28 72 31 72 38 V82 C72 89 67 92 60 92 H40 C33 92 28 89 28 82 Z"/>
<path fill="${shade}" d="M62 30 C67 31 70 34 70 39 V82 C70 87 67 90 61 90 H55 C62 88 64 84 64 78 V40 C64 35 63.5 32 62 30 Z"/>
<rect fill="${label}" ${line(2)} x="33" y="46" width="34" height="30" rx="6"/>
${emblem}
<path fill="#FFFFFF" opacity=".55" d="M33 36 C33 33 35 32 37 32 C35.5 34 35 37 35 41 V58 C35 60 33 60 33 58 Z"/>
</g>`,
  };
}

const DRAWINGS: Record<string, Drawing> = {
  pizza: {
    silhouette: `<path d="M19 27 L50 92 L81 27 Z"/><path d="M12 25 C30 8 70 8 88 25 C90 30 87 34 83 34 C64 23 36 23 17 34 C13 34 10 30 12 25 Z"/>`,
    art: () => `
<path fill="#FFCF4A" ${line()} d="M18 29 L50 91 L82 29 C64 21 36 21 18 29 Z"/>
<path fill="#F5A623" d="M50 91 L60 70 C57 70 53 75 50 91 Z M27 47 C30 47 31 52 29.5 55 L26 48 Z M73 47 C70 47 69 52 70.5 55 L74 48 Z"/>
<path fill="none" stroke="#FFF3C4" stroke-width="2.6" stroke-linecap="round" d="M26 36 L38 60"/>
<g ${line(1.8)}><circle fill="#D93F2E" cx="37" cy="38" r="7"/><circle fill="#D93F2E" cx="62" cy="40" r="6.5"/><circle fill="#D93F2E" cx="50" cy="58" r="6"/><circle fill="#D93F2E" cx="50" cy="77" r="3.6"/></g>
<g fill="#A82A1E"><circle cx="35" cy="37" r="1.3"/><circle cx="39" cy="40.5" r="1"/><circle cx="64" cy="39" r="1.2"/><circle cx="60" cy="42" r="1"/><circle cx="51.5" cy="57" r="1.1"/></g>
<g fill="#FFFFFF" opacity=".6"><circle cx="34.5" cy="35" r="1.6"/><circle cx="59.5" cy="37.5" r="1.4"/><circle cx="48" cy="55.5" r="1.3"/></g>
<path fill="#3FA34D" ${line(1.6)} d="M58 52 C62 48 68 49 69 52 C66 55 61 55 58 52 Z"/>
<path fill="#3FA34D" ${line(1.6)} d="M41 66 C40 61 44 58 47 59 C47 63 45 66 41 66 Z"/>
<path fill="#E8973A" ${line()} d="M12 25 C30 8 70 8 88 25 C90 30 87 34 83 34 C64 23 36 23 17 34 C13 34 10 30 12 25 Z"/>
<path fill="none" stroke="#FFD08A" stroke-width="2.4" stroke-linecap="round" d="M22 20 C36 13 56 12 72 16"/>
<g fill="#B8661F"><circle cx="30" cy="22" r="1"/><circle cx="46" cy="18.5" r="1"/><circle cx="62" cy="19" r="1"/><circle cx="76" cy="23" r="1"/></g>`,
  },
  burger: {
    silhouette: `<path d="M14 48 C14 20 86 20 86 48 Z"/><rect x="11" y="44" width="78" height="43" rx="12"/>`,
    art: () => `
<path fill="#E39B45" ${line()} d="M16 73 H84 C86.5 73 87.5 75 86.5 77.5 C84 84 78 87 72 87 H28 C22 87 16 84 13.5 77.5 C12.5 75 13.5 73 16 73 Z"/>
<rect fill="#6B3A22" ${line()} x="12" y="61" width="76" height="14" rx="7"/>
<path fill="none" stroke="#8C5434" stroke-width="2" stroke-linecap="round" d="M22 66 H34 M42 69 H56 M64 66 H78"/>
<path fill="#FFC93C" ${line(2)} d="M14 57 H86 L82 63 L76 70 L71 63 H55 L49 71 L43 63 H28 L22 68 L18 63 Z"/>
<path fill="#6CCB5F" ${line(2)} d="M12 53 C16 48 20 57 25 52 C29 47 33 57 38 52 C42 47 46 57 51 52 C55 47 59 57 64 52 C68 47 72 57 77 52 C81 47 85 56 88 53 L87 59 H13 Z"/>
<path fill="#F0A64E" ${line()} d="M14 50 C14 22 86 22 86 50 C86 53 84 55 81 55 H19 C16 55 14 53 14 50 Z"/>
<path fill="#D9843A" d="M18 52 H82 C83.5 52 84 51 84 50 C84 49 84 48 83.8 47 C78 50 22 50 16.2 47 C16 48 16 49 16 50 C16 51 16.5 52 18 52 Z"/>
<path fill="#FFD9A0" opacity=".8" d="M26 33 C32 27 42 25 50 25 C42 28 34 31 29 37 C27 38 25 36 26 33 Z"/>
<g fill="#FFF4DC" stroke="#C47A2C" stroke-width=".8"><ellipse cx="38" cy="34" rx="2.4" ry="1.3" transform="rotate(-20 38 34)"/><ellipse cx="52" cy="30" rx="2.4" ry="1.3" transform="rotate(10 52 30)"/><ellipse cx="64" cy="36" rx="2.4" ry="1.3" transform="rotate(30 64 36)"/><ellipse cx="46" cy="41" rx="2.4" ry="1.3" transform="rotate(-5 46 41)"/><ellipse cx="72" cy="44" rx="2.4" ry="1.3" transform="rotate(40 72 44)"/><ellipse cx="28" cy="44" rx="2.4" ry="1.3" transform="rotate(-35 28 44)"/></g>`,
  },
  dog: {
    silhouette: `<ellipse cx="50" cy="56" rx="31" ry="31"/><path d="M27 28 C11 26 6 52 12 68 C16 76 28 72 30 62 Z"/><path d="M73 28 C89 26 94 52 88 68 C84 76 72 72 70 62 Z"/>`,
    art: () => `
<path fill="#8A5A35" ${line()} d="M28 29 C13 27 8 52 13 67 C16 74 27 71 29 62 Z"/>
<path fill="#8A5A35" ${line()} d="M72 29 C87 27 92 52 87 67 C84 74 73 71 71 62 Z"/>
<path fill="#6E4527" d="M24 34 C17 36 14 50 16 62 C18 66 22 66 24 62 Z M76 34 C83 36 86 50 84 62 C82 66 78 66 76 62 Z"/>
<ellipse fill="#E0A86C" ${line()} cx="50" cy="56" rx="29" ry="29"/>
<path fill="#C98C52" d="M58 29 C68 33 76 42 78 54 C72 46 64 42 58 41 Z"/>
<ellipse fill="#FFF1DE" ${line(2)} cx="50" cy="70" rx="17" ry="13"/>
<g fill="${OL}"><ellipse cx="39" cy="52" rx="4.4" ry="5"/><ellipse cx="61" cy="52" rx="4.4" ry="5"/></g>
<g fill="#FFFFFF"><circle cx="40.6" cy="50.2" r="1.6"/><circle cx="62.6" cy="50.2" r="1.6"/></g>
<path fill="none" ${line(2)} d="M33 43 C36 41 40 41 43 43 M57 43 C60 41 64 41 67 43"/>
<path fill="${OL}" d="M43 62 C43 57.5 57 57.5 57 62 C57 66 53 68 50 68 C47 68 43 66 43 62 Z"/>
<ellipse fill="#FFFFFF" opacity=".6" cx="47" cy="60.5" rx="3" ry="1.4"/>
<path fill="none" ${line(2)} d="M50 68 V72 C47.5 76 43 75.5 41.5 72.5 M50 72 C52.5 76 57 75.5 58.5 72.5"/>
<path fill="#FF6F8E" ${line(1.8)} d="M46 74.5 C46 82 54 82 54 74.5 C52.5 75.6 47.5 75.6 46 74.5 Z"/>
<path fill="none" stroke="#D94A6B" stroke-width="1.2" d="M50 75.5 V79"/>
<g fill="#FF8A7A" opacity=".5"><ellipse cx="30" cy="64" rx="5" ry="3"/><ellipse cx="70" cy="64" rx="5" ry="3"/></g>`,
  },
  cat: {
    silhouette: `<path d="M17 42 L21 10 L46 28 Z"/><path d="M83 42 L79 10 L54 28 Z"/><ellipse cx="50" cy="57" rx="34" ry="29"/>`,
    art: () => `
<path fill="#F2994A" ${line()} d="M18 44 L22 11 L45 29 Z"/>
<path fill="#F2994A" ${line()} d="M82 44 L78 11 L55 29 Z"/>
<path fill="#FFB8C6" d="M23 36 L25 18 L38 28 Z M77 36 L75 18 L62 28 Z"/>
<ellipse fill="#F7A65A" ${line()} cx="50" cy="57" rx="32" ry="27"/>
<g fill="none" stroke="#D9772E" stroke-width="3" stroke-linecap="round"><path d="M50 31 V40"/><path d="M42 32 L44 40"/><path d="M58 32 L56 40"/><path d="M19 52 H26"/><path d="M20 59 H26"/><path d="M81 52 H74"/><path d="M80 59 H74"/></g>
<ellipse fill="#FFF1E2" cx="43" cy="68" rx="10" ry="8"/><ellipse fill="#FFF1E2" cx="57" cy="68" rx="10" ry="8"/>
<g ${line(2)}><ellipse fill="#8CD867" cx="38" cy="53" rx="6" ry="7"/><ellipse fill="#8CD867" cx="62" cy="53" rx="6" ry="7"/></g>
<g fill="${OL}"><ellipse cx="38.5" cy="53.5" rx="1.9" ry="5.6"/><ellipse cx="62.5" cy="53.5" rx="1.9" ry="5.6"/></g>
<g fill="#FFFFFF"><circle cx="40.4" cy="50.4" r="1.6"/><circle cx="64.4" cy="50.4" r="1.6"/></g>
<path fill="#FF7F9F" ${line(1.6)} d="M46.5 62 H53.5 L50 66 Z"/>
<path fill="none" ${line(2)} d="M50 66 C50 70 46 71.5 43.5 69.5 M50 66 C50 70 54 71.5 56.5 69.5"/>
<path fill="none" stroke="${OL}" stroke-width="1.3" stroke-linecap="round" d="M34 66 L20 63 M34 70 L21 72 M66 66 L80 63 M66 70 L79 72"/>
<g fill="#FF8A7A" opacity=".45"><ellipse cx="29" cy="65" rx="4.5" ry="2.8"/><ellipse cx="71" cy="65" rx="4.5" ry="2.8"/></g>`,
  },
  ketchup: bottle(
    -12,
    '#E8352B',
    '#C42318',
    '#F4F4F4',
    '#C9CED6',
    '#FFF4DC',
    `<circle fill="#E8352B" ${line(1.8)} cx="50" cy="62" r="8.5"/><path fill="#3FA34D" ${line(1.4)} d="M50 54.5 L46 51 L50 52.5 L54 51 Z"/><ellipse fill="#FFFFFF" opacity=".6" cx="47" cy="59" rx="2.4" ry="1.4"/>`,
  ),
  mayo: bottle(
    12,
    '#FFF1B8',
    '#F2D27A',
    '#3E7BFA',
    '#2A5FD0',
    '#3E7BFA',
    `<ellipse fill="#FFFFFF" ${line(1.8)} cx="50" cy="62" rx="9" ry="10.5"/><circle fill="#FFC93C" ${line(1.4)} cx="50" cy="64" r="4.5"/><ellipse fill="#FFFFFF" opacity=".7" cx="48.6" cy="62.6" rx="1.4" ry="1"/>`,
  ),
  sea: {
    silhouette: `<circle cx="50" cy="50" r="42"/>`,
    art: (uid) => `
<defs><linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CCBFF"/><stop offset="1" stop-color="#D9F3FF"/></linearGradient>
<clipPath id="disc-${uid}"><circle cx="50" cy="50" r="41"/></clipPath></defs>
<g clip-path="url(#disc-${uid})">
<rect width="100" height="100" fill="url(#sky-${uid})"/>
<circle fill="#FFE066" cx="70" cy="30" r="10"/><circle fill="#FFF3B0" cx="67" cy="27" r="3"/>
<path fill="none" stroke="${OL}" stroke-width="1.8" stroke-linecap="round" d="M24 30 Q28 26 32 30 Q36 26 40 30 M36 20 Q39 17 42 20 Q45 17 48 20"/>
<path fill="#5BB8F2" d="M0 58 C14 52 24 60 36 55 C48 50 60 58 72 53 C84 48 92 54 100 52 V100 H0 Z"/>
<path fill="#2B7FD6" ${line(2.2)} d="M-2 76 C12 70 22 72 32 64 C42 54 58 48 70 54 C80 60 78 72 68 72 C62 72 61 64 66 62 C58 58 50 66 50 74 C50 82 62 88 102 84 V104 H-2 Z"/>
<path fill="#FFFFFF" d="M32 64 C42 54 58 48 70 54 C76 57 78 63 76 68 C74 60 66 55 58 56 C48 57 42 63 36 67 Z"/>
<path fill="#1E63B5" d="M-2 92 C20 86 40 94 60 90 C80 86 90 92 102 90 V104 H-2 Z"/>
<g fill="#FFFFFF"><circle cx="80" cy="64" r="2"/><circle cx="85" cy="68" r="1.4"/><circle cx="20" cy="70" r="1.6"/></g>
</g>
<circle fill="none" ${line(2.6)} cx="50" cy="50" r="41"/>`,
  },
  mountain: {
    silhouette: `<circle cx="50" cy="50" r="42"/>`,
    art: (uid) => `
<defs><linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FC8FF"/><stop offset="1" stop-color="#E6F4FF"/></linearGradient>
<clipPath id="disc-${uid}"><circle cx="50" cy="50" r="41"/></clipPath></defs>
<g clip-path="url(#disc-${uid})">
<rect width="100" height="100" fill="url(#sky-${uid})"/>
<path fill="#FFFFFF" opacity=".9" d="M16 30 C16 26 21 24 24 27 C26 22 34 23 34 28 C38 28 38 33 34 33 H18 C15 33 14 31 16 30 Z"/>
<path fill="#9AA9CF" ${line(2)} d="M-2 74 L26 40 L42 58 L60 36 L102 76 V104 H-2 Z"/>
<path fill="#6F82B5" ${line(2.2)} d="M10 84 L46 30 L84 84 Z"/>
<path fill="#566A9E" d="M46 30 L84 84 H66 L54 56 Z"/>
<path fill="#FFFFFF" ${line(1.8)} d="M36 45 L46 30 L57 46 L52 43 L47 48 L42 43 Z"/>
<path fill="#FFFFFF" ${line(1.6)} d="M54 42 L60 36 L67 43 L63 42 L60 45 L57 42 Z"/>
<path fill="#5DBB63" ${line(2)} d="M-2 80 C20 74 40 82 60 78 C80 74 92 78 102 76 V104 H-2 Z"/>
<g ${line(1.6)} fill="#2E7D4F"><path d="M22 84 L28 70 L34 84 Z"/><path d="M30 86 L36 68 L42 86 Z"/><path d="M68 84 L74 70 L80 84 Z"/></g>
</g>
<circle fill="none" ${line(2.6)} cx="50" cy="50" r="41"/>`,
  },
  sweet: {
    silhouette: `<ellipse cx="50" cy="55" rx="40" ry="33"/>`,
    art: () => `
<ellipse fill="#E9A85E" ${line()} cx="50" cy="56" rx="38" ry="31"/>
<path fill="#C9803F" d="M14 60 C18 76 34 86 50 86 C66 86 82 76 86 60 C80 72 66 80 50 80 C34 80 20 72 14 60 Z"/>
<path fill="#FF7EB3" ${line(2.2)} d="M14 52 C14 30 86 30 86 52 C86 58 82 60 79 58 C76 64 70 62 68 66 C64 70 58 66 54 70 C50 72 46 68 42 70 C38 72 32 68 30 64 C26 64 22 66 18 60 C15 58 14 56 14 52 Z"/>
<ellipse fill="#C9803F" ${line(2)} cx="50" cy="49" rx="11" ry="7.5"/>
<path fill="#E9A85E" d="M40 50 C42 46 58 46 60 50 C58 54 42 54 40 50 Z"/>
<path fill="#FFFFFF" opacity=".55" d="M24 44 C26 37 34 33 42 32 C36 35 30 39 28 45 C27 47 24 47 24 44 Z"/>
<g stroke-linecap="round" stroke-width="2.6"><path stroke="#FFFFFF" d="M30 50 L34 48"/><path stroke="#5BC0EB" d="M38 38 L42 40"/><path stroke="#FFE066" d="M58 37 L62 35"/><path stroke="#9BE564" d="M70 45 L72 49"/><path stroke="#FFFFFF" d="M64 58 L68 56"/><path stroke="#5BC0EB" d="M44 60 L48 61"/><path stroke="#FFE066" d="M26 57 L28 60"/><path stroke="#9BE564" d="M54 62 L56 59"/><path stroke="#B388FF" d="M74 54 L77 52"/><path stroke="#B388FF" d="M48 36 L51 35"/></g>`,
  },
  salty: {
    silhouette: `<path d="M22 46 H78 L71 92 H29 Z"/><g transform="rotate(-14 34 30)"><rect x="29" y="12" width="10" height="40" rx="2"/></g><rect x="41" y="8" width="10" height="44" rx="2"/><g transform="rotate(10 62 30)"><rect x="56" y="10" width="10" height="42" rx="2"/></g><g transform="rotate(22 70 36)"><rect x="66" y="18" width="9" height="34" rx="2"/></g><g transform="rotate(-6 50 30)"><rect x="47" y="14" width="9" height="38" rx="2"/></g>`,
    art: () => `
<g fill="#FFD34D" ${line(2)}>
<rect x="29" y="12" width="10" height="40" rx="2" transform="rotate(-14 34 30)"/>
<rect x="66" y="18" width="9" height="34" rx="2" transform="rotate(22 70 36)"/>
<rect x="41" y="8" width="10" height="44" rx="2"/>
<rect x="56" y="10" width="10" height="42" rx="2" transform="rotate(10 62 30)"/>
<rect x="47" y="14" width="9" height="38" rx="2" transform="rotate(-6 50 30)"/>
</g>
<g fill="#FFF0A8" opacity=".9"><rect x="43" y="10" width="2.4" height="20" rx="1.2"/><rect x="58" y="13" width="2.2" height="18" rx="1.1" transform="rotate(10 62 30)"/><rect x="31" y="15" width="2.2" height="18" rx="1.1" transform="rotate(-14 34 30)"/></g>
<g fill="#E8A92E"><rect x="49.5" y="30" width="3.5" height="4" rx="1.4" transform="rotate(-6 50 30)"/><rect x="36" y="34" width="3" height="3" rx="1.2"/></g>
<path fill="#E8352B" ${line()} d="M20 46 C34 54 66 54 80 46 L72 92 H28 Z"/>
<path fill="#C42318" d="M80 46 L72 92 H62 L69 51 C73 50 77 48 80 46 Z"/>
<path fill="#FFFFFF" d="M34 58 C38 59.5 44 60.2 50 60.2 C56 60.2 62 59.5 66 58 L64.6 68 C60 69 55 69.6 50 69.6 C45 69.6 40 69 35.4 68 Z"/>
<path fill="none" stroke="#E8352B" stroke-width="2" stroke-linecap="round" d="M43 63 C45 66 55 66 57 63"/>
<g fill="#E8352B"><circle cx="45" cy="61.5" r="1.2"/><circle cx="55" cy="61.5" r="1.2"/></g>
<path fill="#FFFFFF" opacity=".35" d="M25 52 C27 53 28 53.5 29 54 L32 88 H30 Z"/>`,
  },
  coffee: {
    silhouette: `<path d="M20 40 H74 V74 C74 85 66 91 55 91 H39 C28 91 20 85 20 74 Z"/><path fill="none" stroke-width="22" d="M74 50 C88 50 88 70 74 70"/><path fill="none" stroke-width="16" d="M36 30 C32 24 40 20 36 13 M52 30 C48 24 56 20 52 13"/>`,
    art: () => `
<path fill="none" stroke="${OL}" stroke-width="8" stroke-linecap="round" d="M36 30 C32 24 40 20 36 13 M52 30 C48 24 56 20 52 13"/>
<path fill="none" stroke="#E9EEF5" stroke-width="4" stroke-linecap="round" d="M36 30 C32 24 40 20 36 13 M52 30 C48 24 56 20 52 13"/>
<path fill="none" stroke="${OL}" stroke-width="12" stroke-linecap="round" d="M74 50 C88 50 88 70 74 70"/>
<path fill="none" stroke="#FF7A59" stroke-width="7" stroke-linecap="round" d="M74 50 C88 50 88 70 74 70"/>
<path fill="#FF7A59" ${line()} d="M20 40 H74 V74 C74 85 66 91 55 91 H39 C28 91 20 85 20 74 Z"/>
<path fill="#E25C3E" d="M66 42 H72 V74 C72 84 65 89 56 89 C63 86 66 80 66 74 Z"/>
<ellipse fill="#6B3A22" ${line(2.2)} cx="47" cy="40" rx="27" ry="6.5"/>
<path fill="#F3D9B5" d="M47 44 C42 40.5 41 37.5 43.5 36.6 C45 36 46.4 37 47 38 C47.6 37 49 36 50.5 36.6 C53 37.5 52 40.5 47 44 Z"/>
<path fill="#FFFFFF" opacity=".5" d="M25 48 C25 46 27 46 27 48 V72 C27 75 25 75 25 72 Z"/>
<path fill="#FFFFFF" d="M47 76 C38 69 35 63 39.5 60.5 C42.5 59 45.5 61 47 63.5 C48.5 61 51.5 59 54.5 60.5 C59 63 56 69 47 76 Z"/>`,
  },
  tea: {
    silhouette: `<ellipse cx="50" cy="83" rx="40" ry="10"/><path d="M18 44 H82 C82 66 69 82 50 82 C31 82 18 66 18 44 Z"/><path fill="none" stroke-width="20" d="M80 52 C92 52 92 68 78 68"/><rect x="5" y="58" width="16" height="18" rx="3"/><path fill="none" stroke-width="14" d="M36 34 C32 28 40 24 36 18 M54 34 C50 28 58 24 54 18"/>`,
    art: () => `
<path fill="none" stroke="${OL}" stroke-width="8" stroke-linecap="round" d="M36 34 C32 28 40 24 36 18 M54 34 C50 28 58 24 54 18"/>
<path fill="none" stroke="#E9EEF5" stroke-width="4" stroke-linecap="round" d="M36 34 C32 28 40 24 36 18 M54 34 C50 28 58 24 54 18"/>
<ellipse fill="#CFE9F6" ${line()} cx="50" cy="83" rx="38" ry="8.5"/>
<ellipse fill="#B2D8EC" cx="50" cy="82" rx="24" ry="4.5"/>
<path fill="none" stroke="${OL}" stroke-width="11" stroke-linecap="round" d="M80 52 C92 52 92 68 78 68"/>
<path fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" d="M80 52 C92 52 92 68 78 68"/>
<path fill="#FFFFFF" ${line()} d="M18 44 H82 C82 66 69 82 50 82 C31 82 18 66 18 44 Z"/>
<path fill="#DCEFF7" d="M72 46 H80 C80 64 70 78 54 80.5 C66 74 72 62 72 46 Z"/>
<ellipse fill="#9CCB4E" ${line(2.2)} cx="50" cy="44" rx="32" ry="6.5"/>
<path fill="#C4E27D" d="M30 44 C36 41 60 41 70 44 C60 46 40 46 30 44 Z" opacity=".8"/>
<path fill="#5DAA4A" ${line(1.6)} d="M42 66 C42 58 50 54 58 56 C58 64 50 68 42 66 Z"/>
<path fill="none" stroke="${OL}" stroke-width="1.3" stroke-linecap="round" d="M44 64 C48 61 52 59 56 57.5"/>
<path fill="none" stroke="${OL}" stroke-width="1.4" d="M30 43 C26 48 18 54 13 59"/>
<rect fill="#F2C14E" ${line(1.8)} x="7" y="59" width="13" height="15" rx="2.5"/>
<path fill="#5DAA4A" d="M10.5 69 C10.5 65 13.5 63 16.5 63.5 C16.5 67 14 69.5 10.5 69 Z"/>`,
  },
  early: {
    silhouette: `<path d="${star(50, 50, 42, 31, 12)}"/>`,
    art: () => `
<path fill="#FFB020" ${line(2.2)} d="${star(50, 50, 42, 31, 12)}"/>
<circle fill="#FFD84A" ${line(2.4)} cx="50" cy="50" r="27"/>
<path fill="#FFE98A" d="M30 42 C33 33 42 27 52 27 C44 30 37 36 34 44 C33 47 29 46 30 42 Z"/>
<path fill="none" ${line(2.4)} d="M37 49 C39 45.5 43 45.5 45 49 M55 49 C57 45.5 61 45.5 63 49"/>
<path fill="#E2563D" ${line(2)} d="M41 57 C43 66 57 66 59 57 Z"/>
<path fill="#FF8A7A" d="M44 61.6 C47 60 53 60 56 61.6 C53.5 64 46.5 64 44 61.6 Z"/>
<g fill="#FF8A5B" opacity=".6"><ellipse cx="34" cy="56" rx="4.5" ry="2.8"/><ellipse cx="66" cy="56" rx="4.5" ry="2.8"/></g>`,
  },
  night: {
    silhouette: `<circle cx="50" cy="50" r="42"/>`,
    art: (uid) => `
<defs><linearGradient id="night-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2459"/><stop offset="1" stop-color="#3B3F8F"/></linearGradient></defs>
<circle fill="url(#night-${uid})" ${line(2.6)} cx="50" cy="50" r="41"/>
<g fill="#FFFFFF"><circle cx="24" cy="34" r="1.3"/><circle cx="76" cy="70" r="1.1"/><circle cx="30" cy="72" r="1"/><circle cx="70" cy="22" r="1.2"/></g>
${sparkle(74, 34, 5, '#FFE27A')}${sparkle(26, 56, 3.5, '#FFE27A')}
<path fill="#FFE27A" ${line(2.4)} d="M42.95 34.21 A22 22 0 1 0 66.75 63.31 A19 19 0 0 1 42.95 34.21 Z"/>
<path fill="#FFF3B8" d="M38 38 C33 44 32 54 36 61 C31 56 30 45 38 38 Z"/>
<path fill="none" ${line(2)} d="M41 60 C43 62.5 46 62.5 48 60"/>
<path fill="none" ${line(1.8)} d="M44 67 C46 69 49 69 51 67.5"/>
<g fill="#FF8A7A" opacity=".55"><ellipse cx="38" cy="66" rx="3.6" ry="2.2"/></g>
<path fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M62 22 H69 L62 29 H69 M74 12 H79 L74 17 H79"/>`,
  },
  pirate: {
    silhouette: `<path d="M6 68 C12 52 30 47 50 47 C70 47 88 52 94 68 C82 62 66 66 50 74 C34 66 18 62 6 68 Z"/><path d="M24 58 C24 14 76 14 76 58 Z"/><path d="M68 22 C78 9 94 10 92 21 C86 19 80 23 74 31 Z"/>`,
    art: () => `
<path fill="#E8352B" ${line(2)} d="M68 23 C77 10 94 10 92 21 C86 18 80 23 74 31 Z"/>
<path fill="none" stroke="#B5221A" stroke-width="1.4" stroke-linecap="round" d="M74 23 L83 16 M77 27 L87 19"/>
<path fill="#32324A" ${line()} d="M24 58 C24 14 76 14 76 58 Z"/>
<path fill="#44445E" d="M30 52 C31 30 40 21 50 19 C43 25 37 35 36 52 Z"/>
<g fill="#F7F3EA" ${line(1.6)}>
<rect x="35" y="38" width="30" height="5.5" rx="2.7" transform="rotate(28 50 41)"/>
<rect x="35" y="38" width="30" height="5.5" rx="2.7" transform="rotate(-28 50 41)"/>
<path d="M40 30 C40 22 60 22 60 30 C60 34 58 36 57 37 V40 H43 V37 C42 36 40 34 40 30 Z"/></g>
<g fill="${OL}"><ellipse cx="45.8" cy="30.5" rx="2.8" ry="3.1"/><ellipse cx="54.2" cy="30.5" rx="2.8" ry="3.1"/><path d="M50 33.5 L48.7 35.8 H51.3 Z"/></g>
<path fill="none" stroke="${OL}" stroke-width="1.1" d="M46.5 37 V40 M50 37 V40 M53.5 37 V40"/>
<path fill="#2B2B3A" ${line()} d="M6 68 C12 52 30 47 50 47 C70 47 88 52 94 68 C82 62 66 66 50 74 C34 66 18 62 6 68 Z"/>
<path fill="none" stroke="#F2C14E" stroke-width="3" stroke-linecap="round" d="M9 65 C20 60 34 63 50 70 C66 63 80 60 91 65"/>
<circle fill="#F2C14E" ${line(1.4)} cx="50" cy="58" r="3.4"/>
<path fill="#FFFFFF" opacity=".25" d="M14 62 C20 54 32 50 44 50 C34 53 24 57 18 63 Z"/>`,
  },
  ninja: {
    silhouette: `<circle cx="48" cy="52" r="37"/><path d="M78 40 C90 32 98 40 96 48 C92 44 86 46 82 50 Z"/><path d="M80 48 C92 50 96 60 90 66 C88 60 84 56 78 56 Z"/>`,
    art: () => `
<path fill="#E8352B" ${line(2)} d="M78 41 C89 33 97 40 95 48 C91 44 86 46 82 50 Z"/>
<path fill="#E8352B" ${line(2)} d="M80 49 C91 51 95 60 90 65 C88 59 84 56 78 56 Z"/>
<circle fill="#2F3142" ${line()} cx="48" cy="52" r="35"/>
<path fill="#3E4157" d="M22 40 C28 26 40 19 52 18 C42 23 32 31 27 43 Z"/>
<path fill="#E8352B" ${line(2)} d="M14 40 C26 30 70 30 82 40 L82 48 C70 39 26 39 14 48 Z"/>
<rect fill="#C9CED6" ${line(1.6)} x="40" y="33" width="16" height="9" rx="2"/>
<path fill="none" stroke="#8A93A3" stroke-width="1.2" stroke-linecap="round" d="M44 37.5 C46 35.5 50 35.5 52 37.5"/>
<rect fill="#F3C9A0" ${line(2)} x="20" y="50" width="56" height="17" rx="8.5"/>
<path fill="#E6B088" d="M22 62 H74 C73 64.5 71 66 68 66 H28 C25 66 23 64.5 22 62 Z"/>
<g fill="${OL}"><path d="M30 60 C30 55 39 54 41 58 C39 61 32 62 30 60 Z"/><path d="M66 60 C66 55 57 54 55 58 C57 61 64 62 66 60 Z"/></g>
<g fill="#FFFFFF"><circle cx="36" cy="57.3" r="1.2"/><circle cx="60" cy="57.3" r="1.2"/></g>
<path fill="none" ${line(2.2)} d="M28 53.5 L41 56 M68 53.5 L55 56"/>`,
  },
};

/** SVG markup of a badge sticker. `uid` keeps its ids apart from other stickers'. */
export function stickerSvg(id: string, uid = 's'): string {
  const d = DRAWINGS[id];
  if (!d) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 110">
<g opacity=".28" transform="translate(0 3)" fill="#000000" stroke="#000000" stroke-width="11" stroke-linejoin="round" stroke-linecap="round">${d.silhouette}</g>
<g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="11" stroke-linejoin="round" stroke-linecap="round">${d.silhouette}</g>
${d.art(uid)}
</svg>`;
}

/** Badge ids that have a drawing. */
export const STICKER_IDS = Object.keys(DRAWINGS);
