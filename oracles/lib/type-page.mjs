// lib/type-page.mjs — UNE PAGE D'APPLICATION SANS INSTANCE SERVIE N'EST PAS UN PASS (TF-2121, 04/11/2026).
//
// LE FAIT (lot Produit-86 du 03/11/2026). Dix pages d'application avaient passé la critique
// d'implémentation : PASS, sans aide de champ ni filtre. Jouée ensuite sur l'instance servie,
// oracle-exploitabilite trouvait deux défauts. Le point d'entrée avait pourtant DIT, à voix basse,
// « oracle-exploitabilite : SANS OBJET — aucune instance alimentée fournie » : une ligne du
// non_juge, que le verdict PASS ne portait pas. Un contrôle jamais joué se lisait donc « vert ».
//
// LE REMÈDE. Pour une page d'APPLICATION, l'absence d'instance servie n'est plus « sans objet » :
// c'est un échec dit (X7), qui tombe tant que l'instance n'est pas fournie ou que la page n'est pas
// déclarée maquette. Pour une page ÉDITORIALE (étude, fiche, rapport, page de vente), le comportement
// d'avant reste : SANS OBJET, verdict inchangé.
//
// COMMENT UNE PAGE EST CLASSÉE — critère mesurable, trois sources, la plus forte l'emporte :
//   1. l'appel      : --type-page application | editoriale
//   2. la page      : <meta name="forge-type-page" content="application|editoriale">
//                     ou data-type-page="application|editoriale" sur un élément (html, body…)
//   3. la structure : un marqueur d'écran de travail que l'oracle lit déjà ailleurs — un panneau de
//                     création (data-panneau-tache, data-branche) ou une action nommée par une
//                     exigence (data-exigence). Un tableau filtrable ou un champ de recherche NE
//                     classent PAS : les pages d'étude du pilot en portent et sont éditoriales.
// Sans aucune des trois, la page n'est pas classée « application » ; si elle porte pourtant un champ
// de saisie ET un tableau, elle est dite « application probable » (non_juge), jamais échouée.

const NOMS_APPLICATION = new Set(['application', 'app']);
const NOMS_EDITORIAL = new Set(['editoriale', 'editorial', 'éditoriale', 'éditorial']);

/** Retire les commentaires HTML : un marqueur cité dans un commentaire ne classe rien. */
const sansCommentaires = html => String(html || '').replace(/<!--[\s\S]*?-->/g, '');

function classer(valeur) {
  const v = String(valeur || '').trim().toLowerCase();
  if (NOMS_APPLICATION.has(v)) return 'application';
  if (NOMS_EDITORIAL.has(v)) return 'editoriale';
  return null;
}

/** La déclaration portée par la page : meta puis attribut data-type-page. `null` si aucune. */
export function declarationDeLaPage(html) {
  const doc = sansCommentaires(html);
  const meta = /<meta\b[^>]*\bname\s*=\s*["']forge-type-page["'][^>]*>/i.exec(doc);
  if (meta) {
    const c = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(meta[0]);
    const t = classer(c && c[1]);
    if (t) return t;
  }
  const attr = /\bdata-type-page\s*=\s*["']([^"']*)["']/i.exec(doc);
  return attr ? classer(attr[1]) : null;
}

/** Vrai si la page porte un marqueur structurel d'écran de travail (voir l'en-tête). */
export function marqueurStructurel(html) {
  return /\bdata-panneau-tache\b|\bdata-branche\s*=|\bdata-exigence\s*=/i.test(sansCommentaires(html));
}

/** Champ de saisie (hors caché, bouton, recherche) ET tableau : la page ressemble à un écran de travail. */
export function ressembleAUneApplication(html) {
  const doc = sansCommentaires(html);
  const champ = [...doc.matchAll(/<input\b[^>]*>/gi)].some(m => !/\btype\s*=\s*["']?(hidden|button|submit|reset|search|image)\b/i.test(m[0]))
    || /<textarea\b|<select\b/i.test(doc);
  return champ && /<table\b/i.test(doc);
}

/**
 * Classe la page. Rend { type: 'application' | 'editoriale' | 'non_classee', source, probable }.
 * `args` est la ligne de commande du point d'entrée (la valeur de --type-page est lue ici).
 */
export function typerPage(html, args = []) {
  const i = args.indexOf('--type-page');
  if (i !== -1) {
    const t = classer(args[i + 1]);
    if (t) return { type: t, source: 'appel (--type-page)', probable: false };
    return { type: 'non_classee', source: null, probable: false, valeur_inconnue: String(args[i + 1] ?? '') };
  }
  const declare = declarationDeLaPage(html);
  if (declare) return { type: declare, source: 'déclaration de la page', probable: false };
  if (marqueurStructurel(html)) return { type: 'application', source: 'structure (data-panneau-tache, data-branche ou data-exigence)', probable: false };
  return { type: 'non_classee', source: null, probable: ressembleAUneApplication(html) };
}
