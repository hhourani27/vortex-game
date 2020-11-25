"use strict";
let canvas;
let context;

const settings = {
  color: '#FFBD71',
  center: {
    diameterpc: 15,
    darker: 25
  },
  outer: {
    diameterpc: 90
  },
  player: {
    size: 20
  }
}

const state = {
  player: {
    distanceFromCenterpc: 50,
    degree: 270
  },
  keyPressed: {
    space: false
  }
}

let secondsPassed = 0;
let oldTimeStamp = 0;
let movingSpeed = 30;


window.onload = init;

function init() {
  // Get a reference to the canvas 
  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');

  setupEvents();

  window.requestAnimationFrame(gameLoop);
}

function setupEvents() {
  document.addEventListener('keydown', function (event) {
    switch (event.key) {
      case ' ':
        state.keyPressed.space = true
        break;
      default:
        break;
    }
  });

  document.addEventListener('keyup', function (event) {
    switch (event.key) {
      case ' ':
        state.keyPressed.space = false
        break;
      default:
        break;
    }
  });

}

function gameLoop(timeStamp) {

  // Calculate how much time has passed
  secondsPassed = (timeStamp - oldTimeStamp) / 1000;
  oldTimeStamp = timeStamp;

  update(secondsPassed);
  draw();
  window.requestAnimationFrame(gameLoop);
}

function update(secondsPassed) {
  updatePlayerPosition
}

function updatePlayerPosition1(secondsPassed) {
  state.player.degree = (state.player.degree + (movingSpeed * secondsPassed)) % 360

  state.player.distanceFromCenterpc -= 0.2;
  if (state.keyPressed.space) {
    state.player.distanceFromCenterpc += 0.3;
  }
  if (state.player.distanceFromCenterpc <= settings.center.diameterpc) {
    state.player.distanceFromCenterpc = settings.center.diameterpc;
  }
}

function updatePlayerPosition2(secondsPassed) {
  state.player.degree = (state.player.degree + (movingSpeed * secondsPassed)) % 360

  state.player.distanceFromCenterpc -= 0.2;
  if (state.keyPressed.space) {
    state.player.distanceFromCenterpc += 0.3;
  }
  if (state.player.distanceFromCenterpc <= settings.center.diameterpc) {
    state.player.distanceFromCenterpc = settings.center.diameterpc;
  }
}

function draw() {
  drawBackground();
  drawFieldCircle();
  drawCenterCircle();
  drawPlayer();
}

function drawBackground() {
  context.fillStyle = tinycolor(settings.color).lighten(settings.center.darker).toHexString();
  context.fillRect(0, 0, canvas.width, canvas.height)
}

function drawFieldCircle() {
  const x = canvas.width / 2;
  const y = canvas.height / 2;
  const radius = canvas.width * settings.outer.diameterpc / 100 / 2;

  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI, false);
  context.fillStyle = settings.color;
  context.fill();
}

function drawCenterCircle() {
  const x = canvas.width / 2;
  const y = canvas.height / 2;
  const radius = canvas.width * settings.center.diameterpc / 100 / 2;

  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI, false);
  context.fillStyle = tinycolor(settings.color).darken(settings.center.darker).toHexString();
  context.fill();
}

function drawPlayer() {
  const size = settings.player.size;
  let x = (state.player.distanceFromCenterpc * canvas.width / 2 / 100) * Math.cos(degreeToRadian(state.player.degree)) + (canvas.width / 2) - size / 2;
  let y = (state.player.distanceFromCenterpc * canvas.width / 2 / 100) * Math.sin(degreeToRadian(state.player.degree)) + (canvas.height / 2) - size / 2;
  const r = 2;

  context.save();
  context.translate(x, y)
  context.rotate(degreeToRadian(state.player.degree))
  context.beginPath();
  /*
    context.moveTo(x+r, y);
    context.arcTo(x+size, y,   x+size, y+size, r);
    context.arcTo(x+size, y+size, x,   y+size, r);
    context.arcTo(x,   y+size, x,   y,   r);
    context.arcTo(x,   y,   x+size, y,   r);
    */
  context.moveTo(r, 0);
  context.arcTo(size, 0, size, size, r);
  context.arcTo(size, size, 0, size, r);
  context.arcTo(0, size, 0, 0, r);
  context.arcTo(0, 0, size, 0, r);
  context.closePath();
  context.fillStyle = tinycolor(settings.color).lighten(10).toHexString();
  context.fill();
  context.restore();
}

function degreeToRadian(degree) {
  return degree * Math.PI / 180;
}