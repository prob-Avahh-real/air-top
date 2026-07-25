/** Gyroscope / spinning-top skins */
export const TOPS = [
  {
    id: 'wood',
    label: '木质',
    short: '木',
    color: '#c4783a',
    friction: 0.985,
    mass: 1.0,
    humBase: 90,
    description: '稳、温润',
  },
  {
    id: 'metal',
    label: '金属',
    short: '金',
    color: '#8aa0b4',
    friction: 0.992,
    mass: 1.35,
    humBase: 70,
    description: '沉、持久',
  },
  {
    id: 'neon',
    label: '霓虹',
    short: '霓',
    color: '#3ecf9a',
    friction: 0.978,
    mass: 0.75,
    humBase: 130,
    description: '轻、敏感',
  },
  {
    id: 'glass',
    label: '琉璃',
    short: '璃',
    color: '#6eb8e8',
    friction: 0.988,
    mass: 0.9,
    humBase: 110,
    description: '透、灵动',
  },
];

export const PHYSICS = {
  minRpmAlive: 40,
  maxRpm: 2400,
  whipBoost: 280,
  tapBoost: 120,
  fallLean: 28,
  leanStep: 4.5,
  uprightRate: 0.12,
};
