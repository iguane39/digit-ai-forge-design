#!/usr/bin/env node
// serveur-recette-verification — le petit serveur local de la recette de la vérification au champ (TF-2307).
//
// Il sert, depuis un dossier, les pages de la recette d'oracle-erreurs-formulaire sur 127.0.0.1, et répond aux POST :
// toute adresse dont le dernier segment est `verifier` rend un refus JSON qui reprend la saisie ; toute autre écriture
// rend {ok:true}. CHAQUE POST reçu est ajouté au journal (une ligne « POST /chemin ») : c'est ce journal que la recette
// relit pour prouver qu'une écriture interceptée n'est jamais arrivée jusqu'au serveur.
//
// Usage : node serveur-recette-verification.mjs <dossier> <port> <journal>      (127.0.0.1 seulement, rien d'externe)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [dossier, port, journal] = process.argv.slice(2);
if (!dossier || !port || !journal) { process.stderr.write('usage : serveur-recette-verification.mjs <dossier> <port> <journal>\n'); process.exit(2); }

http.createServer((req, res) => {
  const chemin = decodeURIComponent((req.url || '/').split('?')[0]);
  if (req.method === 'POST') {
    fs.appendFileSync(journal, `POST ${chemin}\n`);
    let corps = '';
    req.on('data', d => { corps += d; });
    req.on('end', () => {
      let valeur = '';
      try { valeur = String(JSON.parse(corps || '{}').valeur ?? ''); } catch { /* corps illisible : valeur vide */ }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      if (chemin.replace(/\/+$/, '').split('/').pop() === 'verifier') {
        res.end(JSON.stringify({ ok: false, message: `« ${valeur} » n'est pas un domaine connu. Forme attendue : costcontrol.client.fr.` }));
      } else {
        res.end(JSON.stringify({ ok: true }));
      }
    });
    return;
  }
  fs.readFile(path.join(dossier, path.basename(chemin)), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(d);
  });
}).listen(Number(port), '127.0.0.1');
