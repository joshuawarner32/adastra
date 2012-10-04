

var http = require('http');
var fs = require('fs');
var path = require('path');

var games = [];
var freeGames = [];

function findNewGameId() {
  if(freeGames.length > 0) {
    return freeGames.pop();
  } else {
    var id = games.length;
    games.push(new Game());
    return id;
  }
}

function Player(name, color, prod) {
  this.name = name;
  this.color = color;
  this.prod = prod;
}

function Planet(x, y, size, ships, owner) {
  this.x = x;
  this.y = y;
  this.size = size;
  this.ships = ships;
  this.owner = owner;
  this.prod = size / 10;
}

function makeRandomPlanet(owner) {
  var ships = Math.floor(Math.random() * 50);
  return new Planet(Math.random() * 512, Math.random() * 400, (Math.random() + 1) * 10, ships, owner);
}

function Game() {
  this.players = [
    new Player("neutral", "rgb(100, 100, 100)", 0),
    new Player("p1", "rgb(10, 10, 200)", 1),
    new Player("p2", "rgb(200, 10, 10)", 1)];

  this.planets = [];
  this.fleets = [];

  for(var i = 0; i < 10; i++) {
    this.planets.push(makeRandomPlanet("neutral"));
  }

  this.planets.push(new Planet(100, 100, 20, 5, "p1"));
  this.planets.push(new Planet(400, 400, 20, 5, "p2"));
}

function respondWithJSON(response, data) {
  response.writeHead(200, {"Content-Type": "application/json"});
  var s = JSON.stringify(data);
  // console.log(s);
  response.end(s);
}

function newGame(request, response) {
  var id = findNewGameId();
  respondWithJSON(response, {url: "/game/" + id});
}

function notFound(request, response) {
  response.writeHead(404, {"Content-Type": "text/plain"});
  response.end("not found");
}

function processGame(request, response) {
  console.log("processGame " + request.url);

  var parts = request.url.split(path.sep);

  if(parts[2] == "new") {
    newGame(request, response);
  } else {
    var id = parseInt(parts[2]);
    var game = games[id];
    if(parts[3] == "reset") {
      game = new Game();
      games[id] = game;
      respondWithJSON(response, game);
    } else if(parts[3] == "close") {
      games[id] = null;
      freeGames.push(id);
      respondWithJSON(response, null);
    } else {
      respondWithJSON(response, game);
    }
  }
}

var mimeTypes = {
  ".js": "text/javascript",
  ".html": "text/html"
}

http.createServer(function (request, response) {
  if(request.url.indexOf("/game/") == 0) {
    processGame(request, response);
  } else {
    var filePath = request.url;
    fs.readFile(__dirname + "/public/" + filePath, function (err, data) {
      if (err) {
        response.writeHead(404);
        response.end(JSON.stringify(err));
        return;
      }
      var extname = path.extname(filePath);
      var mimeType = mimeTypes[extname];
      mimeType = mimeType || "text/html";
      response.writeHead(200, {"Content-Type": mimeType});
      response.end(data);
    });
  }
}).listen(process.env.PORT || 8080, "0.0.0.0");