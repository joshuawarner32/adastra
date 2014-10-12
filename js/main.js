
Game = function(viewCssSelector) {
  'use strict';
  // Create the canvas
  var canvas = $("<canvas>").get(0);
  var ctx = canvas.getContext("2d"),
    keysDown = {},
    gameState = null,
    clickedPlanets = null,
    awaitingDestination = false,
    selectStart = null,
    selectEnd = null;

  canvas.width = 512;
  canvas.height = 480;
  $(viewCssSelector).append(canvas);

  function getMousePosition(element, event) { /* returns Cell with .row and .column properties */
    var rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function len(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function dist(x1, y1, x2, y2) {
    return len(x1 - x2, y1 - y2);
  }

  function planetAtPoint(pos) {
    var i;
    for (i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];
      if(dist(planet.x, planet.y, pos.x, pos.y) < planet.size) {
        return planet;
      }
    }
    return null;
  }

  function planetsInRectangle(start, end, player) {
    var sx = Math.min(start.x, end.x);
    var sy = Math.min(start.y, end.y);
    var ex = Math.max(start.x, end.x);
    var ey = Math.max(start.y, end.y);

    var ret = [];

    for(var i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];
      if(planet.owner != player) {
        continue;
      }

      var px = planet.x;
      var py = planet.y;
      var psize = planet.size;

      if(
        px <= ex + psize &&
        px >= sx - psize &&
        py <= ey &&
        py >= sy)
      {
        ret.push(planet);
      }

      if(
        px <= ex &&
        px >= sx &&
        py <= ey + psize &&
        py >= sy - psize)
      {
        ret.push(planet);
      }

      if(
        dist(px, py, sx, sy) < psize ||
        dist(px, py, ex, sy) < psize ||
        dist(px, py, sx, ey) < psize ||
        dist(px, py, ex, ey) < psize)
      {
        ret.push(planet);
      }
    }
    return ret;
  }
  
  function allPlayersPlanets(player) {
    var ret = [];

    for(var i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];
      if(planet.owner == player) {
        ret.push(planet);
      }
    }
    return ret;
  }

  addEventListener("keydown", function(e) {
    keysDown[e.keyCode] = true;
  
  }, false);

  addEventListener("keyup", function(e) {
    delete keysDown[e.keyCode];
    if(!awaitingDestination && e.keyCode == 32) { // spacebar
      clickedPlanets = allPlayersPlanets(gameState.players[1]);
      if(clickedPlanets != null && clickedPlanets.length > 0) {
        awaitingDestination = true;
      } else {
        clickedPlanets = null;
      }
    }
  }, false);

  addEventListener("mousedown", function(e) {
    console.log("mousedown");
    if(!awaitingDestination) {
      selectStart = getMousePosition(canvas, e);
      selectEnd = selectStart;
    }
  }, false);

  addEventListener("mousemove", function(e) {
    if(selectStart != null) {
      selectEnd = getMousePosition(canvas, e);
      clickedPlanets = planetsInRectangle(selectStart, selectEnd, gameState.players[1]);
    }
  }, false);

  addEventListener("click", function(e) {
    console.log("click");
    var mousePosition = getMousePosition(canvas, e);

    if(awaitingDestination) {
      var planet = planetAtPoint(mousePosition);
      if(planet != null) {
        for(var i = 0; i < clickedPlanets.length; i++) {
          var p = clickedPlanets[i].sendFactor(planet, 0.5);
        }
      }
      clickedPlanets = null;
      awaitingDestination = false;
    } else {
      if(selectStart == null) {
        selectStart = mousePosition;
      }
      selectEnd = mousePosition;
      clickedPlanets = planetsInRectangle(selectStart, selectEnd, gameState.players[1]);
      if(clickedPlanets != null && clickedPlanets.length > 0) {
        awaitingDestination = true;
      } else {
        clickedPlanets = null;
      }
    }
    selectStart = null;
    selectEnd = null;
  });

  function Player(name, color, productionFactor) {
    this.name = name;
    this.color = color;
    this.productionFactor = productionFactor;
    this.planetCount = 0;
  }

  function pickSources(player) {
    var ret = [];

    for(var i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];

      if(planet.owner === player && planet.ships >= 10) {
        ret.push(planet);
      }
    }
    return ret;
  }

  function pickDest(player, sources) {
    var bestValue = 0;
    var best = null;

    var maxShips = 0;

    var mx = 0, my = 0;

    for(var i = 0; i < sources.length; i++) {
      var planet = sources[i];
      mx += planet.x;
      my += planet.y;
    }

    mx /= sources.length;
    my /= sources.length;

    for(var i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];
      if(planet.ships > maxShips) {
        maxShips = planet.ships;
      }
    }

    for(var i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];
      var value;

      value = maxShips - planet.ships;
      if(planet.owner !== player) {
        value += maxShips;
        value *= planet.productionRate;
      } else {
        continue;
      }
      value /= dist(mx, my, planet.x, planet.y);
      if(value > bestValue) {
        bestValue = value;
        best = planet;
      }
    }
    return best;
  }

  Player.prototype.aiTick = function() {
    var sources = pickSources(this);
    if(sources.length > 0) {
      var dest = pickDest(this, sources);
      if(dest != null) {
        for(var i = 0; i < sources.length; i++) {
          var p = sources[i].sendFactor(dest, 0.5);
        }
      }
    }
  };

  function Planet(x, y, size, ships, owner) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.ships = ships;
    this.owner = owner;
    this.owner.planetCount++;

    this.productionRate = size / 10;
  }

  Planet.prototype.arrival = function(fleet) {
    if(this.owner === fleet.owner) {
      this.ships += fleet.ships;
    } else {
      var shift = Math.min(fleet.ships, this.ships);
      this.ships -= shift;
      fleet.ships -= shift;
      if(this.ships == 0) {
        this.claimedBy(fleet.owner);
        this.arrival(fleet);
      }
    }
  };

  Planet.prototype.claimedBy = function(owner) {
    this.owner.planetCount--;
    console.log("player " + this.owner.name + " has " + this.owner.planetCount + " planets");
    owner.planetCount++;  
    this.owner = owner;
  };

  Planet.prototype.sendFactor = function(dest, factor) {
    if(this === dest) {
      return;
    }
    if(factor * this.ships >= 1) {
      console.log()
      var count = Math.floor((Math.round(this.ships) + Math.floor(1 / factor) - 1) * factor);
      gameState.fleets.push(new Fleet(this, 40, count, dest));
      console.log("send from " + this.owner.name + " to " + dest.owner.name);
      this.ships -= count;
    }
  }

  function Fleet(src, speed, ships, dest) {
    this.speed = speed;
    this.ships = ships;
    this.owner = src.owner;
    this.dest = dest;

    var x = src.x;
    var y = src.y;
    var vx = dest.x - x;
    var vy = dest.y - y;
    var vd = len(vx, vy);
    vx /= vd;
    vy /= vd;
    this.x = x + vx * src.size;
    this.y = y + vy * src.size;
    this.vx = vx * speed;
    this.vy = vy * speed;
  }

  function GameState() {
    this.players = [
      new Player("neutral", "rgb(100, 100, 100)", 0),
      new Player("p1", "rgb(10, 10, 200)", 1),
      new Player("p2", "rgb(200, 10, 10)", 1)
    ];
    this.planets = []
    this.fleets = []

    for(var i = 0; i < this.players.length; i++) {
      this.players[i].planetCount = 0;
    }

    for(var i = 0; i < 10; i++) {
      this.planets.push(makeRandomPlanet(this.players[0]));
    }

    this.planets.push(new Planet(100, 100, 20, 5, this.players[1]));
    this.planets.push(new Planet(400, 400, 20, 5, this.players[2]));
  }

  function makeRandomPlanet(owner) {
    var ships = Math.floor(Math.random() * 50);
    return new Planet(Math.random() * canvas.width, Math.random() * canvas.height, (Math.random() + 1) * 10, ships, owner);
  }

  function reset() {
    gameState = new GameState();
    clickedPlanets = null;
    awaitingDestination = false;
  };

  // Update game objects
  function update(dt) {
    for(var i = 0; i < gameState.fleets.length; i++) {
      var fleet = gameState.fleets[i];
      fleet.x += fleet.vx * dt;
      fleet.y += fleet.vy * dt;
      if(dist(fleet.x, fleet.y, fleet.dest.x, fleet.dest.y) < fleet.dest.size + 5) {
        fleet.dest.arrival(fleet)
        gameState.fleets.splice(i, 1);
        i--;
      }
    }

    for(var i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];
      planet.ships += planet.productionRate * planet.owner.productionFactor * dt;
    }

    var activePlayers = 0;
    for(var i = 0; i < gameState.players.length; i++) {
      var player = gameState.players[i];
      if(player.productionFactor > 0 && player.planetCount > 0) {
        activePlayers++;
      }
    }
    if(activePlayers == 1) {
      reset();
    }

    gameState.players[1].aiTick();
    gameState.players[2].aiTick();
  };

  // Draw everything
  function render() {
    ctx.fillStyle = "rgb(10, 10, 10)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(var i = 0; i < gameState.fleets.length; i++) {
      var fleet = gameState.fleets[i];
      ctx.strokeStyle = fleet.owner.color;
      ctx.fillStyle = fleet.owner.color;
      ctx.beginPath();
      ctx.arc(fleet.x, fleet.y, 3, 0, 2 * Math.PI);
      ctx.fill();
      var fleet = gameState.fleets[i];
      ctx.moveTo(fleet.x, fleet.y);
      var px = fleet.x + fleet.vx*10;
      var py = fleet.y + fleet.vy*10;
      ctx.lineTo(px, py);
    }

    for(var i = 0; i < gameState.planets.length; i++) {
      var planet = gameState.planets[i];
      ctx.fillStyle = planet.owner.color;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.size, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "rgb(250, 250, 250)";
      ctx.font = "12px Helvetica";
      ctx.textAlign = "center"; //center
      ctx.textBaseline = "middle";
      ctx.fillText(Math.floor(planet.ships), planet.x, planet.y);
    }

    if(clickedPlanets != null) {
      for(var i = 0; i < clickedPlanets.length; i++) {
        var planet = clickedPlanets[i];
        ctx.strokeStyle = "rgb(200, 200, 200)";
        // ctx.fillStyle = "rgb(200, 200, 200)";
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.size + 5, 0, 2 * Math.PI);
        ctx.stroke();
        // ctx.fill();
      }
    }

    if(selectStart != null) {
      ctx.strokeStyle = "rgb(200, 200, 200)";
      ctx.strokeRect(selectStart.x, selectStart.y, selectEnd.x - selectStart.x, selectEnd.y - selectStart.y);
    }

  };

  // The main game loop
  var main = function () {
    var now = Date.now();
    var delta = now - then;

    update(delta / 1000);
    render();

    then = now;
  };

  reset();
  var then = Date.now();
  setInterval(main, 16);
  
  return {
    reset: reset
  };
};

var game = Game("#gameview");