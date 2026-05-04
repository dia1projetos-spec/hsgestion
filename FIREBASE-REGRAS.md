# ⚙️ PASSO OBRIGATÓRIO — Regras do Firestore

## ⚠️ POR QUE OS ARTIGOS E SLIDES NÃO APARECEM?
O Firebase Firestore por padrão **bloqueia toda leitura pública**.
Isso faz com que o blog e os slides não carreguem na home.
Você precisa configurar as regras abaixo UMA ÚNICA VEZ.

---

## 1. Firestore Rules (OBRIGATÓRIO)
1. Acesse https://console.firebase.google.com
2. Selecione o projeto **hs-gestion-a102e**
3. Menu esquerdo → **Firestore Database** → aba **Rules**
4. Substitua TODO o conteúdo pelas regras abaixo
5. Clique **Publish**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Posts: LEITURA PÚBLICA (blog visível para todos)
    match /posts/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Slides: LEITURA PÚBLICA (header visível para todos)
    match /slides/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Menu: LEITURA PÚBLICA (menu visível para todos)
    match /menu/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Contacts: qualquer visitante pode enviar consulta
    match /contacts/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }

    // Users: só admin gerencia
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || request.auth.token.email == 'riconetson@gmail.com');
      allow write: if request.auth != null && request.auth.token.email == 'riconetson@gmail.com';
    }
  }
}
```

---

## 2. Authentication (verificar)
1. Firebase Console → **Authentication** → **Sign-in method**
2. Confirme que **Email/Password** está HABILITADO

---

Após publicar as regras, atualize a página e os artigos e slides aparecem.
