/**
 * Kitty Characters Configuration
 * Includes the original cozy roster plus extra low-poly farm friends inspired by warm indoor scenes.
 */

export const CAT_CHARACTERS = {
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    title: 'The Yarn-Bow Kitten',
    subtitle: 'Blue-Eyed White Kitten',
    breed: 'White Longhair',
    imageBadge: '🎀 Pink Yarn Sweetheart',
    badge: 'Yarn Sweetheart',
    badgeClass: 'badge-pearl',
    themeColor: '#e99aaf',
    accentColor: '#328fb7',
    emoji: '🎀🐾',
    tagline: 'Little Paws, Big Blue Eyes',
    description: 'A cloud-soft white kitten with sparkling blue eyes, a tiny happy smile, and a blush-pink yarn bow. Pearl loves batting at loose yarn and padding through the garden on her fluffy little paws.',
    quote: '"A little yarn, a little sunshine, and a whole lot of purrs!"',
    trait: '🎀 Gentle Purr (20% Slower Mood Loss)',
    stats: { speed: 82, cuteness: 100, farming: 88, energy: 86 },
    bonuses: {
      speedMult: 1.0,
      moodDecayMult: 0.8,
      harvestMult: 1.0,
      weaponSpeedMult: 1.0
    }
  },

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
  },

  ember: {
    id: 'ember',
    name: 'Ember',
    title: 'The Hearthside Snuggler',
    subtitle: 'Fireplace Cozy Cat',
    breed: 'Blue-Frost Tabby',
    imageBadge: '🔥 Hearthside Cozy',
    badge: 'Warm Hearth',
    badgeClass: 'badge-ember',
    themeColor: '#f97316',
    accentColor: '#7c2d12',
    emoji: '🔥🐾',
    tagline: 'Candlelit Blanket Dreamer',
    description: 'A soft blue-grey kitty with a warm orange scarf, curled beside a glowing fire and a basket of blankets. Ember brings the cozy cabin energy to every sunrise.',
    quote: '"The fire is warm, the blankets are fluffy, and the farm feels like home."',
    trait: '🔥 Hearth Glow (Slower Mood Decay & Cozy Bonus)',
    stats: {
      speed: 79,
      cuteness: 97,
      farming: 84,
      energy: 72
    },
    bonuses: {
      speedMult: 0.96,
      moodDecayMult: 0.65,
      harvestMult: 1.05,
      weaponSpeedMult: 1.0
    }
  },

  moss: {
    id: 'moss',
    name: 'Moss',
    title: 'The Campfire Explorer',
    subtitle: 'Tent-Loving Traveler',
    breed: 'Forest Tabby',
    imageBadge: '⛺ Campfire Scout',
    badge: 'Camp Trail',
    badgeClass: 'badge-moss',
    themeColor: '#84cc16',
    accentColor: '#365314',
    emoji: '⛺🐾',
    tagline: 'Lanterns & Soft Pine Dreams',
    description: 'A mossy tan cat with a comfy scarf and a gentle campfire stare. Moss feels right at home in a tent under the stars, counting fireflies and calm evening breezes.',
    quote: '"The best stories start in a warm tent with a crackling fire."',
    trait: '⛺ Forest Calm (+10% Harvest Cheer & Peaceful Aura)',
    stats: {
      speed: 82,
      cuteness: 94,
      farming: 90,
      energy: 80
    },
    bonuses: {
      speedMult: 1.0,
      moodDecayMult: 0.8,
      harvestMult: 1.1,
      weaponSpeedMult: 1.02
    }
  },

  puff: {
    id: 'puff',
    name: 'Puff',
    title: 'The Snowy Window Napper',
    subtitle: 'Cloudy Cozy Dreamer',
    breed: 'Cloud Persian',
    imageBadge: '❄️ Winter Window',
    badge: 'Frosty Cuddle',
    badgeClass: 'badge-puff',
    themeColor: '#93c5fd',
    accentColor: '#1d4ed8',
    emoji: '❄️🐾',
    tagline: 'Soft Blankets & Blue Skies',
    description: 'A fluffy ivory kitten resting by the window while snowflakes drift around the glass. Puff is calm, dreamy, and endlessly patient with morning sunbeams.',
    quote: '"The window is warm with sun, and my blanket is extra fluffy today."',
    trait: '❄️ Snowy Calm (Gentler Mood Drain & Extra Cuteness)',
    stats: {
      speed: 74,
      cuteness: 99,
      farming: 88,
      energy: 70
    },
    bonuses: {
      speedMult: 0.9,
      moodDecayMult: 0.7,
      harvestMult: 1.08,
      weaponSpeedMult: 1.0
    }
  },

  maple: {
    id: 'maple',
    name: 'Maple',
    title: 'The Storybook Lounger',
    subtitle: 'Cider Glow Companion',
    breed: 'Amber Calico',
    imageBadge: '📚 Cozy Reading',
    badge: 'Storytime Star',
    badgeClass: 'badge-maple',
    themeColor: '#f59e0b',
    accentColor: '#9a5b00',
    emoji: '📚🐾',
    tagline: 'Purring Through the Pages',
    description: 'A warm amber-and-cream cat curled with a book by the window, glowing in the soft evening light. Maple wants every farm moment to feel like a comforting story.',
    quote: '"Every chapter feels sweeter when the room smells like cinnamon and warm wool."',
    trait: '📖 Storybook Calm (+15% Harvest Bonus While Relaxed)',
    stats: {
      speed: 81,
      cuteness: 96,
      farming: 94,
      energy: 78
    },
    bonuses: {
      speedMult: 0.98,
      moodDecayMult: 0.75,
      harvestMult: 1.15,
      weaponSpeedMult: 1.04
    }
  },

  cedar: {
    id: 'cedar',
    name: 'Cedar',
    title: 'The Cabin Window Watcher',
    subtitle: 'Woodland Cozy Guardian',
    breed: 'Cedar Stripe',
    imageBadge: '🌲 Cabin Glow',
    badge: 'Window Guard',
    badgeClass: 'badge-cedar',
    themeColor: '#38bdf8',
    accentColor: '#0f766e',
    emoji: '🌲🐾',
    tagline: 'Soft Fur, Big Garden Dreams',
    description: 'A beige-and-slate kitty with a cool mint scarf and bright watchful eyes, perched by a sunlit cabin window. Cedar loves tucked-in corners, gentle morning chatter, and happy little harvests.',
    quote: '"The garden is glowing, the cabin is quiet, and everything is just right."',
    trait: '🌲 Cabin Calm (Low Mood Drain + Steady Farm Energy)',
    stats: {
      speed: 84,
      cuteness: 95,
      farming: 92,
      energy: 88
    },
    bonuses: {
      speedMult: 1.03,
      moodDecayMult: 0.78,
      harvestMult: 1.12,
      weaponSpeedMult: 1.05
    }
  },

  cozy: {
    id: 'cozy',
    name: 'Cozy',
    title: 'The Hearthside Cuddler',
    subtitle: 'Low-Poly Sunbeam Kitty',
    breed: 'Cozy Tabby',
    imageBadge: '☕ Warm Low-Poly Kitty',
    badge: 'Cozy Plush',
    badgeClass: 'badge-cozy',
    themeColor: '#f59e0b',
    accentColor: '#9a3412',
    emoji: '☕🐱',
    tagline: 'Soft Paws & Warm Light',
    description: 'A cozy low-poly ginger-and-cream kitty with closed smiling eyes, a plush chest, and a gentle seated pose. Cozy feels like a warm blanket, a quiet room, and a sunbeam on the floor.',
    quote: '"I found the softest patch of sunlight and I am staying here all afternoon."',
    trait: '☀️ Sunbeam Rest (+20% Cozy Mood Recovery)',
    stats: {
      speed: 80,
      cuteness: 99,
      farming: 84,
      energy: 86
    },
    bonuses: {
      speedMult: 0.98,
      moodDecayMult: 0.7,
      harvestMult: 1.08,
      weaponSpeedMult: 1.0
    }
  }
};

export const CHARACTER_LIST = Object.values(CAT_CHARACTERS);
