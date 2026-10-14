/**
 * Card icons, drawn in SVG (viewBox 0 0 100 100): one drawing per concept, shared
 * by every list that has it (a pizza is drawn once). Ideas hard to draw get an
 * object that stands for them (a walk: a hiking boot).
 */

const OL = '#2A1B14';
const line = (w = 2.4) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

type Icon = { silhouette: string; art: string };

export const CARD_ICONS: Record<string, Icon> = {
  croissant: {
    silhouette: `<path d="M8 64 C8 46 22 36 34 38 L50 26 L66 38 C78 36 92 46 92 64 C86 70 78 68 74 62 L50 66 L26 62 C22 68 14 70 8 64 Z"/>`,
    art: `
<path fill="#E9A24A" ${line()} d="M9 63 C10 52 18 44 28 44 C28 52 25 59 20 66 C15 69 10 67 9 63 Z"/>
<path fill="#E9A24A" ${line()} d="M91 63 C90 52 82 44 72 44 C72 52 75 59 80 66 C85 69 90 67 91 63 Z"/>
<path fill="#E39A40" ${line()} d="M22 50 C26 38 38 34 44 38 C44 50 40 60 32 66 C24 66 19 58 22 50 Z"/>
<path fill="#E39A40" ${line()} d="M78 50 C74 38 62 34 56 38 C56 50 60 60 68 66 C76 66 81 58 78 50 Z"/>
<path fill="#F0AE55" ${line()} d="M36 40 C36 28 64 28 64 40 C64 54 58 66 50 68 C42 66 36 54 36 40 Z"/>
<g fill="#C77A2A" opacity=".55"><path d="M50 68 C56 64 60 56 61 48 C58 56 54 62 50 64 Z"/><path d="M32 66 C38 62 41 55 42 48 C38 56 35 60 30 62 Z"/><path d="M68 66 C62 62 59 55 58 48 C62 56 65 60 70 62 Z"/></g>
<path fill="#FFD48C" opacity=".8" d="M42 36 C45 32 52 31 56 33 C51 33 46 35 43 39 Z"/>
<path fill="#FFD48C" opacity=".7" d="M27 45 C29 42 33 40 36 41 C33 42 30 44 28 48 Z"/>`,
  },
  'pain-au-chocolat': {
    silhouette: `<rect x="10" y="30" width="80" height="44" rx="16"/>`,
    art: `
<rect fill="#E8A44C" ${line()} x="12" y="32" width="76" height="40" rx="15"/>
<path fill="#D18936" d="M12 54 H88 V57 C88 65 82 72 73 72 H27 C18 72 12 65 12 57 Z"/>
<path fill="none" stroke="#B86E26" stroke-width="2" stroke-linecap="round" d="M22 46 C40 42 60 42 78 46 M20 58 C40 54 60 54 80 58"/>
<rect fill="#4A2A1A" ${line(1.8)} x="9" y="41" width="10" height="7" rx="2"/>
<rect fill="#4A2A1A" ${line(1.8)} x="9" y="55" width="10" height="7" rx="2"/>
<rect fill="#4A2A1A" ${line(1.8)} x="81" y="41" width="10" height="7" rx="2"/>
<rect fill="#4A2A1A" ${line(1.8)} x="81" y="55" width="10" height="7" rx="2"/>
<path fill="#FFD48C" opacity=".75" d="M24 37 C34 34 50 33 62 35 C50 36 36 38 26 41 Z"/>`,
  },
  bretzel: {
    silhouette: `<path fill="none" stroke-width="20" d="M28 76 C10 68 10 36 32 30 C48 26 58 42 50 56 C42 70 30 74 26 82 M72 76 C90 68 90 36 68 30 C52 26 42 42 50 56 C58 70 70 74 74 82 M24 80 H76"/>`,
    art: `
<path fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" d="M28 76 C10 68 10 36 32 30 C48 26 58 42 50 56 C42 70 30 74 26 82 M72 76 C90 68 90 36 68 30 C52 26 42 42 50 56 C58 70 70 74 74 82 M26 80 H74"/>
<path fill="none" stroke="#A85A26" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" d="M28 76 C10 68 10 36 32 30 C48 26 58 42 50 56 C42 70 30 74 26 82 M72 76 C90 68 90 36 68 30 C52 26 42 42 50 56 C58 70 70 74 74 82 M26 80 H74"/>
<path fill="none" stroke="#D08A4A" stroke-width="2.4" stroke-linecap="round" d="M18 52 C18 42 24 35 32 33 M82 52 C82 42 76 35 68 33"/>
<g fill="#FFFFFF"><rect x="20" y="44" width="3" height="2.4" rx=".8"/><rect x="30" y="31" width="3" height="2.4" rx=".8"/><rect x="66" y="31" width="3" height="2.4" rx=".8"/><rect x="78" y="46" width="3" height="2.4" rx=".8"/><rect x="48" y="49" width="3" height="2.4" rx=".8"/><rect x="40" y="78.5" width="3" height="2.4" rx=".8"/><rect x="58" y="78.5" width="3" height="2.4" rx=".8"/></g>`,
  },
  brioche: {
    silhouette: `<circle cx="50" cy="30" r="15"/><path d="M14 52 C14 40 86 40 86 52 L78 84 H22 Z"/>`,
    art: `
<path fill="#C9762E" ${line()} d="M16 54 L24 84 H76 L84 54 Z"/>
<path fill="none" stroke="#A85A26" stroke-width="2" stroke-linecap="round" d="M30 56 L34 82 M42 56 L44 82 M58 56 L56 82 M70 56 L66 82"/>
<path fill="#E59A42" ${line()} d="M12 54 C12 38 30 34 50 34 C70 34 88 38 88 54 C88 60 80 62 72 60 C66 62 58 62 50 60 C42 62 34 62 28 60 C20 62 12 60 12 54 Z"/>
<circle fill="#E59A42" ${line()} cx="50" cy="28" r="13"/>
<path fill="#FFD48C" opacity=".8" d="M42 22 C44 18 50 16 54 18 C49 19 46 21 44 25 Z M22 44 C28 40 38 38 46 38 C38 40 30 43 25 48 Z"/>
<g fill="#FFF3D6"><circle cx="34" cy="48" r="1"/><circle cx="62" cy="46" r="1"/><circle cx="72" cy="52" r="1"/></g>`,
  },
  'chausson-pommes': {
    silhouette: `<path d="M8 68 C8 30 92 30 92 68 Z"/>`,
    art: `
<path fill="#E6A24E" ${line()} d="M10 66 C10 32 90 32 90 66 Z"/>
<path fill="#D18936" d="M10 66 H90 C90 62 89 59 88 56 C72 60 28 60 12 56 C11 59 10 62 10 66 Z"/>
<path fill="none" stroke="${OL}" stroke-width="2.2" stroke-linecap="round" d="M14 66 C16 70 20 70 22 66 C24 70 28 70 30 66 C32 70 36 70 38 66 C40 70 44 70 46 66 C48 70 52 70 54 66 C56 70 60 70 62 66 C64 70 68 70 70 66 C72 70 76 70 78 66 C80 70 84 70 86 66"/>
<path fill="none" stroke="#8A4A1A" stroke-width="2.6" stroke-linecap="round" d="M34 46 L40 52 M46 42 L52 48 M58 44 L64 50"/>
<path fill="#FFE29A" d="M38 52 C40 50 42 51 41 54 Z"/>
<path fill="#FFD48C" opacity=".8" d="M24 46 C30 38 42 35 52 35 C42 38 32 42 27 50 Z"/>
<circle fill="#E8352B" ${line(1.8)} cx="74" cy="34" r="8"/><path fill="#3FA34D" ${line(1.4)} d="M74 26 C76 21 81 21 82 23 C80 26 77 27 74 26 Z"/>`,
  },
  'pain-raisins': {
    silhouette: `<circle cx="50" cy="52" r="38"/>`,
    art: `
<circle fill="#E7A650" ${line()} cx="50" cy="52" r="36"/>
<path fill="none" stroke="#B86E26" stroke-width="5" stroke-linecap="round" d="M50 52 C50 46 58 46 58 52 C58 60 44 62 42 52 C40 40 62 38 66 52 C70 68 40 72 34 54 C28 34 70 28 76 52"/>
<path fill="none" stroke="#F3C27A" stroke-width="1.6" stroke-linecap="round" d="M44 46 C48 42 56 42 60 46 M36 40 C44 34 60 34 68 42"/>
<g fill="#5B2A3A" ${line(1.2)}><ellipse cx="47" cy="58" rx="3" ry="2.4"/><ellipse cx="62" cy="58" rx="3" ry="2.4"/><ellipse cx="38" cy="46" rx="3" ry="2.4"/><ellipse cx="66" cy="40" rx="3" ry="2.4"/><ellipse cx="54" cy="68" rx="3" ry="2.4"/><ellipse cx="30" cy="60" rx="3" ry="2.4"/><ellipse cx="72" cy="62" rx="3" ry="2.4"/></g>
<path fill="#FFE2A8" opacity=".7" d="M24 40 C28 30 38 23 48 21 C40 26 32 33 28 42 Z"/>`,
  },
  bagel: {
    silhouette: `<ellipse cx="50" cy="54" rx="42" ry="34"/>`,
    art: `
<ellipse fill="#D48A3C" ${line()} cx="50" cy="56" rx="40" ry="31"/>
<ellipse fill="#E8A44C" ${line(2)} cx="50" cy="51" rx="38" ry="27"/>
<ellipse fill="#9C5A26" ${line(2)} cx="50" cy="52" rx="11" ry="7"/>
<path fill="#B86E26" d="M39 52 C41 47 59 47 61 52 C58 49 42 49 39 52 Z"/>
<g fill="#FFF3D6" stroke="#C47A2C" stroke-width=".6"><ellipse cx="30" cy="40" rx="2.2" ry="1.2" transform="rotate(-25 30 40)"/><ellipse cx="44" cy="33" rx="2.2" ry="1.2"/><ellipse cx="60" cy="34" rx="2.2" ry="1.2" transform="rotate(20 60 34)"/><ellipse cx="72" cy="42" rx="2.2" ry="1.2" transform="rotate(40 72 42)"/><ellipse cx="74" cy="58" rx="2.2" ry="1.2" transform="rotate(-30 74 58)"/><ellipse cx="26" cy="58" rx="2.2" ry="1.2" transform="rotate(30 26 58)"/><ellipse cx="38" cy="68" rx="2.2" ry="1.2"/><ellipse cx="62" cy="68" rx="2.2" ry="1.2" transform="rotate(15 62 68)"/></g>
<path fill="#FFD48C" opacity=".75" d="M22 46 C26 36 36 30 46 28 C38 32 30 38 26 48 Z"/>`,
  },
  gaufre: {
    silhouette: `<rect x="12" y="14" width="76" height="76" rx="14" transform="rotate(-8 50 52)"/>`,
    art: `
<g transform="rotate(-8 50 52)">
<rect fill="#E8A44C" ${line()} x="14" y="16" width="72" height="72" rx="12"/>
<g fill="#C9802E">${[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => `<rect x="${21 + c * 16}" y="${23 + r * 16}" width="10" height="10" rx="2.5"/>`)).join('')}</g>
<g fill="#F6C27A" opacity=".7">${[0, 1, 2, 3].map((c) => `<rect x="${21 + c * 16}" y="23" width="10" height="3" rx="1.5"/>`).join('')}</g>
<path fill="#FFE9A8" ${line(1.8)} d="M40 40 H58 C60 40 61 41 61 43 V55 C61 57 60 58 58 58 H40 C38 58 37 57 37 55 V43 C37 41 38 40 40 40 Z"/>
<path fill="#FFFFFF" opacity=".7" d="M40 43 H50 V45 H40 Z"/>
<path fill="#B5651D" opacity=".85" d="M61 52 C68 54 70 60 68 70 C67 74 64 74 63 70 C62 64 62 58 61 52 Z"/>
</g>`,
  },
  beignet: {
    silhouette: `<ellipse cx="50" cy="54" rx="40" ry="34"/>`,
    art: `
<ellipse fill="#E6A24E" ${line()} cx="50" cy="56" rx="38" ry="31"/>
<path fill="#C77A2A" d="M14 62 C20 78 36 86 50 86 C64 86 80 78 86 62 C78 74 64 80 50 80 C36 80 22 74 14 62 Z"/>
<path fill="#FFFFFF" opacity=".92" d="M18 48 C22 32 38 26 50 26 C64 26 78 32 82 46 C76 44 72 48 66 46 C60 50 54 46 48 49 C42 46 36 50 30 47 C26 49 22 46 18 48 Z"/>
<g fill="#FFFFFF"><circle cx="30" cy="54" r="1.2"/><circle cx="40" cy="58" r="1"/><circle cx="62" cy="56" r="1.2"/><circle cx="72" cy="52" r="1"/><circle cx="52" cy="60" r="1"/></g>
<path fill="#D9304A" ${line(1.8)} d="M74 60 C80 58 86 62 84 68 C80 70 74 66 74 60 Z"/>`,
  },
  pancake: {
    silhouette: `<ellipse cx="50" cy="70" rx="42" ry="16"/><rect x="10" y="38" width="80" height="34" rx="16"/><ellipse cx="50" cy="34" rx="22" ry="10"/>`,
    art: `
<ellipse fill="#E0E7EE" ${line()} cx="50" cy="76" rx="42" ry="10"/>
<g ${line(2.2)}>
<path fill="#E2A04C" d="M12 64 C12 56 88 56 88 64 V68 C88 76 12 76 12 68 Z"/>
<path fill="#E8A852" d="M14 54 C14 46 86 46 86 54 V58 C86 66 14 66 14 58 Z"/>
<path fill="#EEB25A" d="M16 44 C16 36 84 36 84 44 V48 C84 56 16 56 16 48 Z"/>
</g>
<ellipse fill="#F7C773" cx="50" cy="42" rx="32" ry="6"/>
<path fill="#B5651D" opacity=".9" d="M24 42 C30 36 70 36 76 42 C74 46 70 48 68 54 C66 58 63 58 62 54 C60 48 56 46 50 46 C44 46 40 48 38 54 C37 58 34 58 33 54 C31 48 26 46 24 42 Z"/>
<rect fill="#FFE9A8" ${line(1.8)} x="42" y="30" width="16" height="10" rx="2.5"/>
<path fill="#FFFFFF" opacity=".7" d="M44 32 H52 V34 H44 Z"/>`,
  },
  bed: {
    silhouette: `<rect x="6" y="28" width="14" height="60" rx="4"/><rect x="10" y="48" width="84" height="32" rx="6"/><path fill="none" stroke-width="12" d="M62 12 H72 L62 22 H72 M78 4 H86 L78 12 H86"/>`,
    art: `
<path fill="none" stroke="${OL}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" d="M62 12 H72 L62 22 H72 M78 4 H86 L78 12 H86"/>
<path fill="none" stroke="#9E8CFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M62 12 H72 L62 22 H72 M78 4 H86 L78 12 H86"/>
<g fill="#7A4520" ${line()}><rect x="12" y="76" width="6" height="12" rx="2"/><rect x="84" y="76" width="6" height="12" rx="2"/></g>
<rect fill="#A0612F" ${line()} x="8" y="66" width="86" height="12" rx="4"/>
<rect fill="#FFFFFF" ${line()} x="14" y="54" width="78" height="14" rx="5"/>
<rect fill="#B5733A" ${line()} x="6" y="28" width="14" height="52" rx="4"/>
<path fill="#D08A4A" d="M9 32 H12 V74 H9 Z"/>
<ellipse fill="#FFFFFF" ${line()} cx="31" cy="50" rx="11" ry="6.5"/>
<path fill="#5B8DEF" ${line()} d="M42 46 C56 42 80 42 92 48 V66 C92 68 91 69 89 69 H44 C42 62 40 54 42 46 Z"/>
<path fill="#3F6FD1" d="M44 64 C60 66 78 66 92 62 V66 C92 68 91 69 89 69 H44 Z"/>
<path fill="#FFFFFF" opacity=".35" d="M46 48 C58 45 74 45 86 48 C74 47 60 48 48 52 Z"/>
<path fill="#E9EEF5" ${line(1.8)} d="M42 46 C46 46 50 50 50 56 C46 52 42 50 40 49 Z"/>`,
  },
  'hiking-boot': {
    silhouette: `<path d="M24 12 H52 L56 50 C70 52 86 58 90 70 V86 H12 V72 C14 60 18 50 20 40 Z"/>`,
    art: `
<path fill="#3A3A44" ${line()} d="M12 76 H90 V86 C90 88 89 89 87 89 H15 C13 89 12 88 12 86 Z"/>
<path fill="none" stroke="#6A6A78" stroke-width="2" d="M18 83 H24 M30 83 H36 M42 83 H48 M54 83 H60 M66 83 H72 M78 83 H84"/>
<path fill="#A0612F" ${line()} d="M24 12 H52 L55 48 C70 50 86 56 90 70 V76 H12 V72 C14 60 18 50 21 40 Z"/>
<path fill="#7A4520" d="M55 48 C70 50 86 56 90 70 V76 H70 C70 64 64 56 55 52 Z"/>
<path fill="#E8352B" ${line(2)} d="M22 12 H54 V20 H22 Z"/>
<path fill="none" stroke="${OL}" stroke-width="1.6" d="M40 24 L52 30 M40 32 L53 38 M40 40 L54 46"/>
<g fill="#F2C14E" ${line(1.2)}><circle cx="38" cy="24" r="2"/><circle cx="38" cy="32" r="2"/><circle cx="38" cy="40" r="2"/></g>
<path fill="none" stroke="#C88A55" stroke-width="2" stroke-linecap="round" d="M26 28 C24 40 22 52 18 64"/>`,
  },
  clapperboard: {
    silhouette: `<rect x="12" y="34" width="76" height="52" rx="6"/><path d="M10 22 L84 10 L88 30 L14 40 Z"/>`,
    art: `
<rect fill="#2F3142" ${line()} x="12" y="36" width="76" height="50" rx="6"/>
<rect fill="#FFFFFF" ${line(2)} x="12" y="36" width="76" height="12"/>
<g fill="#2F3142"><path d="M22 36 H32 L26 48 H16 Z"/><path d="M42 36 H52 L46 48 H36 Z"/><path d="M62 36 H72 L66 48 H56 Z"/><path d="M82 36 H88 V44 L86 48 H76 Z"/></g>
<g transform="rotate(-10 14 36)">
<rect fill="#FFFFFF" ${line(2)} x="12" y="22" width="76" height="12"/>
<g fill="#2F3142"><path d="M20 22 H30 L24 34 H14 Z"/><path d="M40 22 H50 L44 34 H34 Z"/><path d="M60 22 H70 L64 34 H54 Z"/><path d="M80 22 H88 V28 L85 34 H74 Z"/></g>
</g>
<circle fill="#C9CED6" ${line(1.6)} cx="14" cy="36" r="3"/>
<path fill="none" stroke="#6A6E85" stroke-width="2" stroke-linecap="round" d="M22 60 H50 M22 70 H60 M22 78 H40"/>`,
  },
  gamepad: {
    silhouette: `<path d="M24 32 H76 C90 32 96 52 94 68 C92 82 80 86 72 76 L66 68 H34 L28 76 C20 86 8 82 6 68 C4 52 10 32 24 32 Z"/>`,
    art: `
<path fill="#5B5FD6" ${line()} d="M24 32 H76 C90 32 96 52 94 68 C92 82 80 86 72 76 L66 68 H34 L28 76 C20 86 8 82 6 68 C4 52 10 32 24 32 Z"/>
<path fill="#4448B8" d="M66 68 L72 76 C80 86 92 82 94 68 C90 76 82 78 76 72 L70 64 Z M34 68 L28 76 C20 86 8 82 6 68 C10 76 18 78 24 72 L30 64 Z"/>
<path fill="#FFFFFF" ${line(1.8)} d="M22 46 H28 V40 H34 V46 H40 V52 H34 V58 H28 V52 H22 Z"/>
<g ${line(1.6)}><circle fill="#FFD84A" cx="70" cy="42" r="4"/><circle fill="#7BE495" cx="78" cy="50" r="4"/><circle fill="#FF7F7F" cx="62" cy="50" r="4"/><circle fill="#7FB8FF" cx="70" cy="58" r="4"/></g>
<g fill="#2F3142"><rect x="44" y="46" width="5" height="3" rx="1.5"/><rect x="52" y="46" width="5" height="3" rx="1.5"/></g>
<path fill="#FFFFFF" opacity=".3" d="M22 36 H50 C40 37 30 38 18 42 C18 39 20 36 22 36 Z"/>`,
  },
  book: {
    silhouette: `<path d="M6 28 C22 22 40 24 50 32 C60 24 78 22 94 28 V82 C78 76 60 78 50 86 C40 78 22 76 6 82 Z"/>`,
    art: `
<path fill="#E8352B" ${line()} d="M6 30 C22 24 40 26 50 34 C60 26 78 24 94 30 V84 C78 78 60 80 50 88 C40 80 22 78 6 84 Z"/>
<path fill="#FFFFFF" ${line(2)} d="M10 28 C24 22 40 24 50 32 V82 C40 74 24 72 10 78 Z"/>
<path fill="#F4F1EA" ${line(2)} d="M90 28 C76 22 60 24 50 32 V82 C60 74 76 72 90 78 Z"/>
<path fill="none" stroke="#B9C2CF" stroke-width="1.8" stroke-linecap="round" d="M18 38 C26 35 34 36 42 40 M18 46 C26 43 34 44 42 48 M18 54 C26 51 34 52 42 56 M18 62 C26 59 32 60 38 63 M58 40 C66 36 74 35 82 38 M58 48 C66 44 74 43 82 46 M58 56 C66 52 74 51 82 54 M62 63 C68 60 76 59 82 62"/>
<path fill="#FFD84A" ${line(1.4)} d="M66 22 V40 L70 36 L74 40 V22 Z"/>`,
  },
  broom: {
    silhouette: `<path fill="none" stroke-width="16" d="M80 8 L46 54"/><path d="M40 46 L58 60 L40 92 C30 90 16 80 12 72 Z"/>`,
    art: `
<path fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round" d="M80 8 L48 52"/>
<path fill="none" stroke="#B5651D" stroke-width="5" stroke-linecap="round" d="M80 8 L48 52"/>
<path fill="#E8352B" ${line(2)} d="M40 46 L48 40 L60 50 L54 58 Z"/>
<path fill="#F2C14E" ${line()} d="M42 50 L56 60 C52 72 46 84 40 92 C30 90 18 82 12 72 C22 66 32 58 42 50 Z"/>
<path fill="none" stroke="#C9952E" stroke-width="1.8" stroke-linecap="round" d="M44 56 L28 84 M48 60 L36 88 M38 54 L20 76"/>
<path fill="#FFFFFF" opacity=".35" d="M44 54 C38 60 30 66 22 70 C28 64 36 58 42 52 Z"/>`,
  },
  cocotte: {
    silhouette: `<path d="M10 46 H90 V70 C90 82 80 88 68 88 H32 C20 88 10 82 10 70 Z"/><path d="M14 46 C14 30 86 30 86 46 Z"/><path fill="none" stroke-width="14" d="M34 24 C30 18 38 14 34 8 M50 24 C46 18 54 14 50 8 M66 24 C62 18 70 14 66 8"/>`,
    art: `
<path fill="none" stroke="${OL}" stroke-width="7" stroke-linecap="round" d="M34 24 C30 18 38 14 34 8 M50 24 C46 18 54 14 50 8 M66 24 C62 18 70 14 66 8"/>
<path fill="none" stroke="#E9EEF5" stroke-width="3.4" stroke-linecap="round" d="M34 24 C30 18 38 14 34 8 M50 24 C46 18 54 14 50 8 M66 24 C62 18 70 14 66 8"/>
<rect fill="#2F3142" ${line()} x="4" y="52" width="10" height="8" rx="3"/><rect fill="#2F3142" ${line()} x="86" y="52" width="10" height="8" rx="3"/>
<path fill="#E2452E" ${line()} d="M12 48 H88 V70 C88 81 79 87 68 87 H32 C21 87 12 81 12 70 Z"/>
<path fill="#B8331F" d="M78 48 H88 V70 C88 81 79 87 68 87 H62 C72 84 78 78 78 70 Z"/>
<path fill="#E2452E" ${line()} d="M14 48 C14 34 86 34 86 48 Z"/>
<rect fill="#2F3142" ${line(2)} x="42" y="30" width="16" height="7" rx="3"/>
<path fill="#FFFFFF" opacity=".35" d="M20 44 C26 38 40 36 52 36 C42 38 30 40 24 46 Z M18 56 C18 64 18 70 22 76 C18 72 16 64 16 56 Z"/>`,
  },
  dumbbell: {
    silhouette: `<rect x="6" y="28" width="22" height="46" rx="6"/><rect x="72" y="28" width="22" height="46" rx="6"/><rect x="24" y="44" width="52" height="14" rx="4"/>`,
    art: `
<rect fill="#C9CED6" ${line()} x="26" y="45" width="48" height="12" rx="4"/>
<path fill="none" stroke="#9AA3B2" stroke-width="1.6" d="M36 47 V55 M42 47 V55 M58 47 V55 M64 47 V55"/>
<g ${line()}><rect fill="#2F3142" x="8" y="30" width="12" height="42" rx="4"/><rect fill="#3E4157" x="18" y="36" width="10" height="30" rx="3"/><rect fill="#2F3142" x="80" y="30" width="12" height="42" rx="4"/><rect fill="#3E4157" x="72" y="36" width="10" height="30" rx="3"/></g>
<path fill="#FFFFFF" opacity=".3" d="M10 34 H13 V66 H10 Z M82 34 H85 V66 H82 Z"/>`,
  },
  duck: {
    silhouette: `<circle cx="38" cy="34" r="22"/><path d="M8 62 C8 46 26 46 40 52 C56 42 92 42 92 62 C92 82 74 90 50 90 C24 90 8 80 8 62 Z"/><path d="M52 32 L74 30 L62 42 Z"/>`,
    art: `
<path fill="#FFD23F" ${line()} d="M10 62 C10 48 26 48 40 54 C56 44 90 44 90 62 C90 80 74 88 50 88 C26 88 10 80 10 62 Z"/>
<path fill="#F2B21C" d="M14 70 C22 80 36 84 50 84 C66 84 80 80 88 66 C86 80 72 88 50 88 C30 88 16 82 14 70 Z"/>
<path fill="#F2B21C" ${line(2)} d="M50 60 C58 56 70 56 76 62 C70 68 58 70 50 66 Z"/>
<circle fill="#FFD23F" ${line()} cx="38" cy="34" r="20"/>
<path fill="#FF8A2B" ${line(2)} d="M54 30 C62 28 72 28 74 32 C72 38 62 40 54 38 Z"/>
<path fill="none" stroke="${OL}" stroke-width="1.6" d="M56 34 H70"/>
<circle fill="${OL}" cx="42" cy="28" r="3.2"/><circle fill="#FFFFFF" cx="43.2" cy="26.8" r="1.1"/>
<ellipse fill="#FF8A7A" opacity=".55" cx="32" cy="40" rx="4.5" ry="2.8"/>
<path fill="#FFF3B0" opacity=".8" d="M24 24 C28 18 36 15 42 16 C36 18 30 22 27 28 Z"/>
<g fill="#FFFFFF" stroke="#9FD3F2" stroke-width="1.4"><circle cx="16" cy="88" r="5"/><circle cx="84" cy="90" r="4"/><circle cx="92" cy="82" r="3"/></g>`,
  },
};

