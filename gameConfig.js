  const TPU = 2.5;


  const MAP_ID = 97675;


  const gameConfig = {
    gravityX: 0,
    gravityY: 0,
    radius:         0.19  * TPU,
    density:        0.475,
    friction:       0.5,
    restitution:    0.2,
    linearDamping:  0.5,
    angularDamping: 0.5,
    accel:          0.025 * TPU,
    maxSpeed:       2.5   * TPU,

    // Explosion: speed added = strength * (radius - distance). This world is TPU times bigger than
    // real TagPro, which scales distance and speed alike, so the strengths below are NOT times TPU.
    // Values fitted to real ranked replays (radii in tiles: bomb 7, rolling bomb 4.25, pop 3.5, portal 4).
    // A boost sets your speed to 3x your current top speed (7.5 m/s normally, 15 on a team tile).
    boostMultiplier:     3,

    bombRadius:          0.4 * 7    * TPU,
    bombStrength:        3.90,

    rollingBombRadius:   0.4 * 4.25 * TPU,
    rollingBombStrength: 3.31,

    portalExploRadius:   0.4 * 4    * TPU,
    portalExploStrength: 1.36,

    deathExploRadius:    0.4 * 3.5  * TPU,
    deathExploStrength:  1.56,

    boostCooldown:     10000,
    redBoostCooldown:  10000,
    blueBoostCooldown: 10000,
    bombCooldown:      30000,

    teamTileAccel:    0.037 * TPU,
    teamTileMaxSpeed: 5     * TPU,
    jukeJuiceAccel:   0.031 * TPU,
    jukeJuiceMaxSpeed: 2.5 * TPU,
    gravityWellRadius: 0.4 * 4 * TPU,
    gravityWellStrength: 0.025 * TPU,
    powerupRespawn:     5000,
    tagproTimer:     20000,
rollingBombTimer: 20000,
jukeJuiceTimer: 20000,
  };

    const IMAGE_MAP = {
    tiles:        'https://static.koalabeast.com/textures/musclescupgradients/tiles.png',
    speedpad:     'https://static.koalabeast.com/textures/musclescupgradients/speedpad.png',
    speedpadRed:  'https://static.koalabeast.com/textures/musclescupgradients/speedpadred.png',
    speedpadBlue: 'https://static.koalabeast.com/textures/musclescupgradients/speedpadblue.png',
    portal:       'https://static.koalabeast.com/textures/musclescupgradients/portal.png',
    portalRed:    'https://static.koalabeast.com/textures/musclescupgradients/portalred.png',
    portalBlue:   'https://static.koalabeast.com/textures/musclescupgradients/portalblue.png',
    gravitywell:  'https://static.koalabeast.com/images/gravitywell.png'
  };