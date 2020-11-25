"use strict";
let canvas;
let context;

const settings = {
  color: '#FFBD71',
  center: {
    radius_pc: 15,
    darker: 25
  },
  field: {
    radius_pc: 90
  },
  player: {
    radius: 10,
    velocity: 20
  }
}

const state = {
  player: {
    distanceFromCenter_pc: 50,
    degree: 0
  },
  keyPressed: {
    space: false
  }
}

let secondsPassed = 0;
let oldTimeStamp = 0;


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

/* #region UPDATE FUNCTIONS */
function update(secondsPassed) {
  updatePlayerPosition(secondsPassed);
}

function updatePlayerPosition(secondsPassed) {
  // Move angle
  state.player.degree = getUpdatedPlayerAngle(secondsPassed, 'SAME_VELOCITY')

  // Move radius
  state.player.distanceFromCenter_pc -= 0.2;
  if (state.keyPressed.space) {
    state.player.distanceFromCenter_pc += 0.5;
  }

  /// Center and field bounding
  if (state.player.distanceFromCenter_pc <= getLowestPlayerDistanceFromCenter_pc()) {
    state.player.distanceFromCenter_pc = getLowestPlayerDistanceFromCenter_pc();
  }
  if (state.player.distanceFromCenter_pc >= getHighestPlayerDistanceFromCenter_pc()) {
    state.player.distanceFromCenter_pc = getHighestPlayerDistanceFromCenter_pc();
  }
}

function getUpdatedPlayerAngle(secondsPassed, mode) {
  if (mode === 'SAME_VELOCITY') {
    return (state.player.degree + ((settings.player.velocity * secondsPassed) / (state.player.distanceFromCenter_pc / 100))) % 360
  }
  else if (mode === 'SAME_D_ANGLE') {
    return (state.player.degree + (settings.player.velocity * secondsPassed)) % 360
  }
}

/* #endregion */

/* #region DRAWING FUNCTIONS */

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
  const [x, y] = getCenter()
  const radius = percentCanvasToPixelSize(settings.field.radius_pc);

  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI, false);
  context.fillStyle = settings.color;
  context.fill();
}

function drawCenterCircle() {
  const [x, y] = getCenter()
  const radius = percentCanvasToPixelSize(settings.center.radius_pc);

  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI, false);
  context.fillStyle = tinycolor(settings.color).darken(settings.center.darker).toHexString();
  context.fill();
}

function drawPlayer() {
  const radius = settings.player.radius;
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree)
  const cornerRadius = 2;

  context.save();
  context.translate(playerX, playerY)
  context.rotate(degreeToRadian(state.player.degree))

  context.beginPath();
  //  context.moveTo(cornerRadius, 0);
  context.arcTo(radius, -radius, radius, radius, cornerRadius);
  context.arcTo(radius, radius, -radius, radius, cornerRadius);
  context.arcTo(-radius, radius, -radius, -radius, cornerRadius);
  context.arcTo(-radius, -radius, radius, -radius, cornerRadius);
  context.closePath();
  context.fillStyle = tinycolor(settings.color).lighten(10).toHexString();
  context.fill();

  context.restore();
}

/* #endregion */

/* #region UTIL FUNCTIONS */

function getCenter() {
  return [canvas.width / 2, canvas.height / 2]
}

function percentCanvasToPixelSize(percentFromCenter) {
  return percentFromCenter / 100 * canvas.width / 2
}

function getLowestPlayerDistanceFromCenter_pc() {
  return settings.center.radius_pc + (settings.player.radius / (canvas.width / 2) * 100)
}

function getHighestPlayerDistanceFromCenter_pc() {
  return settings.field.radius_pc - (settings.player.radius / (canvas.width / 2) * 100)
}


function polarPercentToCartesian(percentFromCenter, degree) {
  const [x, y] = polarToCartesian(percentCanvasToPixelSize(percentFromCenter), degree)
  const [centerX, centerY] = getCenter()
  return [x + centerX, y + centerY]
}

function cartesianToPolarPercent(x, y) {
  const r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  const degree = radianToDegree(Math.atan(y / x));
  return [r, degree];
}

function polarToCartesian(radius, degree) {
  const x = radius * Math.cos(degreeToRadian(degree));
  const y = radius * Math.sin(degreeToRadian(degree));
  return [x, y];
}


function degreeToRadian(degree) {
  return degree * Math.PI / 180;
}

function radianToDegree(radian) {
  return radian * 180 / Math.PI
}

/* #endregion */