# HS Gestión – Site

## Estrutura
```
hs-gestion/
├── index.html          ← página principal
├── css/
│   └── styles.css      ← estilos (versão controlada)
├── js/
│   └── main.js         ← JavaScript (versão controlada)
├── images/
│   ├── logo.png        ← logotipo
│   └── profile.jpg     ← foto profissional
├── robots.txt          ← instruções para robôs do Google
├── sitemap.xml         ← mapa do site para SEO
└── README.md           ← este arquivo
```

## Como forçar atualização do cache (Cache Busting)

### Passo 1 – Atualizar versão no HTML
Abra `index.html` e altere `?v=1.0.0` para `?v=1.0.1` (ou o número que quiser):
```html
<link rel="stylesheet" href="css/styles.css?v=1.0.1" />
<script src="js/main.js?v=1.0.1" defer></script>
```

### Passo 2 – Atualizar versão no JS
Abra `js/main.js` e altere:
```js
const APP_VERSION = '1.0.1';
```

Isso fará com que o navegador do usuário baixe os arquivos novos automaticamente.

## Firebase (Login)
O modal de login já está preparado. Para conectar ao Firebase:
1. Crie um projeto em https://console.firebase.google.com
2. Adicione o SDK do Firebase no `<head>` do index.html
3. Substitua a lógica do `loginForm` em `main.js` pela autenticação Firebase

## SEO Incluído
- Meta tags completas (title, description, keywords)
- Open Graph (Facebook, WhatsApp, LinkedIn)
- Twitter Card
- Schema.org JSON-LD (LocalBusiness)
- robots.txt
- sitemap.xml
- Canonical URL
- Alt text em todas as imagens
- HTML semântico (section, article, nav, header, footer)
- Responsive (mobile-first)
