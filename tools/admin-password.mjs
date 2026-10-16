/**
 * Génère la configuration d'un compte de l'espace d'édition :
 *
 *   npm run admin:password -- sandrine
 *
 * Demande le mot de passe (non affiché), puis affiche les lignes à ajouter aux
 * variables d'environnement (Vercel → Settings → Environment Variables, ou
 * .env.local en local). La page /admin/connexion/ fait la même chose dans le
 * navigateur tant que l'espace n'est pas configuré.
 */
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

import { hashPassword } from '../lib/admin/auth.js';

const MIN_LENGTH = 12;
const username = process.argv[2];

if (!/^[a-z0-9-]+$/.test(username ?? '')) {
  console.error(
    'Usage : npm run admin:password -- <identifiant>   (minuscules, chiffres et tirets)',
  );
  process.exit(1);
}

/** Lit une ligne sans l'afficher. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = await askHidden(
  `Mot de passe pour « ${username} » (${MIN_LENGTH} caractères minimum) : `,
);
if (password.length < MIN_LENGTH) {
  console.error(`Mot de passe trop court (${MIN_LENGTH} caractères minimum).`);
  process.exit(1);
}

console.log('\nVariables à ajouter (une virgule sépare plusieurs comptes dans ADMIN_USERS) :\n');
console.log(`ADMIN_USERS=${username}:${await hashPassword(password)}`);
console.log(
  `ADMIN_SECRET=${randomBytes(36).toString('base64url')}   # une seule fois, commune à tous les comptes`,
);
