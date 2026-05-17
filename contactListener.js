// b2ContactListener is available as a global from Box2dWeb

// ------------------------------------------------------------
// Shared helpers
// ------------------------------------------------------------

/**
 * Apply an explosion centred at world position (cx, cy).
 * Every player within radius receives an impulse directed away
 * from the blast centre, falling off linearly:
 *   speedBoost = strength × (radius − distance)
 * All values in Box2D units (tiles). Config is in TPU; the
 * conversion factor is baked in at GAME_CONFIG time.
 */
function activateGravityWell(player, wellData) {
  if (!wellData.pulledPlayers) wellData.pulledPlayers = new Set();
  wellData.pulledPlayers.add(player);
}

function gravityWellStop(player, wellData) {
  wellData.pulledPlayers?.delete(player);
}
function schedulePlayerTeleport(player, x, y) {
  Promise.resolve().then(() => {
    player.body.SetPosition(new Box2D.Common.Math.b2Vec2(x, y));
    player.x = x;
    player.y = y;
  });
}

function applyExplosion(cx, cy, radius, strength) {
  const b2Vec2 = Box2D.Common.Math.b2Vec2;

for (const player of game.players) {
    const pos  = player.body.GetPosition();
    const dx   = pos.x - cx;
    const dy   = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= radius || dist < 1e-6) continue;

    const boost = strength * (radius - dist);
    const vel   = player.body.GetLinearVelocity();
    player.body.SetLinearVelocity(new b2Vec2(
      vel.x + (dx / dist) * boost,
      vel.y + (dy / dist) * boost,
    ));
  }
}
function pickupFlag(player, other) {
  if (player.hasFlag) return;
  const id = game.map[other.y][other.x];
  if (id !== 3 && id !== 4 && id !== 16) return;
  player.hasFlag = { flagId: id, originX: other.x, originY: other.y };
  console.log(`[pickupFlag] Player ${player.id} picked up flag ${id} at (${other.x}, ${other.y})`);
  scheduleTileChange(other.x, other.y, id + 0.1);
  renderer.attachFlag(player.id, id);          // ← draw flag on ball
}

function returnFlag(player) {
  if (!player.hasFlag) return;
  const { flagId, originX, originY } = player.hasFlag;
  player.hasFlag = false;
  console.log(`[returnFlag] Flag ${flagId} returned to origin (${originX}, ${originY})`);
  scheduleTileChange(originX, originY, flagId);
  renderer.detachFlag(player.id);              // ← remove flag from ball
}

function transferFlag(from, to) {
  to.hasFlag = from.hasFlag;
  from.hasFlag = false;
  console.log(`[transferFlag] Flag transferred from player ${from.id} to player ${to.id}`);
  renderer.detachFlag(from.id);                // ← remove from passer
  renderer.attachFlag(to.id, to.hasFlag.flagId); // ← attach to receiver
}


function captureFlag(player) {
  if (!game.scores) game.scores = { red: 0, blue: 0 };
  game.scores[player.team]++;
  console.log(`[captureFlag] Player ${player.id} (${player.team}) captured the flag! Scores:`, game.scores);
  returnFlag(player);
}

function isFlagInBase(team) {
  const id = team === 'red' ? 3 : 4;
  for (let y = 0; y < game.map.length; y++)
    for (let x = 0; x < game.map[y].length; x++)
      if (game.map[y][x] === id) {
        console.log(`[isFlagInBase] ${team} flag is in base at (${x}, ${y})`);
        return true;
      }
  console.log(`[isFlagInBase] ${team} flag is NOT in base`);
  return false;
}
function popPlayer(player) {
  returnFlag(player); // ← add this
  applyExplosion(player.x, player.y, game.config.deathExploRadius, game.config.deathExploStrength);

  player.dead = true;
  player.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
  player.body.SetType(Box2D.Dynamics.b2Body.b2_staticBody);

if (player.container) {
  player.container.destroy();
  player.container = null;
  player.sprites = null;
}

  setTimeout(() => respawnPlayer(player), 3000);
}
function pickSpawnPoint(team) {
  const pool = game.spawnPool[team];
  return pool[Math.floor(Math.random() * pool.length)];
}

