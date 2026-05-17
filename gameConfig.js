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

    boostMultiplier:     2.9,

    bombRadius:          0.4 * 7   * TPU,
    bombStrength:        1.25      * TPU,

    rollingBombRadius:   0.4 * 5   * TPU,
    rollingBombStrength: 0.75      * TPU,

    portalExploRadius:   0.4 * 4   * TPU,
    portalExploStrength: 0.25      * TPU,

    deathExploRadius:    0.4 * 3.5 * TPU,
    deathExploStrength:  0.25      * TPU,

    boostCooldown:     10000,
    redBoostCooldown:  10000,
    blueBoostCooldown: 10000,
    bombCooldown:      30000,

    teamTileAccel:    0.037 * TPU,
    teamTileMaxSpeed: 5     * TPU,
    gravityWellRadius: 0.4 * 4 * TPU,
    gravityWellStrength: 0.025 * TPU,
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