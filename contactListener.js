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

function schedulePlayerTeleport(player, x, y) {
  Promise.resolve().then(() => {
    player.body.SetPosition(new Box2D.Common.Math.b2Vec2(x, y));
    player.x = x;
    player.y = y;
  });
}

function applyExplosion(cx, cy, radius, strength) {
  const b2Vec2 = Box2D.Common.Math.b2Vec2;

  for (const player of Object.values(game.players)) {
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
function popPlayer(player) {
  applyExplosion(player.x, player.y, game.config.deathExploRadius, game.config.deathExploStrength);

  player.dead = true;
  player.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
  player.body.SetType(Box2D.Dynamics.b2Body.b2_staticBody);

  if (player.sprite) {
    player.sprite.destroy();
    player.sprite = null;
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

/**
 * Defer a tile change until after the current physics step,
 * so we never destroy a Box2D body inside a contact callback.
 */
function scheduleTileChange(x, y, newId = 0) {
  Promise.resolve().then(() => {
    if (!window.game) return;
    game.setTile(x, y, newId);

    if (window.renderer) {
      const entry = game.dataMap[y]?.[x];
      if (entry?.sprite)           { entry.sprite.destroy();           entry.sprite           = null; }
      if (entry?.backgroundSprite) { entry.backgroundSprite.destroy(); entry.backgroundSprite = null; }
      if (newId) renderer.drawTile(x, y, newId);
    }
  });
}

// ------------------------------------------------------------
// Fires once when two bodies first touch
// ------------------------------------------------------------

function handlePlayerBegin(player, other) {
  const cfg = game.config;

  switch (other.category) {
case 'spike':
  popPlayer(player);
  break;

case 'boost': {
  const ud = game.dataMap[other.y]?.[other.x]?.body?.GetUserData();
  if (!ud || ud.taken) break;
  ud.taken = true;
  applyBoost(player);
  renderer.changeTileTexture(other.x, other.y, 5.1);
  setTimeout(() => {
    ud.taken = false;
    renderer.changeTileTexture(other.x, other.y, 5);
  }, 10000);
  break;
}

case 'redBoost': {
  if (player.team !== 'red') break;
  const ud = game.dataMap[other.y]?.[other.x]?.body?.GetUserData();
  if (!ud || ud.taken) break;
  ud.taken = true;
  applyBoost(player);
  renderer.changeTileTexture(other.x, other.y, 14.1);
  setTimeout(() => {
    ud.taken = false;
    renderer.changeTileTexture(other.x, other.y, 14);
  }, 10000);
  break;
}

case 'blueBoost': {
  if (player.team !== 'blue') break;
  const ud = game.dataMap[other.y]?.[other.x]?.body?.GetUserData();
  if (!ud || ud.taken) break;
  ud.taken = true;
  applyBoost(player);
  renderer.changeTileTexture(other.x, other.y, 15.1);
  setTimeout(() => {
    ud.taken = false;
    renderer.changeTileTexture(other.x, other.y, 15);
  }, 10000);
  break;
}
case 'bomb': {
  const bx = other.x + 0.5;
  const by = other.y + 0.5;
  applyExplosion(bx, by, cfg.bombRadius, cfg.bombStrength);
  renderer.changeTileTexture(other.x, other.y, 10.1);
  setTimeout(() => {
    renderer.changeTileTexture(other.x, other.y, 10);
  }, 30000);
  console.log('bomb', player.id);
  break;
}

    case 'redFlag':
      if (player.team === 'blue') console.log('pickupRedFlag',    player.id);
      break;

    case 'blueFlag':
      if (player.team === 'red')  console.log('pickupBlueFlag',   player.id);
      break;

    case 'yellowFlag':
      console.log('pickupYellowFlag', player.id);
      break;

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

    case 'button':
      console.log('button', player.id);
      break;

    case 'redGoal':
      if (player.team === 'red'  && player.hasFlag) console.log('score red',  player.id);
      break;

    case 'blueGoal':
      if (player.team === 'blue' && player.hasFlag) console.log('score blue', player.id);
      break;

    case 'gravityWell':
      console.log('gravityEnter', player.id);
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
      player.portalCooldown = false;
      break;
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
// Used for: canceling collisions (ghost, gates, teammates)
// ------------------------------------------------------------

function handlePlayerCollision(player, other, contact) {
  switch (other.category) {
    case 'wall':
      if (player.ghost) contact.SetEnabled(false);
      break;
    case 'redGate':
      if (player.team === 'red'  || player.ghost) contact.SetEnabled(false);
      break;
    case 'blueGate':
      if (player.team === 'blue' || player.ghost) contact.SetEnabled(false);
      break;
    case 'greenGate':
      if (player.ghost) contact.SetEnabled(false);
      break;
    case 'emptyGate':
      contact.SetEnabled(false);
      break;
    case 'player':
      if (player.team === other.team) contact.SetEnabled(false);
      break;
  }
}

function handleObjectCollision(object, other, contact) {
  switch (other.category) {
    case 'wall':
      if (object.ghost) contact.SetEnabled(false);
      break;
  }
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