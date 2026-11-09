// Script externe de la fixture : il pose un marqueur sur le document et cite une balise fermante dans une chaîne,
// que l'intégration doit protéger pour ne pas fermer le <script> en cours.
document.documentElement.setAttribute('data-pret', '1');
var fermeture = '</script>';
