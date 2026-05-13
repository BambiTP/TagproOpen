// Box2D, buildContactListener, and tiles are globals from their script tags

const {
  b2Vec2,
  b2World,
  b2BodyDef,
  b2Body,
  b2FixtureDef,
  b2CircleShape,
  b2ContactListener,
} = {
  b2Vec2: Box2D.Common.Math.b2Vec2,
  b2World: Box2D.Dynamics.b2World,
  b2BodyDef: Box2D.Dynamics.b2BodyDef,
  b2Body: Box2D.Dynamics.b2Body,
  b2FixtureDef: Box2D.Dynamics.b2FixtureDef,
  b2CircleShape: Box2D.Collision.Shapes.b2CircleShape,
  b2ContactListener: Box2D.Dynamics.b2ContactListener,
};

class Game {
  constructor(config) {
    this.config = config;
    this.players = {};

    this.map     = [];  // 2D array of tile IDs (numbers). map[y][x] = id
    this.dataMap = [];  // 2D array of tile data.     dataMap[y][x] = { id, body, sprite }
    this.wallMap = [];  // 2D array of wall solids bitmasks. wallMap[y][x] = bitmask
    this.spawnPool = [];

    this.physicsLookup = {};
    for (const t of physicsData) {
      this.physicsLookup[t.id] = t;
    }
    this.world = new b2World(
      new b2Vec2(config.gravityX, config.gravityY),
      true
    );

    this.world.SetContactListener(buildContactListener());

    this.timeStep = 1 / 60;
    this.velIter = 8;
    this.posIter = 3;

    this.running = false;
  }

  moveBalls() {
    for (const p of Object.values(this.players)) {
      const body = p.body;
      const max = p.maxSpeed;
      const accel = p.accel;
      let { x: vx, y: vy } = body.GetLinearVelocity();

      if (p.left  && vx > -max) vx -= accel;
      if (p.right && vx <  max) vx += accel;
      if (p.up    && vy > -max) vy -= accel;
      if (p.down  && vy <  max) vy += accel;

      body.SetLinearVelocity(new b2Vec2(vx, vy));
    }
  }

spawnPlayer(id, team) {
  const config  = this.config;
  const teamStr = (team === 2 || team === 'blue') ? 'blue' : 'red';

  const sp    = this.spawnPool?.[teamStr];
  if (!sp?.length) { console.error(`spawnPool not ready for "${teamStr}"`); return null; }

  const point = sp[Math.floor(Math.random() * sp.length)];
  const x     = point.x;
  const y     = point.y;

  const bodyDef = new b2BodyDef();
  bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position.Set(x, y);
  bodyDef.linearDamping  = config.linearDamping;
  bodyDef.angularDamping = config.angularDamping;
  bodyDef.allowSleep = false;
  const body = this.world.CreateBody(bodyDef);

  const fixtureDef = new b2FixtureDef();
  fixtureDef.shape       = new b2CircleShape(config.radius);
  fixtureDef.density     = config.density;
  fixtureDef.friction    = config.friction;
  fixtureDef.restitution = config.restitution;
  body.CreateFixture(fixtureDef);

  const player = {
    id,
    team: teamStr,
    body,
    socket: null,
    isPlayer: true,

    x: 0, y: 0,
    lx: 0, ly: 0,
    a: 0, ra: 0,

    left: false, right: false, up: false, down: false,

    maxSpeed: config.maxSpeed,
    accel:    config.accel,

    ghost: false, hasFlag: false,
    tagpro: false, bomb: false, speed: false, grip: false,
    dead: false,
  };

  body.SetUserData(player);
  this.players[id] = player;
  return player;
}

  removePlayer(id) {
    const player = this.players[id];
    if (!player) return;
    this.world.DestroyBody(player.body);
    delete this.players[id];
  }

  start() {
    if (this.running) return;
    this.running = true;

    this.lastTime = Date.now();
    this.accumulator = 0;

    const STEP = 1000 / 60;

    const loop = () => {
      if (!this.running) return;

      const now = Date.now();
      const frameTime = now - this.lastTime;
      this.lastTime = now;

      this.accumulator += Math.min(frameTime, 250);

      while (this.accumulator >= STEP) {
        this.step();
        this.accumulator -= STEP;
      }

      requestAnimationFrame(loop);
    };

    loop();
  }

  stop() {
    this.running = false;
  }

  step() {
    this.moveBalls();
    this.world.Step(this.timeStep, this.velIter, this.posIter);
    this.syncPlayers();
  }

  syncPlayers() {
    for (const player of Object.values(this.players)) {
      const pos = player.body.GetPosition();
      const vel = player.body.GetLinearVelocity();
      player.x  = pos.x;
      player.y  = pos.y;
      player.lx = vel.x;
      player.ly = vel.y;
    }
  }

  // Build Box2D bodies from game.map and populate game.dataMap.
  createMap() {
    this.clearTiles();
    this.dataMap = this.map.map(row => row.map(() => null));

    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const id = this.map[y][x];
        if (!id) continue;
        this.dataMap[y][x] = { id, body: this.makeBody(id, x, y), sprite: null };
      }
    }
  }


  clearTiles() {
    for (let y = 0; y < this.dataMap.length; y++) {
      for (let x = 0; x < this.dataMap[y].length; x++) {
        const data = this.dataMap[y]?.[x];
        if (data?.body) {
          this.world.DestroyBody(data.body);
        }
      }
    }
    this.dataMap = [];
  }

  setTile(x, y, id) {
    // Update map
    this.map[y][x] = id || 0;

    // Destroy old body
    const old = this.dataMap[y]?.[x];
    if (old?.body) this.world.DestroyBody(old.body);

    if (!id) {
      this.dataMap[y][x] = null;
      return null;
    }

    const entry = { id, body: this.makeBody(id, x, y), sprite: null };
    this.dataMap[y][x] = entry;
    return entry;
  }
applyPortalData(portals) {
  for (const [key, pd] of Object.entries(portals)) {
    const [x, y] = key.split(',').map(Number);
    const entry = this.dataMap[y]?.[x];
    if (!entry?.body) continue;

    const ud = entry.body.GetUserData();
    ud.portalDest       = pd.destination ?? null;
    ud.portalCooldown   = pd.cooldown    ?? 0;
    ud.portalOnCooldown = false;
  }
}
  // Internal: create and return a Box2D body for tile id at grid (x, y).
  makeBody(id, x, y) {
    const tileData = this.physicsLookup[id];
    if (!tileData) return null;

    const bodyDef = new b2BodyDef();
    bodyDef.type = b2Body.b2_staticBody;
    bodyDef.position.Set(x + 0.5, y + 0.5);
    const body = this.world.CreateBody(bodyDef);

    const fixDef = new b2FixtureDef();
    fixDef.isSensor = tileData.sensor ?? false;

    if (tileData.type === 'vector') {
      const shape = new Box2D.Collision.Shapes.b2PolygonShape();
      shape.SetAsArray(tileData.vectors.map(v => new b2Vec2(v.x, v.y)));
      fixDef.shape = shape;
    } else if (tileData.type === 'square') {
      const shape = new Box2D.Collision.Shapes.b2PolygonShape();
      shape.SetAsBox(tileData.size / 2 / 40, tileData.size / 2 / 40);
      fixDef.shape = shape;
    } else if (tileData.type === 'circle') {
      fixDef.shape = new b2CircleShape(tileData.size / 2 / 40);
    }

    body.CreateFixture(fixDef);
    body.SetUserData({
      isTile: true,
      category: tileData.category ?? 'unknown',
      tileId: id,
      x,
      y,
    });

    return body;
  }
}
