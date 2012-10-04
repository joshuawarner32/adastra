// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 512;
canvas.height = 480;
document.body.appendChild(canvas);

var keysDown = {};

var gameState = null;

var clickedPlanets = null;
var awaitingDestination = false;
var selectStart = null;
var selectEnd = null;

var state = null;

function getMousePosition(element, event) { /* returns Cell with .row and .column properties */
  var rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function len(x, y) {
	return Math.sqrt(x*x + y*y);
}

function dist(x1, y1, x2, y2) {
	return len(x1 - x2, y1 - y2);
}

function planetAtPoint(pos) {
	for(var i = 0; i < gameState.planets.length; i++) {
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

addEventListener("keydown", function(e) {
	keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function(e) {
	delete keysDown[e.keyCode];
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
		clickedPlanets = planetsInRectangle(selectStart, selectEnd, "p1");
	}
}, false);

addEventListener("click", function(e) {
	console.log("click");
	var mousePosition = getMousePosition(canvas, e);

	if(awaitingDestination) {
		var planet = planetAtPoint(mousePosition);
		if(planet != null) {
			for(var i = 0; i < clickedPlanets.length; i++) {
				var p = sendFactor(clickedPlanets[i], planet, 0.5);
			}
		}
		clickedPlanets = null;
		awaitingDestination = false;
	} else {
		if(selectStart == null) {
			selectStart = mousePosition;
		}
		selectEnd = mousePosition;
		clickedPlanets = planetsInRectangle(selectStart, selectEnd, "p1");
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
			value *= planet.prod;
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

function aiTick(player) {
	var sources = pickSources(player.name);
	if(sources.length > 0) {
		var dest = pickDest(player.name, sources);
		if(dest != null) {
			for(var i = 0; i < sources.length; i++) {
				sendFactor(sources[i], dest, 0.5);
			}
		}
	}
};

function fleetArrival(planet, fleet) {
	if(planet.owner === fleet.owner) {
		planet.ships += fleet.ships;
	} else {
		var shift = Math.min(fleet.ships, planet.ships);
		planet.ships -= shift;
		fleet.ships -= shift;
		if(planet.ships == 0) {
			claimedPlanet(fleet.owner, planet);
			fleetArrival(planet, fleet);
		}
	}
}

function updatePlanetCount(owner, delta) {
	gameState.players[owner].planetCount += delta;
	console.log("player " + owner + " now has " + gameState.players[owner].planetCount + " planets");
}

function claimedPlanet(owner, planet) {
	updatePlanetCount(planet.owner, -1);
	updatePlanetCount(owner, 1);
	planet.owner = owner;
}

function sendFactor(planet, destPlanet, factor) {
	if(planet === destPlanet) {
		return;
	}
	if(factor * planet.ships >= 1) {
		var count = Math.floor((Math.round(planet.ships) + Math.floor(1 / factor) - 1) * factor);
		gameState.fleets.push(new Fleet(planet, 40, count, destPlanet));
		console.log("send from " + getPlayer(planet.owner).name + " to " + getPlayer(destPlanet.owner).name);
		planet.ships -= count;
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

function requestJSON(url, handler) {
	var req = new XMLHttpRequest();
	req.onreadystatechange = function(event) {
  	if(req.readyState == 4 && req.status == 200) {
  		handler(JSON.parse(req.responseText));
  	}
	};
	req.open("GET", url, true);
	req.send();
}

function gameStateArrival(data) {
	console.log("got initial data!");
	console.log(data);

	gameState.players = {};
	gameState.playersList = [];
	gameState.fleets = data.fleets;
	gameState.planets = data.planets;

	for(var i = 0; i < data.players.length; i++) {
		var player = data.players[i];
		gameState.players[player.name] = player;
		gameState.playersList.push(player.name);
		player.planetCount = 0;
	}
	for(var i = 0; i < gameState.planets.length; i++) {
		var planet = gameState.planets[i];
		gameState.players[planet.owner].planetCount++;
	}
	state = game;
}

function requestData() {
	requestJSON("/game/new", function(d) {
		console.log("got redirect url!");
		requestJSON(d.url, gameStateArrival);
	});
}

function GameState() {}

function reset() {
	gameState = new GameState();
	clickedPlanets = null;
	awaitingDestination = false;

	state = await;
	requestData();
}

function getPlayer(player) {
	return gameState.players[player];
}

function playerColor(player) {
	return gameState.players[player].color;
}

var game = {
	update: function(dt) {
		for(var i = 0; i < gameState.fleets.length; i++) {
			var fleet = gameState.fleets[i];
			fleet.x += fleet.vx * dt;
			fleet.y += fleet.vy * dt;
			if(dist(fleet.x, fleet.y, fleet.dest.x, fleet.dest.y) < fleet.dest.size + 5) {
				fleetArrival(fleet.dest, fleet)
				gameState.fleets.splice(i, 1);
				i--;
			}
		}

		for(var i = 0; i < gameState.planets.length; i++) {
			var planet = gameState.planets[i];
			planet.ships += planet.prod * getPlayer(planet.owner).prod * dt;
		}

		var activePlayers = 0;
		for(var i = 0; i < gameState.playersList.length; i++) {
			var player = gameState.players[gameState.playersList[i]];
			if(player.prod > 0 && player.planetCount > 0) {
				activePlayers++;
			}
		}
		if(activePlayers == 1) {
			reset();
		} else {
			aiTick(gameState.players["p1"]);
			aiTick(gameState.players["p2"]);
		}
	},

	render: function() {
		ctx.fillStyle = "rgb(10, 10, 10)";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		for(var i = 0; i < gameState.fleets.length; i++) {
			var fleet = gameState.fleets[i];
			ctx.fillStyle = playerColor(fleet.owner);
			ctx.beginPath();
			ctx.arc(fleet.x, fleet.y, 3, 0, 2 * Math.PI);
			ctx.fill();
		}

		for(var i = 0; i < gameState.planets.length; i++) {
			var planet = gameState.planets[i];
			ctx.fillStyle = playerColor(planet.owner);
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
	}
};

var await = {
	update: function(dt) {},
	render: function() {
		ctx.fillStyle = "rgb(10, 10, 10)";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = "rgb(250, 250, 250)";
	  ctx.font = "12px Helvetica";
	  ctx.textAlign = "center";
	  ctx.textBaseline = "middle";
		ctx.fillText("Awaiting Game State", canvas.width / 2, canvas.height / 2);
	}
};

var main = function () {
	var now = Date.now();
	var delta = now - then;

	state.update(delta / 1000);
	state.render();

	then = now;
};

reset();
var then = Date.now();
setInterval(main, 16);
