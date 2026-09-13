/**
 * Kitty Characters Configuration
 * Includes 3 new characters based on the user-provided images plus the classic hero.
 */

export const CAT_CHARACTERS = {
  sunny: {
    id: 'sunny',
    name: 'Sunny',
    title: 'The Singing Tabby',
    subtitle: 'Golden Tabby Kitten (Image 1)',
    breed: 'Golden Tabby',
    imageBadge: '🐱 Image 1: Singing Tabby',
    badge: 'Vibrant Singer',
    badgeClass: 'badge-sunny',
    themeColor: '#ff922b',
    accentColor: '#e63946',
    emoji: '🐱🎶',
    tagline: 'Joyful Meowing Singer',
    description: 'An enthusiastic golden ginger kitten with a wide-open singing meow! Inspired by Image 1, Sunny loves greeting the morning sun, singing joyful songs, and running full speed through the crops.',
    quote: '"Meoooow~! The sun is up, let\'s plant carrots!"',
    trait: '⚡ Sun Sprint (+15% Run Speed)',
    stats: {
      speed: 95,
      cuteness: 92,
      farming: 82,
      energy: 98
    },
    bonuses: {
      speedMult: 1.15,
      moodDecayMult: 1.0,
      harvestMult: 1.0,
      weaponSpeedMult: 1.05
    }
  },

  mochi: {
    id: 'mochi',
    name: 'Mochi',
    title: 'The Sleepy Siamese',
    subtitle: 'Seal-Point Cozy Snoozer (Image 2)',
    breed: 'Siamese Point',
    imageBadge: '💤 Image 2: Sleepy Siamese',
    badge: 'Cozy Dreamer',
    badgeClass: 'badge-mochi',
    themeColor: '#b08968',
    accentColor: '#4a2e20',
    emoji: '💤🐾',
    tagline: 'Serene Cloud Snoozer',
    description: 'A sweet and serene Siamese seal-point kitten who loves snoozing flat on his belly in warm sun patches. Inspired by Image 2, Mochi is tranquil, adorable, and brings soothing harmony to the whole farm.',
    quote: '"Yaaawn... five more minutes of nap in the clover..."',
    trait: '🛌 Cozy Nap (50% Slower Mood Loss & Peaceful Aura)',
    stats: {
      speed: 76,
      cuteness: 98,
      farming: 86,
      energy: 72
    },
    bonuses: {
      speedMult: 0.95,
      moodDecayMult: 0.5,
      harvestMult: 1.0,
      weaponSpeedMult: 1.0
    }
  },

  snowball: {
    id: 'snowball',
    name: 'Snowball',
    title: 'The Fluffy Persian',
    subtitle: 'Emerald Princess (Image 3)',
    breed: 'White Persian',
    imageBadge: '💎 Image 3: Fluffy Persian',
    badge: 'Emerald Princess',
    badgeClass: 'badge-snowball',
    themeColor: '#10b981',
    accentColor: '#059669',
    emoji: '💎✨',
    tagline: 'Cloud-Fluffy Jewel Noble',
    description: 'An ultra-fluffy pure white Persian kitten with striking jewel emerald green eyes and delicate curious paws. Inspired by Image 3, Snowball loves inspecting fresh crops and has wonderful harvest luck.',
    quote: '"Every golden crop glistens like a precious diamond!"',
    trait: '✨ Lucky Whiskers (+25% Harvest Coins & Extra Gems)',
    stats: {
      speed: 84,
      cuteness: 96,
      farming: 96,
      energy: 84
    },
    bonuses: {
      speedMult: 1.0,
      moodDecayMult: 0.85,
      harvestMult: 1.25,
      weaponSpeedMult: 1.0
    }
  },

  rusty: {
    id: 'rusty',
    name: 'Rusty',
    title: 'Captain Tabby',
    subtitle: 'Classic Hero Kitten',
    breed: 'Tabby Guardian',
    imageBadge: '🪖 Classic Guardian',
    badge: 'Farm Guardian',
    badgeClass: 'badge-rusty',
    themeColor: '#f28e2b',
    accentColor: '#4a5d3f',
    emoji: '🪖🌾',
    tagline: 'Courageous Crop Defender',
    description: 'The heroic farm captain equipped with helmet, red bandana, and trusty peashooter. Always vigilant against sneaky crows, pesky moles, and wild critters invading the vegetable plots.',
    quote: '"Stand firm! Not a single weed or pest passes me!"',
    trait: '🛡️ Peashooter Mastery (+20% Projectile Velocity)',
    stats: {
      speed: 86,
      cuteness: 88,
      farming: 88,
      energy: 92
    },
    bonuses: {
      speedMult: 1.0,
      moodDecayMult: 1.0,
      harvestMult: 1.0,
      weaponSpeedMult: 1.2
    }
  }
};

export const CHARACTER_LIST = Object.values(CAT_CHARACTERS);