function respawnPlayer(player) {
  const sp    = game.spawnPool[player.team];
  const point = sp[Math.floor(Math.random() * sp.length)];

  player.body.SetType(Box2D.Dynamics.b2Body.b2_dynamicBody);
  player.body.SetPosition(new Box2D.Common.Math.b2Vec2(point.x, point.y));
  player.x = point.x;
  player.y = point.y;
  player.dead = false;

  renderer.drawPlayer(player.id);
}
/**
 * Boost a single player in the direction they're already
 * travelling, scaling their speed to maxSpeed × boostMultiplier.
 * No-ops when the ball is nearly stationary.
 */
function applyBoost(player) {
  const vel   = player.body.GetLinearVelocity();
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  if (speed < 1e-4) return;

  const target     = player.maxSpeed * game.config.boostMultiplier;
  const multiplier = target / speed;
  player.body.SetLinearVelocity(
    new Box2D.Common.Math.b2Vec2(vel.x * multiplier, vel.y * multiplier)
  );
}
function scheduleChangeState(x, y, state, id) {
  Promise.resolve().then(() => {
    if (!game) return;
    const tileData = game.dataMap[y][x]
    if (tileData) tileData.state = state;
    if (renderer) renderer.changeTile(x, y, id);
  });
}


function scheduleTileChange(x, y, newId = 0) {
  Promise.resolve().then(() => {
    if (!game) return;
    game.setTile(x, y, newId);
    if (renderer) renderer.changeTile(x, y, newId);
  });
}

function triggerBomb(x, y) {
  if (game.map[y][x] !== 10) return;
  applyExplosion(x + 0.5, y + 0.5, game.config.bombRadius, game.config.bombStrength);
  scheduleTileChange(x, y, 10.1);
  setTimeout(() => scheduleTileChange(x, y, 10), game.config.bombCooldown);
}

// ------------------------------------------------------------
// Fires once when two bodies first touch
// ------------------------------------------------------------
function handlePlayerPlayerBegin(player, other) {
  if (player.id >= other.id) return;      // handle each pair once
  if (player.team === other.team) return; // ignore teammates

  const pHas = !!player.hasFlag;
  const oHas = !!other.hasFlag;

  if (pHas && oHas) {
    returnFlag(player); returnFlag(other);
    popPlayer(player);  popPlayer(other);
    return;
  }
  if (pHas) {
    if (player.hasFlag.flagId === 16) transferFlag(player, other);
    else returnFlag(player);
    popPlayer(player);
    return;
  }
  if (oHas) {
    if (other.hasFlag.flagId === 16) transferFlag(other, player);
    else returnFlag(other);
    popPlayer(other);
  }
}