/** Card label → icon concept, for the lists drawn so far (one icon reused by several cards). */
export const CARD_ICON_FOR: Record<string, string> = {
  croissant: 'croissant',
  'pain au chocolat': 'pain-au-chocolat',
  bretzel: 'bretzel',
  brioche: 'brioche',
  'chausson aux pommes': 'chausson-pommes',
  'pain aux raisins': 'pain-raisins',
  bagel: 'bagel',
  gaufre: 'gaufre',
  beignet: 'beignet',
  pancake: 'pancake',
  'grasse matinée': 'bed',
  dormir: 'bed',
  sieste: 'bed',
  brunch: 'croissant',
  balade: 'hiking-boot',
  film: 'clapperboard',
  'jeux vidéo': 'gamepad',
  lecture: 'book',
  ménage: 'broom',
  'repas de famille': 'cocotte',
  sport: 'dumbbell',
  bain: 'duck',
};

/** Icon of a card from its label (emoji and case ignored), if one is drawn. */
export function cardIconFor(label: string): string | undefined {
  return CARD_ICON_FOR[label.trim().toLowerCase()];
}

/** SVG markup of a card icon: the drawing with a soft shadow under it. */
export function cardIconSvg(id: string): string {
  const icon = CARD_ICONS[id];
  if (!icon) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 104 106">
<g opacity=".22" transform="translate(0 3)" fill="#000000" stroke="#000000" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${icon.silhouette}</g>
${icon.art}
</svg>`;
}
