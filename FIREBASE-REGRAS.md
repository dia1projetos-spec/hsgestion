# ⚙️ Regras do Firebase — Configure isso no Console

## 1. Firestore Rules
Acesse: Firebase Console → Firestore Database → Rules

Cole e publique estas regras:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Posts: leitura pública, escrita só admin
    match /posts/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Slides: leitura pública, escrita só admin
    match /slides/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Menu: leitura pública, escrita só admin
    match /menu/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Contacts: qualquer um pode criar, só admin lê
    match /contacts/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Users: só admin gerencia, usuário lê o próprio
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || request.auth.token.email == 'riconetson@gmail.com');
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }
  }
}
```

---

## 2. Storage Rules
Acesse: Firebase Console → Storage → Rules

Cole e publique estas regras:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == 'riconetson@gmail.com'
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    match /post-images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == 'riconetson@gmail.com'
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 3. Habilitar Firebase Storage
Se nunca usou Storage no projeto:
1. Firebase Console → Storage → Get Started
2. Escolha localização (us-east1 recomendado)
3. Clique Next até finalizar
4. Cole as regras acima

---

## 4. Verificar Authentication
1. Firebase Console → Authentication → Sign-in method
2. Confirme que "Email/Password" está HABILITADO