function handlePlayerBegin(player, other) {

if (other?.isPlayer) {
  handlePlayerPlayerBegin(player, other);
  return;
}
  switch (other.category) {
case 'spike':
  popPlayer(player);
  break;


case 'redBoost': {
  // 1. Initialize state if missing
  if (!other.state) other.state = 'active';
  console.log(other.state)

  // 2. Standard check
  if (player.team !== 'red' || other.state === 'cooldown') break;

  applyBoost(player);
  scheduleChangeState(other.x, other.y, 'cooldown', 14.1);
  other.state = 'cooldown';
  
  setTimeout(() => {
    scheduleChangeState(other.x, other.y, 'active', 14);
    other.state = 'active';
  }, game.config.blueBoostCooldown);
  break;
}

case 'blueBoost': {
  if (!other.state) other.state = 'active';
  if (player.team !== 'blue' || other.state === 'cooldown') break;

  applyBoost(player);
  other.state = 'cooldown';
  scheduleChangeState(other.x, other.y, 'cooldown', 15.1);

  setTimeout(() => {
    other.state = 'active';
    scheduleChangeState(other.x, other.y, 'active', 15);
  }, game.config.blueBoostCooldown);
  break;
}

case 'boost': { 
  if (!other.state) other.state = 'active';
  if (other.state === 'cooldown') break;

  applyBoost(player);
  other.state = 'cooldown';
  scheduleChangeState(other.x, other.y, 'cooldown', 5.1);

  setTimeout(() => {
    other.state = 'active';
    scheduleChangeState(other.x, other.y, 'active', 5);
  }, game.config.boostCooldown);
  break;
}
case 'bomb': {
  // 1. Initialize state and check for cooldown
  if (!other.state) other.state = 'active';
  if (other.state === 'cooldown' || game.map[other.y][other.x] !== 10) break;

  // 2. Execute Explosion Logic
  applyExplosion(
    other.x + 0.5, 
    other.y + 0.5, 
    game.config.bombRadius, 
    game.config.bombStrength
  );

  // 3. Set Cooldown State and Visuals
  other.state = 'cooldown';
  scheduleTileChange(other.x, other.y, 10.1);

  // 4. Reset after cooldown
  setTimeout(() => {
    other.state = 'active';
    scheduleTileChange(other.x, other.y, 10);
  }, game.config.bombCooldown);
  break;
}

// begin
case 'button': {
  if (!other.switchGates) break;

  clearTimeout(other.switchTimerHandle);
  other.switchTimerHandle = null;

  const gateId = player.team === 'red'  ? 9.2
               : player.team === 'blue' ? 9.3
               : 9.1;

  for (const gate of other.switchGates) {
    scheduleTileChange(gate.x, gate.y, gateId);
  }

  break;
}

    case 'redGate':
      if (player.team !== 'red') popPlayer(player);
      break;

    case 'blueGate':
      if (player.team !== 'blue') popPlayer(player);
      break;

    case 'greenGate':
      popPlayer(player);
      break;

    case 'redFlag': {
  const mapId = game.map[other.y][other.x];
  if (mapId !== 3) break;
  if (player.team === 'red' && player.hasFlag)  captureFlag(player);
  if (player.team === 'blue' && !player.hasFlag) pickupFlag(player, other);
  break;
}

case 'blueFlag': {
  const mapId = game.map[other.y][other.x];
  if (mapId !== 4) break;
  if (player.team === 'blue' && player.hasFlag) captureFlag(player);
  if (player.team === 'red' && !player.hasFlag) pickupFlag(player, other);
  break;
}

case 'yellowFlag': {
  if (game.map[other.y][other.x] !== 16) break;
  if (!player.hasFlag) pickupFlag(player, other);
  break;
}

case 'redGoal': {
  if (player.team === 'red' && player.hasFlag)
    if (player.hasFlag.flagId === 16 || isFlagInBase('red')) captureFlag(player);
  break;
}

case 'blueGoal': {
  if (player.team === 'blue' && player.hasFlag)
    if (player.hasFlag.flagId === 16 || isFlagInBase('blue')) captureFlag(player);
  break;
}

    case 'powerup':
      console.log('pickupPowerup', player.id, other.tileId);
      break;

case 'portal': {
  if (!other.portalDest || other.portalOnCooldown || player.portalCooldown) break;

  other.portalOnCooldown = true;
  setTimeout(() => { other.portalOnCooldown = false; }, other.portalCooldown);

  player.portalCooldown = true;

  const dest = other.portalDest;
  schedulePlayerTeleport(player, dest.x + 0.5, dest.y + 0.5);
  break;
}

case 'redPortal': {
  if (player.team !== 'red') break;
  if (!other.portalDest || other.portalOnCooldown || player.portalCooldown) break;

  other.portalOnCooldown = true;
  setTimeout(() => { other.portalOnCooldown = false; }, other.portalCooldown);

  player.portalCooldown = true;

  const redDest = other.portalDest;
  schedulePlayerTeleport(player, redDest.x + 0.5, redDest.y + 0.5);
  break;
}

case 'bluePortal': {
  if (player.team !== 'blue') break;
  if (!other.portalDest || other.portalOnCooldown || player.portalCooldown) break;

  other.portalOnCooldown = true;
  setTimeout(() => { other.portalOnCooldown = false; }, other.portalCooldown);

  player.portalCooldown = true;

  const blueDest = other.portalDest;
  schedulePlayerTeleport(player, blueDest.x + 0.5, blueDest.y + 0.5);
  break;
}
case 'yellowTeamTile': {
  player.maxSpeed = game.config.teamTileMaxSpeed;
  player.accel    = game.config.teamTileAccel;
  console.log(player.maxSpeed);
  break;
}
case 'redTeamTile': {
  if (player.team !== 'red') break;
  player.maxSpeed = game.config.teamTileMaxSpeed;
  player.accel    = game.config.teamTileAccel;
  break;
}
case 'blueTeamTile': {
  if (player.team !== 'blue') break;
  player.maxSpeed = game.config.teamTileMaxSpeed;
  player.accel    = game.config.teamTileAccel;
  break;
}
case 'gravityWell':
  popPlayer(player);
  break;

case 'gravityWellField':
  activateGravityWell(player, other);
  break;

    case 'marsball':
      console.log('marsball', player.id);
      break;
  }
}

