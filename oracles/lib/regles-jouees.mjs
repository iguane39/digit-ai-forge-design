// regles-jouees — la plage de règles qu'un oracle CITE dans son message dérive de la liste qu'il JOUE.
// TF-2287 (09/11/2026), même geste que TF-2250 (oracle-exploitabilite, 06/11/2026).
//
// LE FAIT. Un oracle qui écrit « T4-1…T4-4 sans écart » ou « M1–M8 sans écart » cite en dur une plage qu'il ne
// recalcule jamais : la règle ajoutée après coup (M9 à M11, R8 à R14, SA8, SC5…) n'y figure pas, et la plage dit un
// périmètre plus étroit que celui joué. Ici, chaque oracle déclare UNE fois `REGLES_JOUEES`, en tire sa plage par
// `plageDeRegles`, et un verrou (`self-test-regles-jouees.mjs`, et le --self-test d'oracle-textes-application) refuse
// une liste qui s'écarte des règles que le fichier émet (`add('sév', 'Xn', …)` ou `regle: 'Xn'`).
//
// HORS PLAGE. Une règle émise que le message ne cite pas (porte de la cible ou de l'appel : B0, D0, DE0, T0 ; voie
// d'approbation : B3) se déclare dans `REGLES_HORS_PLAGE`. Toute règle émise figure à l'une des deux listes : aucune
// n'échappe au verrou par omission.
//
// SOUS-PLAGES. Un message « sans objet » qui ne cite qu'une PARTIE des règles (images : I1–I2, I5–I6 quand aucune image n'existe ;
// surcouche : SC1–SC3 et SC5 quand aucun composant n'existe ; panneau-tache : PA1–PA6 quand aucun panneau n'existe) en dérive
// sa plage d'une seconde liste, `const REGLES_SANS_OBJET_<CAS> = [ … ];`, déclarée à côté de REGLES_JOUEES (TF-2293). Le verrou
// refuse une règle de sous-liste que REGLES_JOUEES ne contient pas : la sous-plage ne cite jamais une règle que l'oracle ne joue plus.

// Découpe un identifiant en préfixe et numéro : « EF3 » → ['EF', 3], « T4-2 » → ['T4-', 2], « B-T1 » → ['B-T', 1].
function decouper(regle) {
  const m = /^(.*?)(\d+)$/.exec(regle);
  return m ? [m[1], Number(m[2])] : [regle, null];
}

// Suites consécutives d'un même préfixe en plages, séparées par une virgule : [X1,X2,X3,X5] → « X1–X3, X5 ».
// `sep` est le trait d'union de plage propre à l'oracle (« – » par défaut, « … » pour T4-1…T4-4).
export function plageDeRegles(regles, sep = '–') {
  const parPrefixe = new Map();
  for (const r of regles) {
    const [prefixe, n] = decouper(r);
    if (!parPrefixe.has(prefixe)) parPrefixe.set(prefixe, []);
    parPrefixe.get(prefixe).push(n);
  }
  const morceaux = [];
  for (const [prefixe, nombres] of parPrefixe) {
    const tries = [...new Set(nombres)].sort((a, b) => a - b);
    const suites = [];
    for (const k of tries) {
      const derniere = suites[suites.length - 1];
      if (derniere && k === derniere[derniere.length - 1] + 1) derniere.push(k); else suites.push([k]);
    }
    for (const s of suites)
      morceaux.push(s.length === 1 ? `${prefixe}${s[0]}` : `${prefixe}${s[0]}${sep}${prefixe}${s[s.length - 1]}`);
  }
  return morceaux.join(', ');
}

const ordre = (a, b) => {
  const [pa, na] = decouper(a), [pb, nb] = decouper(b);
  return pa === pb ? na - nb : (pa < pb ? -1 : 1);
};

// Les règles qu'un fichier source ÉMET : `add('bloquant', 'Xn', …)` ou `regle: 'Xn'`.
export function reglesEmises(src) {
  const vues = new Set();
  for (const m of src.matchAll(/\badd\(\s*['"][a-zé]+['"]\s*,\s*['"`]([A-Z][A-Za-z0-9\-]*\d+)['"`]/g)) vues.add(m[1]);
  for (const m of src.matchAll(/\bregle:\s*['"`]([A-Z][A-Za-z0-9\-]*\d+)['"`]/g)) vues.add(m[1]);
  return [...vues].sort(ordre);
}

// La liste `const <nom> = [ 'Xn', … ];` d'un fichier source (vide si absente).
function listeDeclaree(src, nom) {
  const bloc = new RegExp(`const ${nom} = \\[([^\\]]*)\\]`).exec(src);
  return bloc ? [...bloc[1].matchAll(/['"]([A-Z][A-Za-z0-9\-]*\d+)['"]/g)].map(m => m[1]) : [];
}
export const reglesDeclarees = src => listeDeclaree(src, 'REGLES_JOUEES');
// Les règles émises que le message ne cite pas, déclarées à part et motivées au fichier (porte d'appel, voie d'approbation…).
export const reglesHorsPlage = src => listeDeclaree(src, 'REGLES_HORS_PLAGE');
// Les sous-listes d'un message « sans objet » : { REGLES_SANS_OBJET_<CAS>: ['Xn', …] } (vide si le fichier n'en déclare pas).
export function sousListesSansObjet(src) {
  const noms = [...src.matchAll(/const (REGLES_SANS_OBJET\w*) = \[/g)].map(m => m[1]);
  return Object.fromEntries(noms.map(nom => [nom, listeDeclaree(src, nom)]));
}

// L'écart entre les listes déclarées et les règles émises. Vide partout = verrou tenu :
// toute règle émise figure à REGLES_JOUEES ou à REGLES_HORS_PLAGE, aucune règle déclarée n'est absente du fichier,
// et toute règle d'une sous-liste « sans objet » figure à REGLES_JOUEES.
export function ecartDeListe(src) {
  const emises = reglesEmises(src), jouees = reglesDeclarees(src), hors = reglesHorsPlage(src);
  return {
    emises_non_declarees: emises.filter(r => !jouees.includes(r) && !hors.includes(r)),
    declarees_non_emises: [...jouees, ...hors].filter(r => !emises.includes(r)),
    en_double: jouees.filter(r => hors.includes(r)),
    sous_liste_hors_jouees: Object.entries(sousListesSansObjet(src)).flatMap(([nom, l]) => l.filter(r => !jouees.includes(r)).map(r => `${nom}:${r}`)),
  };
}
