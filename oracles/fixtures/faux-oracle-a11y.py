"""faux-oracle-a11y.py — compagnon de faux-render-page.py (D-108 (b)) : rend PASS, sans rien juger.

run-oracles-design.mjs --rendu exige que oracle-a11y.py existe sous ~/.claude/skills/quality-oracles/ ;
la recette de la capture manquante n'a pas besoin du vrai.
"""
import json

print(json.dumps({"verdict": "PASS", "findings": [], "non_juge": []}))
