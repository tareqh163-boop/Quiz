# Trivia Duel ⚡

A lightweight 1v1 multiplayer trivia game for two friends.

## Features

- Private 6-character room codes
- Real-time multiplayer with Firebase Realtime Database
- English / Arabic interface
- 6 categories
- Difficulty selection
- Best-of-3 rounds
- 5 questions per round
- 15-second question timer
- Speed bonus scoring
- Answer streaks
- Round wins + final winner
- Rematches
- Responsive mobile design
- Static site: easy to deploy to GitHub Pages, Netlify, Vercel, or Firebase Hosting

## 1. Create Firebase project

1. Go to Firebase Console.
2. Create a project.
3. Add a Web App.
4. Open **Realtime Database** and create a database.
5. Copy your Firebase web config.
6. Open `firebase-config.js` and replace the placeholder values.

## 2. Realtime Database rules

For a private prototype between friends, use:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

These rules are intentionally permissive for an MVP. Before making the app public, add Firebase Authentication and stricter validation rules.

## 3. Test locally

Because the app uses JavaScript modules, serve the folder with a local web server.

### Python

```bash
python -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

## 4. Upload to GitHub

Create a new GitHub repository and upload all files in this folder.

The required public files are:

- `index.html`
- `styles.css`
- `app.js`
- `questions.js`
- `firebase-config.js`

## 5. Enable GitHub Pages

In your GitHub repository:

1. Open **Settings**
2. Open **Pages**
3. Under **Build and deployment**, choose **Deploy from a branch**
4. Select your `main` branch and `/ (root)`
5. Save

GitHub will provide the public URL.

## Notes

The Firebase config used by browser apps is not treated like a server secret. Your actual security comes from Firebase Authentication and database security rules. The included database rules are for personal/private testing only.
