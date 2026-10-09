const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = __dirname;
const scriptDir = path.join(rootDir, 'script');

const files = [
  { file: 'S01_ouverture.md', act: 'OUVERTURE', title: 'Prise de service & L\'oncle Michel', role: 'Installation du monde' },
  { file: 'S02_acte1.md', act: 'ACTE I', title: 'Le Portrait de Poudlard', role: 'Évoquer — La rupture du rationnel' },
  { file: 'S03_acte2.md', act: 'ACTE II', title: 'La Routine Patronus', role: 'Tester — La démarche empirique' },
  { file: 'S04_acte3.md', act: 'ACTE III & ÉPILOGUE', title: 'La Pensine & Le Départ', role: 'Explorer — L\'impossible partagé' }
];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInline(text) {
  // Bold
  let res = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  res = res.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  res = res.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Footnote callout [^1] -> <sup class="fn-ref">[1]</sup>
  res = res.replace(/\[\^([^\]]+)\]/g, '<sup class="fn-ref">[$1]</sup>');
  return res;
}

function parseScriptMarkdown(content, meta) {
  // Supprimer l'archive v2 de S04 pour avoir un livret scénique propre
  const archiveIndex = content.indexOf('## 🗄️ Archive');
  if (archiveIndex !== -1) {
    content = content.substring(0, archiveIndex);
  }

  const lines = content.split(/\r?\n/);
  const elements = [];
  let i = 0;
  let inConventions = false;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Sauter le titre principal '# 🎬 Sxx'
    if (trimmed.startsWith('# 🎬')) {
      i++;
      continue;
    }

    // Sauter le sous-titre '*Texte dit + indications de jeu...*'
    if (trimmed.startsWith('*Texte dit') || trimmed.startsWith('* Texte dit')) {
      i++;
      continue;
    }

    // Sauter la section des conventions d'écriture
    if (trimmed.startsWith('### Conventions d\'écriture') || trimmed.startsWith('## Conventions')) {
      inConventions = true;
      i++;
      continue;
    }
    if (inConventions) {
      if (trimmed.startsWith('## ') || (trimmed.startsWith('---') && !lines[i + 1]?.trim().startsWith('-'))) {
        inConventions = false;
      } else {
        i++;
        continue;
      }
    }

    // Statut
    if (trimmed.startsWith('## Statut :')) {
      i++;
      continue;
    }

    // Séparateur horizontal
    if (trimmed === '---') {
      // Éviter les doubles hr consécutifs
      if (elements.length > 0 && elements[elements.length - 1].type !== 'hr') {
        elements.push({ type: 'hr' });
      }
      i++;
      continue;
    }

    // H2 Phase ou Section
    if (trimmed.startsWith('## ')) {
      const headingText = trimmed.replace(/^##\s+/, '');
      elements.push({ type: 'phase', text: headingText });
      i++;
      continue;
    }

    // H3 Sous-titre (Options Quidditch, etc.)
    if (trimmed.startsWith('### ')) {
      const subHeading = trimmed.replace(/^###\s+/, '');
      elements.push({ type: 'option-header', text: subHeading });
      i++;
      continue;
    }

    // Métadonnées d'option *(Page 187...)*
    if (trimmed.startsWith('*(') && trimmed.endsWith(')*')) {
      elements.push({ type: 'option-sub', text: trimmed.slice(1, -1) });
      i++;
      continue;
    }

    // Footnotes en bas de texte
    if (trimmed.startsWith('[^') && trimmed.includes(']:')) {
      const match = trimmed.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
      if (match) {
        elements.push({ type: 'footnote', id: match[1], text: match[2] });
      }
      i++;
      continue;
    }

    // Blocs code technique (autonomes ou dans une citation)
    if (trimmed.startsWith('```') || trimmed.startsWith('> ```')) {
      const codeLines = [];
      i++;
      while (i < lines.length) {
        const cLine = lines[i].trim();
        if (cLine.startsWith('```') || cLine.startsWith('> ```')) {
          i++;
          break;
        }
        let cleanLine = lines[i].replace(/^>\s?/, '');
        codeLines.push(cleanLine);
        i++;
      }
      elements.push({ type: 'technique', text: codeLines.join('\n') });
      continue;
    }

    // Blocs de citation (Didascalies)
    if (trimmed.startsWith('>')) {
      const didascalieLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        if (lines[i].trim().startsWith('> ```')) break;
        let clean = lines[i].replace(/^>\s?/, '').trim();
        clean = clean.replace(/^\*(.*)\*$/, '$1'); // enlever les astérisques enveloppantes
        if (clean.length > 0) {
          didascalieLines.push(clean);
        }
        i++;
      }
      if (didascalieLines.length > 0) {
        elements.push({ type: 'didascalie', text: didascalieLines.join(' ') });
      }
      continue;
    }

    // Dialogue / Texte dit
    if (trimmed.length > 0) {
      if (trimmed === '...') {
        elements.push({ type: 'pause' });
      } else {
        elements.push({ type: 'dialogue', text: trimmed });
      }
      i++;
      continue;
    }

    i++;
  }

  return { meta, elements };
}

