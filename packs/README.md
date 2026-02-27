# Packs de Contenido – HS Gestión

## Como organizar seus arquivos

### Estrutura recomendada:
```
packs/
├── imagens/
│   ├── pack-redes-enero/
│   │   ├── thumb.jpg          ← miniatura do pack (opcional)
│   │   ├── foto1.jpg
│   │   ├── foto2.jpg
│   │   └── ...
│   └── pack-verano-2025/
│       ├── thumb.jpg
│       └── ...
└── videos/
    ├── pack-stories-enero/
    │   ├── thumb.jpg          ← miniatura (captura do vídeo)
    │   ├── video1.mp4
    │   └── ...
    └── ...
```

## Como adicionar um pack novo:

1. Crie a pasta com um nome descritivo (sem espaços, use hífens)
2. Coloque os arquivos dentro
3. Abra `admin/js/admin.js`
4. Localize o array `PACKS_CATALOG` e adicione um novo objeto:

```javascript
{
  id: "pack-meu-pack",           // ID único, sem espaços
  title: "Nombre del Pack",
  description: "Descripción corta del pack.",
  type: "images",                 // "images" ou "videos"
  thumb: "../packs/imagens/meu-pack/thumb.jpg",
  files: [
    "../packs/imagens/meu-pack/foto1.jpg",
    "../packs/imagens/meu-pack/foto2.jpg",
  ]
}
```

5. **Copie o mesmo objeto** para `usuarios/js/user.js` no mesmo array `PACKS_CATALOG` (trocando os paths por `../../packs/...`)

6. No painel admin, vá em "Packs de Contenido" e clique "Asignar" para atribuir ao usuário correto.

## Lembre-se do cache busting!

Quando atualizar arquivos, incremente a versão nos HTMLs:
- `admin/index.html`: `?v=1.0.1`
- `usuarios/index.html`: `?v=1.0.1`
- E também a constante no topo de cada JS.
