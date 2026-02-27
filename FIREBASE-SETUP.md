# 🔥 GUIA COMPLETO – CONFIGURAÇÃO FIREBASE
## HS Gestión – Sistema Admin + Usuários

---

## PASSO 1 – Criar projeto no Firebase

1. Acesse: https://console.firebase.google.com
2. Clique em **"Adicionar projeto"**
3. Nome do projeto: `hs-gestion` (ou o que preferir)
4. Desative o Google Analytics (opcional)
5. Clique em **"Criar projeto"**

---

## PASSO 2 – Ativar Authentication

1. No menu lateral, clique em **Authentication**
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, ative:
   - ✅ **E-mail/senha** → clique → ative a primeira opção → Salvar

### Criar conta do ADMINISTRADOR:
1. Vá em **Authentication → Usuários → Adicionar usuário**
2. Email: `admin@hsgestion.com.ar` (ou o que você definiu)
3. Senha: crie uma senha forte
4. Clique em **Adicionar usuário**

### Criar conta de cada CLIENTE:
Repita o processo acima para cada cliente que você criar pelo painel admin.
- O email deve ser exatamente o mesmo que você colocou ao criar o usuário no painel.

---

## PASSO 3 – Configurar Firestore (banco de dados)

1. No menu lateral, clique em **Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Começar no modo de produção"**
4. Escolha a região: `southamerica-east1` (São Paulo – mais próximo da Argentina)
5. Clique em **"Ativar"**

### Configurar Regras de Segurança do Firestore:
1. Vá em **Firestore → Regras**
2. Cole as regras abaixo e clique em **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
  
    // Coleção de usuários
    match /users/{userId} {
      // Admin pode ler e escrever tudo
      allow read, write: if request.auth != null && 
        request.auth.token.email == 'admin@hsgestion.com.ar';
      // Usuário só lê seu próprio perfil
      allow read: if request.auth != null && 
        resource.data.email == request.auth.token.email;
    }
    
    // Mensagens
    match /messages/{msgId} {
      // Admin pode tudo
      allow read, write: if request.auth != null && 
        request.auth.token.email == 'admin@hsgestion.com.ar';
      // Usuário lê mensagens para ele ou para todos
      allow read: if request.auth != null && (
        resource.data.userId == 'all' || 
        resource.data.userId == request.auth.uid
      );
    }
    
    // Pack Assignments
    match /packAssignments/{docId} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == 'admin@hsgestion.com.ar';
      allow read: if request.auth != null;
    }
  }
}
```

⚠️ **IMPORTANTE:** Troque `admin@hsgestion.com.ar` pelo seu email de admin real nas regras acima.

---

## PASSO 4 – Ativar Storage (para logos dos usuários)

1. No menu lateral, clique em **Storage**
2. Clique em **"Começar"**
3. Modo de produção → Próximo → Escolha a mesma região → Concluir

### Regras de Storage:
1. Vá em **Storage → Regras**
2. Cole:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /logos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.email == 'admin@hsgestion.com.ar';
    }
  }
}
```

---

## PASSO 5 – Obter as credenciais do projeto

1. No Firebase Console, clique na **engrenagem ⚙️** → **Configurações do projeto**
2. Role até **"Seus aplicativos"**
3. Clique em **"</> Web"** (adicionar app web)
4. Nome do app: `hs-gestion-web`
5. Clique em **"Registrar app"**
6. Firebase vai mostrar o `firebaseConfig` – **copie ele todo!**

---

## PASSO 6 – Colar as credenciais no código

Você precisa substituir `COLE_SUA_API_KEY_AQUI` etc. em **3 arquivos**:

### Arquivo 1: `admin/js/admin.js`
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",         // ← seu valor real
  authDomain: "hs-gestion.firebaseapp.com",
  projectId: "hs-gestion",
  storageBucket: "hs-gestion.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc..."
};
```

### Arquivo 2: `usuarios/js/user.js`
Mesmo firebaseConfig acima.

### Arquivo 3: `js/firebase-login.js`
Mesmo firebaseConfig acima.

### Também troque:
- `ADMIN_EMAIL` em `admin.js`, `user.js` e `firebase-login.js` pelo seu email real de admin.

---

## PASSO 7 – Testar

1. Abra `index.html` no navegador
2. Clique em "Iniciar Sesión"
3. Entre com o email/senha do admin
4. Deve redirecionar para `admin/index.html`
5. Crie um usuário de teste
6. No Firebase Console, crie a conta desse usuário em Authentication
7. Faça logout e entre com a conta do usuário
8. Deve redirecionar para a página do usuário

---

## PASSO 8 – Hospedar o site (opcional mas recomendado)

### Opção A – Firebase Hosting (gratuito):
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Selecione seu projeto, pasta pública: . (ponto)
# Configure como SPA: No
firebase deploy
```

### Opção B – Netlify (arraste a pasta):
1. Acesse https://netlify.com
2. Arraste a pasta `hs-gestion` para o site
3. Pronto! URL gerada automaticamente.

---

## RESUMO DOS EMAILS A CONFIGURAR

| Onde | Variável | Valor |
|------|----------|-------|
| `admin/js/admin.js` | `ADMIN_EMAIL` | seu email de admin |
| `usuarios/js/user.js` | `ADMIN_EMAIL` | mesmo email |
| `js/firebase-login.js` | `ADMIN_EMAIL` | mesmo email |
| `usuarios/js/user.js` | `ALIAS_PAGO` | `sofiacuello25` ✅ já configurado |
| Firestore Rules | email inline | mesmo email (nas 3 regras) |
| Storage Rules | email inline | mesmo email |

---

## CACHE BUSTING – Como atualizar versão

Quando fizer alterações no CSS ou JS, incremente a versão:

### Em `admin/index.html`:
```html
<link rel="stylesheet" href="css/admin.css?v=1.0.1" />
<script type="module" src="js/admin.js?v=1.0.1"></script>
```

### Em `usuarios/index.html` (e sub-páginas):
```html
<link rel="stylesheet" href="../css/user.css?v=1.0.1" />
<script type="module" src="../js/user.js?v=1.0.1"></script>
```

### Em `index.html`:
```html
<link rel="stylesheet" href="css/styles.css?v=1.0.1" />
<script src="js/main.js?v=1.0.1" defer></script>
<script type="module" src="js/firebase-login.js?v=1.0.1"></script>
```

### No topo de cada JS (para o sistema de auto-reload):
```javascript
const APP_VERSION = '1.0.1'; // admin.js e main.js
```

---

✅ Pronto! Com isso o sistema estará 100% funcional.
