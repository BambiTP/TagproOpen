// ------------------------------------------------------------
// Fires once when two bodies first touch
// ------------------------------------------------------------
function handlePlayerPlayerBegin(player, other) {
  if (player.id >= other.id) return;      // handle each pair once
  if (player.team === other.team) return; // ignore teammates

  const pHas = !!player.hasFlag;
  const oHas = !!other.hasFlag;

  if (pHas && oHas) {
    helper.returnFlag(player); helper.returnFlag(other);
    helper.popPlayer(player);  helper.popPlayer(other);
    return;
  }
  if (pHas) {
    if (player.hasFlag.flagId === 16) helper.transferFlag(player, other);
    else helper.returnFlag(player);
    helper.popPlayer(player);
    return;
  }
  if (oHas) {
    if (other.hasFlag.flagId === 16) helper.transferFlag(other, player);
    else helper.returnFlag(other);
    helper.popPlayer(other);
  }
}

function handlePlayerBegin(player, other) {

  if (other?.isPlayer) {
    handlePlayerPlayerBegin(player, other);
    return;
  }
  switch (other.category) {
    case 'spike':
      helper.popPlayer(player);
      break;

    case 'redBoost': {
      // 1. Initialize state if missing
      if (!other.state) other.state = 'active';
      console.log(other.state)

      // 2. Standard check
      if (player.team !== 'red' || other.state === 'cooldown') break;

      helper.applyBoost(player);
      helper.scheduleChangeState(other.x, other.y, 'cooldown', 14.1);
      other.state = 'cooldown';
      
      setTimeout(() => {
        helper.scheduleChangeState(other.x, other.y, 'active', 14);
        other.state = 'active';
      }, game.config.blueBoostCooldown);
      break;
    }

    case 'blueBoost': {
      if (!other.state) other.state = 'active';
      if (player.team !== 'blue' || other.state === 'cooldown') break;

      helper.applyBoost(player);
      other.state = 'cooldown';
      helper.scheduleChangeState(other.x, other.y, 'cooldown', 15.1);

      setTimeout(() => {
        other.state = 'active';
        helper.scheduleChangeState(other.x, other.y, 'active', 15);
      }, game.config.blueBoostCooldown);
      break;
    }

    case 'boost': { 
      if (!other.state) other.state = 'active';
      if (other.state === 'cooldown') break;

      helper.applyBoost(player);
      other.state = 'cooldown';
      helper.scheduleChangeState(other.x, other.y, 'cooldown', 5.1);

      setTimeout(() => {
        other.state = 'active';
        helper.scheduleChangeState(other.x, other.y, 'active', 5);
      }, game.config.boostCooldown);
      break;
    }
    case 'bomb': {
      // 1. Initialize state and check for cooldown
      if (!other.state) other.state = 'active';
      if (other.state === 'cooldown' || game.map[other.y][other.x] !== 10) break;

      // 2. Execute Explosion Logic
      helper.applyExplosion(
        other.x + 0.5, 
        other.y + 0.5, 
        game.config.bombRadius, 
        game.config.bombStrength
      );

      // 3. Set Cooldown State and Visuals
      other.state = 'cooldown';
      helper.scheduleTileChange(other.x, other.y, 10.1);

      // 4. Reset after cooldown
      setTimeout(() => {
        other.state = 'active';
        helper.scheduleTileChange(other.x, other.y, 10);
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
        helper.scheduleTileChange(gate.x, gate.y, gateId);
      }

      break;
    }

    case 'redGate':
      if (player.team !== 'red') helper.popPlayer(player);
      break;

    case 'blueGate':
      if (player.team !== 'blue') helper.popPlayer(player);
      break;

    case 'greenGate':
      helper.popPlayer(player);
      break;

    case 'redFlag': {
      const mapId = game.map[other.y][other.x];
      if (mapId !== 3) break;
      if (player.team === 'red' && player.hasFlag)  helper.captureFlag(player);
      if (player.team === 'blue' && !player.hasFlag) helper.pickupFlag(player, other);
      break;
    }

    case 'blueFlag': {
      const mapId = game.map[other.y][other.x];
      if (mapId !== 4) break;
      if (player.team === 'blue' && player.hasFlag) helper.captureFlag(player);
      if (player.team === 'red' && !player.hasFlag) helper.pickupFlag(player, other);
      break;
    }

    case 'yellowFlag': {
      if (game.map[other.y][other.x] !== 16) break;
      if (!player.hasFlag) helper.pickupFlag(player, other);
      break;
    }

    case 'redGoal': {
      if (player.team === 'red' && player.hasFlag)
        if (player.hasFlag.flagId === 16 || helper.isFlagInBase('red')) helper.captureFlag(player);
      break;
    }

    case 'blueGoal': {
      if (player.team === 'blue' && player.hasFlag)
        if (player.hasFlag.flagId === 16 || helper.isFlagInBase('blue')) helper.captureFlag(player);
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
      helper.schedulePlayerTeleport(player, dest.x + 0.5, dest.y + 0.5);
      break;
    }

    case 'redPortal': {
      if (player.team !== 'red') break;
      if (!other.portalDest || other.portalOnCooldown || player.portalCooldown) break;

      other.portalOnCooldown = true;
      setTimeout(() => { other.portalOnCooldown = false; }, other.portalCooldown);

      player.portalCooldown = true;

      const redDest = other.portalDest;
      helper.schedulePlayerTeleport(player, redDest.x + 0.5, redDest.y + 0.5);
      break;
    }

    case 'bluePortal': {
      if (player.team !== 'blue') break;
      if (!other.portalDest || other.portalOnCooldown || player.portalCooldown) break;

      other.portalOnCooldown = true;
      setTimeout(() => { other.portalOnCooldown = false; }, other.portalCooldown);

      player.portalCooldown = true;

      const blueDest = other.portalDest;
      helper.schedulePlayerTeleport(player, blueDest.x + 0.5, blueDest.y + 0.5);
      break;
    }
    case 'yellowTeamTile': {
      player.teamTileCount = (player.teamTileCount ?? 0) + 1;
      player.maxSpeed = game.config.teamTileMaxSpeed;
      player.accel    = game.config.teamTileAccel;
      break;
    }
    case 'redTeamTile': {
      if (player.team !== 'red') break;
      player.teamTileCount = (player.teamTileCount ?? 0) + 1;
      player.maxSpeed = game.config.teamTileMaxSpeed;
      player.accel    = game.config.teamTileAccel;
      break;
    }
    case 'blueTeamTile': {
      if (player.team !== 'blue') break;
      player.teamTileCount = (player.teamTileCount ?? 0) + 1;
      player.maxSpeed = game.config.teamTileMaxSpeed;
      player.accel    = game.config.teamTileAccel;
      break;
    }
    case 'gravityWell':
      helper.popPlayer(player);
      break;

    case 'gravityWellField':
      helper.activateGravityWell(player, other);
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
          helper.scheduleTileChange(gate.x, gate.y, gate.defaultId);
        }
      }, other.switchTimer * 1000);

      break;
    }
    case 'gravityWellField':
      helper.gravityWellStop(player, other);
      break;
    case 'yellowTeamTile': {
      player.teamTileCount = Math.max(0, (player.teamTileCount ?? 1) - 1);
      if (player.teamTileCount === 0) {
        player.maxSpeed = game.config.maxSpeed;
        player.accel    = game.config.accel;
      }
      break;
    }
    case 'redTeamTile': {
      if (player.team !== 'red') break;
      player.teamTileCount = Math.max(0, (player.teamTileCount ?? 1) - 1);
      if (player.teamTileCount === 0) {
        player.maxSpeed = game.config.maxSpeed;
        player.accel    = game.config.accel;
      }
      break;
    }
    case 'blueTeamTile': {
      if (player.team !== 'blue') break;
      player.teamTileCount = Math.max(0, (player.teamTileCount ?? 1) - 1);
      if (player.teamTileCount === 0) {
        player.maxSpeed = game.config.maxSpeed;
        player.accel    = game.config.accel;
      }
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