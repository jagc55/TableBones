# Iconos de Perfil (Avatares)

Esta carpeta contiene las imágenes de avatares/retratos para los perfiles de usuario.

## Cómo añadir nuevos avatares:
1. Guarda tu imagen en esta carpeta (por ejemplo: `mi-personaje.png`).
   * **Formato recomendado:** PNG con fondo transparente.
   * **Resolución ideal:** 256x256 px o superior.
2. Abre `src/utils/avatars.tsx`.
3. Añade tu avatar en la lista `CUSTOM_AVATARS`:
   ```ts
   import miPersonajeImg from '../assets/avatars/mi-personaje.png';

   // Dentro de CUSTOM_AVATARS:
   {
     id: 'mi-personaje',
     name: 'Nombre del Personaje',
     title: 'Título o Apodo',
     src: miPersonajeImg,
   },
   ```
¡Y listo! El nuevo avatar aparecerá automáticamente en el selector de perfiles (`ProfileModal`), cabecera, salas, chat y en la arena de juego.
