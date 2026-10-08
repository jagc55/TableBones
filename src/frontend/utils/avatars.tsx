import React from 'react';
import astronautImg from '../assets/avatars/astronaut.png';
import aviatorImg from '../assets/avatars/aviator.png';
import boxerImg from '../assets/avatars/boxer.png';
import chefImg from '../assets/avatars/chef.png';
import fishermanImg from '../assets/avatars/fisherman.png';
import gymbroImg from '../assets/avatars/gymbro.png';
import magicianImg from '../assets/avatars/magician.png';
import nurseImg from '../assets/avatars/nursse.png';
import scientistImg from '../assets/avatars/scientist.png';
import supermanImg from '../assets/avatars/superman.png';

export interface AvatarMeta {
  id: string;
  name: string;
  title: string;
  src: string;
}

export type CustomAvatarDefinition = AvatarMeta;

/**
 * ============================================================================
 * CATÁLOGO DE AVATARES DE PERFIL (ILUSTRACIONES 1930s)
 * ============================================================================
 */
export const AVATAR_LIST: AvatarMeta[] = [
  {
    id: 'aviator',
    name: 'The Flying Ace',
    title: 'Sky Corsair',
    src: aviatorImg,
  },
  {
    id: 'boxer',
    name: 'The Prizefighter',
    title: 'Ring Champion',
    src: boxerImg,
  },
  {
    id: 'astronaut',
    name: 'The Astronaut',
    title: 'Cosmic Explorer',
    src: astronautImg,
  },
  {
    id: 'chef',
    name: 'The Head Chef',
    title: 'Culinary Artist',
    src: chefImg,
  },
  {
    id: 'fisherman',
    name: 'The Old Angler',
    title: 'Sea Wolf',
    src: fishermanImg,
  },
  {
    id: 'gymbro',
    name: 'The Iron Pumper',
    title: 'Heavy Lifter',
    src: gymbroImg,
  },
  {
    id: 'magician',
    name: 'The Illusionist',
    title: 'Grand Arcanist',
    src: magicianImg,
  },
  {
    id: 'nursse',
    name: 'The Night Nurse',
    title: 'Bone Medic',
    src: nurseImg,
  },
  {
    id: 'scientist',
    name: 'The Alchemist',
    title: 'Mad Chemist',
    src: scientistImg,
  },
  {
    id: 'superman',
    name: 'The Superhero',
    title: 'Caped Crusader',
    src: supermanImg,
  },
];

export const CUSTOM_AVATARS: CustomAvatarDefinition[] = AVATAR_LIST;

interface AvatarIconProps {
  id: string;
  size?: number;
  className?: string;
}

export const AvatarIcon: React.FC<AvatarIconProps> = ({ id, size = 48, className = '' }) => {
  // Soporte para alias y fallback a aviator si el ID antiguo no coincide
  const normalizedId = id === 'nurse' ? 'nursse' : id;
  const avatar = AVATAR_LIST.find((a) => a.id === normalizedId) || AVATAR_LIST[0];

  const radius = Math.max(4, Math.round(size * 0.22));
  const borderWidth = Math.max(1.5, Math.round(size * 0.05));

  return (
    <div
      className={`avatar-badge-frame ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: radius,
        backgroundColor: '#f6c445',
        border: `${borderWidth}px solid #1c1511`,
        boxShadow: size >= 26 ? '1.5px 1.5px 0px #1c1511' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
      title={avatar.name}
    >
      <img
        src={avatar.src}
        alt={avatar.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transform: 'scale(1.08)',
          filter: 'drop-shadow(1px 1px 0px rgba(28, 21, 17, 0.35))',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