function buildHtml() {
  const parsedActs = files.map(f => {
    const raw = fs.readFileSync(path.join(scriptDir, f.file), 'utf8');
    return parseScriptMarkdown(raw, f);
  });

  let actsHtml = '';

  parsedActs.forEach((act, actIdx) => {
    actsHtml += `
      <section class="act-container">
        <header class="act-header">
          <div class="act-badge-container">
            <span class="act-num">${act.meta.act}</span>
            <span class="act-role">${act.meta.role}</span>
          </div>
          <h1 class="act-title">${act.meta.title}</h1>
        </header>
        <div class="act-body">
    `;

    act.elements.forEach(el => {
      if (el.type === 'phase') {
        actsHtml += `<h2 class="phase-title">${formatInline(escapeHtml(el.text))}</h2>\n`;
      } else if (el.type === 'option-header') {
        actsHtml += `<h3 class="option-title">${formatInline(escapeHtml(el.text))}</h3>\n`;
      } else if (el.type === 'option-sub') {
        actsHtml += `<div class="option-meta">${formatInline(escapeHtml(el.text))}</div>\n`;
      } else if (el.type === 'didascalie') {
        actsHtml += `<div class="didascalie">${formatInline(escapeHtml(el.text))}</div>\n`;
      } else if (el.type === 'technique') {
        actsHtml += `
          <div class="technique-block">
            <div class="technique-label">⚙️ MANIPULATION TECHNIQUE &amp; SECRET</div>
            <pre class="technique-code">${escapeHtml(el.text)}</pre>
          </div>\n`;
      } else if (el.type === 'dialogue') {
        actsHtml += `<p class="dialogue">${formatInline(escapeHtml(el.text))}</p>\n`;
      } else if (el.type === 'pause') {
        actsHtml += `<div class="pause-symbol">⸻ <em>silence</em> ⸻</div>\n`;
      } else if (el.type === 'hr') {
        actsHtml += `<hr class="section-hr"/>\n`;
      } else if (el.type === 'footnote') {
        actsHtml += `<div class="footnote-item"><span class="fn-badge">[Note ${el.id}]</span> ${formatInline(escapeHtml(el.text))}</div>\n`;
      }
    });

    actsHtml += `
        </div>
      </section>
    `;
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>PATRONUS — Livret de Scène (Scripts Complets v2)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: "Page " counter(page);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8.5pt;
        color: #64748b;
      }
      @bottom-left {
        content: "PATRONUS — Livret de Scène (v2)";
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8.5pt;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 0;
    }

    /* Page de Garde */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 250mm;
      padding: 20mm 15mm;
      text-align: center;
      page-break-after: always;
    }

    .cover-top {
      margin-top: 25mm;
    }

    .cover-badge {
      display: inline-block;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 5px 16px;
      border-radius: 20px;
      margin-bottom: 20px;
    }

    .cover-title {
      font-family: 'Georgia', serif;
      font-size: 42pt;
      letter-spacing: 4px;
      margin: 0 0 10px 0;
      color: #0f172a;
      text-transform: uppercase;
    }

    .cover-subtitle {
      font-family: 'Georgia', serif;
      font-style: italic;
      font-size: 14.5pt;
      color: #475569;
      margin: 0 0 25px 0;
    }

    .cover-divider {
      width: 70px;
      height: 3px;
      background: #d97706;
      margin: 20px auto;
      border-radius: 2px;
    }

    .cover-meta {
      font-size: 10.5pt;
      color: #334155;
      line-height: 1.8;
      max-width: 520px;
      margin: 0 auto;
    }

    .cover-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px 24px;
      margin: 30px auto;
      max-width: 500px;
      text-align: left;
    }

    .summary-title {
      font-weight: 700;
      font-size: 9.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 9px;
      font-size: 9.5pt;
      color: #1e293b;
    }

    .summary-act {
      font-weight: 700;
      color: #0f172a;
      min-width: 140px;
    }

    .cover-footer {
      font-size: 8.5pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
    }

    /* Actes */
    .act-container {
      page-break-before: always;
      padding-top: 5mm;
    }

    .cover-page + .act-container {
      /* Le premier acte n'a pas besoin de double page break */
      page-break-before: avoid;
    }

    .act-header {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 18px;
      break-after: avoid;
    }

    .act-badge-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .act-num {
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #b45309;
    }

    .act-role {
      font-size: 9pt;
      font-style: italic;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .act-title {
      font-family: 'Georgia', serif;
      font-size: 20pt;
      color: #0f172a;
      margin: 2px 0 0 0;
    }

    /* Titres de Phase (étapes d'un acte) */
    .phase-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      text-align: right;
      background: #f8fafc;
      border-right: 3.5px solid #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding: 5px 12px;
      margin-top: 22px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      break-after: avoid;
      break-inside: avoid;
    }

    .option-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 16px;
      margin-bottom: 2px;
      break-after: avoid;
    }

    .option-meta {
      font-size: 8.5pt;
      font-style: italic;
      color: #64748b;
      margin-bottom: 8px;
    }

    /* Dialogues / Texte dit (très contrasté et lisible) */
    .dialogue {
      font-size: 11pt;
      font-weight: 600;
      color: #090d16;
      line-height: 1.5;
      margin: 6px 0 8px 0;
      break-inside: avoid;
    }

    /* Didascalies / Indications de jeu */
    .didascalie {
      font-style: italic;
      font-size: 9.5pt;
      color: #334155;
      background: #f8fafc;
      border-left: 3px solid #64748b;
      padding: 5px 12px;
      margin: 6px 0 8px 0;
      border-radius: 0 4px 4px 0;
      line-height: 1.45;
      break-inside: avoid;
    }

    .dida-indicator {
      font-style: normal;
      font-size: 7.5pt;
      color: #64748b;
      margin-right: 4px;
    }

    /* Technique secrète (bien mise en évidence pour le magicien) */
    .technique-block {
      background: #fffbeb;
      border: 1px dashed #d97706;
      border-left: 4px solid #b45309;
      border-radius: 4px;
      padding: 6px 12px;
      margin: 9px 0;
      break-inside: avoid;
    }

    .technique-label {
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #92400e;
      margin-bottom: 3px;
    }

    .technique-code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      color: #78350f;
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.35;
    }

    .pause-symbol {
      text-align: center;
      font-size: 8.5pt;
      color: #94a3b8;
      letter-spacing: 1px;
      margin: 8px 0;
      break-inside: avoid;
    }

    .section-hr {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 14px 0;
    }

    .footnote-item {
      font-size: 8.5pt;
      color: #475569;
      background: #f1f5f9;
      border-left: 2.5px solid #94a3b8;
      padding: 4px 8px;
      margin: 5px 0;
      border-radius: 0 3px 3px 0;
      break-inside: avoid;
    }

    .fn-badge {
      font-weight: 700;
      color: #1e293b;
    }

    .fn-ref {
      font-size: 7.5pt;
      color: #d97706;
      font-weight: bold;
    }

    .inline-code {
      font-family: 'Consolas', monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      color: #0f172a;
    }
  </style>
