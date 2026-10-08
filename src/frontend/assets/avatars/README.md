# Iconos de Perfil (Avatares)

Esta carpeta contiene las imágenes de avatares/retratos para los perfiles de usuario.

Es la única ubicación de estos recursos. Vite los importa desde el catálogo y genera sus URLs con hash bajo `dist/assets`. No dupliques estas imágenes en `public/avatars`; `public` queda para archivos que necesitan una ruta estática, como los diccionarios.

## Cómo añadir nuevos avatares:
1. Guarda tu imagen en esta carpeta (por ejemplo: `mi-personaje.png`).
   * **Formato recomendado:** PNG con fondo transparente.
   * **Resolución ideal:** 256x256 px o superior.
2. Abre `src/frontend/utils/avatars.tsx`.
3. Añade tu avatar en la lista `AVATAR_LIST` (`CUSTOM_AVATARS` es un alias de esa lista):
   ```ts
   import miPersonajeImg from '../assets/avatars/mi-personaje.png';

   // Dentro de AVATAR_LIST:
   {
     id: 'mi-personaje',
     name: 'Nombre del Personaje',
     title: 'Título o Apodo',
     src: miPersonajeImg,
   },
   ```
¡Y listo! El nuevo avatar aparecerá automáticamente en el selector de perfiles (`ProfileModal`), cabecera, salas, chat y en la arena de juego.