function handlePlayerEnd(player, other) {
  switch (other.category) {
    case 'gravityWell':
      console.log('gravityExit', player.id);
      break;
    case 'portal':
    case 'redPortal':
    case 'bluePortal':
      player.portalCooldown = false;
      break;
case 'button': {
  if (!other.switchGates) break;

  other.switchTimerHandle = setTimeout(() => {
    other.switchTimerHandle = null;
    for (const gate of other.switchGates) {
      scheduleTileChange(gate.x, gate.y, gate.defaultId);
    }
  }, other.switchTimer * 1000);

  break;
}
case 'gravityWellField':
  gravityWellStop(player, other);
  break;
case 'yellowTeamTile': {
  player.maxSpeed = game.config.maxSpeed;
  player.accel    = game.config.accel;
  console.log(player.maxSpeed)
  break;
}
case 'redTeamTile': {
  if (player.team !== 'red') break;
  player.maxSpeed = game.config.maxSpeed;
  player.accel    = game.config.accel;
  break;
}
case 'blueTeamTile': {
  if (player.team !== 'blue') break;
  player.maxSpeed = game.config.maxSpeed;
  player.accel    = game.config.accel;
  break;
}


  }
}
function handleObjectBegin(object, other) {
  // add object-specific begin behaviors here
}

function handleObjectEnd(object, other) {
  // add object-specific end behaviors here
}

// ------------------------------------------------------------
// Fires every tick while two bodies are touching
// Used for: canceling collisions (gates, teammates)
// ------------------------------------------------------------

function handlePlayerCollision(player, other, contact) {
  // example: cancel collision with a specific tile type
  // if (other.category === 'wall') contact.SetEnabled(false);
}

function handleObjectCollision(object, other, contact) {
  // add object-specific collision behaviors here
}

// ------------------------------------------------------------
// Builds and returns the wired-up contact listener
// Call this once and pass the result to world.SetContactListener()
// ------------------------------------------------------------

function buildContactListener() {
  const listener = new b2ContactListener();

  const getData = (contact) => ({
    dataA: contact.GetFixtureA().GetBody().GetUserData(),
    dataB: contact.GetFixtureB().GetBody().GetUserData(),
  });

  listener.BeginContact = (contact) => {
    const { dataA, dataB } = getData(contact);
    if (dataA?.isPlayer) handlePlayerBegin(dataA, dataB);
    if (dataB?.isPlayer) handlePlayerBegin(dataB, dataA);
    if (dataA?.isObject) handleObjectBegin(dataA, dataB);
    if (dataB?.isObject) handleObjectBegin(dataB, dataA);
  };

  listener.EndContact = (contact) => {
    const { dataA, dataB } = getData(contact);
    if (dataA?.isPlayer) handlePlayerEnd(dataA, dataB);
    if (dataB?.isPlayer) handlePlayerEnd(dataB, dataA);
    if (dataA?.isObject) handleObjectEnd(dataA, dataB);
    if (dataB?.isObject) handleObjectEnd(dataB, dataA);
  };

  listener.PreSolve = (contact) => {
    const { dataA, dataB } = getData(contact);
    if (dataA?.isPlayer) handlePlayerCollision(dataA, dataB, contact);
    if (dataB?.isPlayer) handlePlayerCollision(dataB, dataA, contact);
    if (dataA?.isObject) handleObjectCollision(dataA, dataB, contact);
    if (dataB?.isObject) handleObjectCollision(dataB, dataA, contact);
  };

  return listener;
}