</head>
<body>

  <!-- Page de garde -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-badge">Spectacle de magie théâtrale & mentalisme</div>
      <h1 class="cover-title">PATRONUS</h1>
      <div class="cover-subtitle">Livret de jeu &amp; Scripts complets</div>
      <div class="cover-divider"></div>
      <div class="cover-meta">
        <strong>Seul en scène</strong> • Durée naturelle • Petite jauge (20 pers.)<br>
        Texte, mise en scène et conception : <strong>Julien DEROSES (MrJohule)</strong><br>
        Version 2 — Premier jet complet (Octobre 2026)
      </div>
    </div>

    <div class="cover-summary">
      <div class="summary-title">Structure du livret</div>
      <div class="summary-item">
        <span class="summary-act">Ouverture (S01)</span>
        <span>Prise de service &amp; L'oncle Michel</span>
      </div>
      <div class="summary-item">
        <span class="summary-act">Acte I (S02)</span>
        <span>Le Portrait de Poudlard (Le Cadre)</span>
      </div>
      <div class="summary-item">
        <span class="summary-act">Acte II (S03)</span>
        <span>Routine Patronus (Démarche empirique)</span>
      </div>
      <div class="summary-item">
        <span class="summary-act">Acte III &amp; Fin (S04)</span>
        <span>La Pensine, le Book-test &amp; Épilogue</span>
      </div>
    </div>

    <div class="cover-footer">
      Document de travail scénique — Réservé aux répétitions et au filage technique.
    </div>
  </div>

  <!-- Contenu des Actes -->
  ${actsHtml}

</body>
</html>
  `;

  const outputPath = path.join(rootDir, 'scripts_complets.html');
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  console.log(`Fichier HTML généré : ${outputPath}`);
  return outputPath;
}

const htmlFile = buildHtml();
const pdfFile = path.join(rootDir, 'PATRONUS_Scripts_Complets.pdf');

console.log('Compilation du PDF imprimable via Microsoft Edge Headless...');
try {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const args = [
    '--headless',
    '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    `--print-to-pdf=${pdfFile}`,
    '--no-pdf-header-footer',
    htmlFile
  ];
  
  execFileSync(edgePath, args, { stdio: 'inherit' });
  
  if (fs.existsSync(pdfFile)) {
    const stats = fs.statSync(pdfFile);
    console.log(`\n🎉 PDF généré avec succès : ${pdfFile} (${(stats.size / 1024).toFixed(1)} Ko)`);
  } else {
    console.error('Erreur : le fichier PDF n\'a pas été trouvé après l\'exécution.');
  }
} catch (e) {
  console.error('Erreur lors de la génération du PDF :', e);
}
