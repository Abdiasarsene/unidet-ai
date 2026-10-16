# Assistant UNIDET — Interface de chat

Interface web de l'assistant IA d'UNIDET : aide aux utilisateurs et accompagnement sur le recouvrement de créances et le rachat de dettes. Site qui dialogue avec une API hébergée sur Railway.

## Fonctionnalités

- Conversation en texte, avec suggestions de questions sur l'écran d'accueil
- **Dictée vocale** : le micro transcrit la question dans la zone de texte, relue avant envoi
- **Lecture vocale** des réponses (bouton « Écouter » par message, ou lecture automatique)
- Affichage adapté au mobile, à la tablette et à l'ordinateur
- Gestion des erreurs réseau et des délais dépassés
- Réponses affichées en toute sécurité (le HTML reçu est échappé)

## Configuration

Les couleurs de la charte sont des variables en tête de `style.css` (`--gold: #c1a56f`, `--navy: #242e3d`).

## Contrat avec l'API

L'interface envoie :

```
POST {API_URL}{ENDPOINT}
Content-Type: application/json

{ "message": "Quels sont vos frais ?", "session_id": "3e2a57f6-..." }
```

Elle attend une réponse JSON contenant le texte sous l'une des clés `answer`, `response`, `reply` ou `message` :

```json
{ "answer": "Chez UNIDET, **aucun frais à l'avance**..." }
```

Le texte peut contenir du **gras** (`**mot**`), des listes (`- élément`) et des retours à la ligne. `session_id` est généré par le navigateur et change à chaque « nouvelle conversation ».

### CORS (obligatoire)

L'API Railway doit autoriser le domaine Vercel, sinon le navigateur bloque les requêtes. Exemple avec FastAPI :

## Déploiement sur Vercel

1. Placer le dossier dans un dépôt Git (GitHub, GitLab ou Bitbucket).
2. Sur Vercel : **Add New → Project**, importer le dépôt.
3. Framework Preset : **Other**. Aucune commande de build, dossier de sortie : la racine.
4. Déployer. Vercel fournit le HTTPS, nécessaire au micro.

## Compatibilité

| Fonction | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| Conversation | oui | oui | oui |
| Lecture vocale | oui | oui | oui |
| Dictée vocale | oui | oui | non |

La dictée utilise la reconnaissance vocale du navigateur. Sur Firefox, un message invite à utiliser un autre navigateur. La qualité des voix de lecture dépend de l'appareil.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| « Impossible de joindre l'assistant » | `API_URL` incorrecte, API arrêtée, ou CORS non configuré (voir la console du navigateur) |
| Le micro ne démarre pas | Page en HTTP (HTTPS requis), ou accès au micro refusé dans le navigateur |
| Aucune voix de lecture | Aucune voix française installée sur l'appareil |
| Réponse vide | L'API ne renvoie aucune des clés `answer`, `response`, `reply`, `message` |

## Pistes d'évolution

- Affichage des réponses au fil de l'eau (streaming)
- Enregistrement audio envoyé à l'API pour une transcription côté serveur (compatible avec tous les navigateurs)
- Affichage des sources utilisées par l'assistant sous chaque réponse
- Retour utilisateur (👍 / 👎) sur chaque réponse
