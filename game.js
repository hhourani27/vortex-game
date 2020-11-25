"use strict";
let canvas;
let context;

const settings = {
  color: '#FFBD71',
  center: {
    radius_pc: 20,
    darker: 25
  },
  field: {
    radius_pc: 90
  },
  player: {
    startingDistance_pc: 50,
    starting_degree: 0,
    radius: 10,
    velocity: 20
  },
  trail: {
    frequency: 0.25,
  }
}

const state = {
  player: {
    distanceFromCenter_pc: settings.player.startingDistance_pc,
    degree: settings.player.starting_degree,
  },
  keyPressed: {
    space: false
  },
  trail: []
}

let secondsPassed = 0;
let oldTimeStamp = 0;
let lastTrailTimeStamp = 0;


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

  update(secondsPassed, timeStamp);
  draw();
  window.requestAnimationFrame(gameLoop);
}

/* #region UPDATE FUNCTIONS */
function update(secondsPassed, timeStamp) {
  updatePlayerPosition(secondsPassed);
  updateTrail(secondsPassed, timeStamp);
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

function updateTrail(secondsPassed, timeStamp) {
  if (timeStamp - lastTrailTimeStamp > settings.trail.frequency * 1000) {
    state.trail.push({
      distanceFromCenter_pc: state.player.distanceFromCenter_pc,
      degree: state.player.degree
    })
    lastTrailTimeStamp = timeStamp
  }
}

/* #endregion */

/* #region DRAWING FUNCTIONS */

function draw() {
  drawBackground();
  drawFieldCircle();
  drawCenterCircle();
  drawTrail();
  drawPlayer();
}

function drawBackground() {
  context.fillStyle = tinycolor(settings.color).lighten(settings.center.darker).toHexString();
  context.fillRect(0, 0, canvas.width, canvas.height)
}

function drawFieldCircle() {
  const [x, y] = getCenter()
  const radius = percentCanvasToPixelSize(settings.field.radius_pc);

  drawCircle(x, y, radius, settings.color)
}

function drawCenterCircle() {
  const [x, y] = getCenter()
  const radius = percentCanvasToPixelSize(settings.center.radius_pc);
  const color = tinycolor(settings.color).darken(settings.center.darker).toHexString()

  drawCircle(x, y, radius, color)

}

function drawPlayer() {
  const radius = settings.player.radius;
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree)
  const degree = state.player.degree;
  const color = tinycolor(settings.color).lighten(10).toHexString()
  drawSquare(playerX, playerY, radius, degree, color);

}

function drawTrail() {
  const color = tinycolor(settings.color).lighten(20).toHexString()
  state.trail.forEach(square => {
    const [x, y] = polarPercentToCartesian(square.distanceFromCenter_pc, square.degree);
    const radius = settings.player.radius;
    drawSquare(x, y, radius, square.degree, color)
  })
}

function drawSquare(x, y, radius, rotation, color) {
  const cornerRadius = 2;

  context.save();
  context.translate(x, y)
  context.rotate(degreeToRadian(rotation))

  context.beginPath();
  //  context.moveTo(cornerRadius, 0);
  context.arcTo(radius, -radius, radius, radius, cornerRadius);
  context.arcTo(radius, radius, -radius, radius, cornerRadius);
  context.arcTo(-radius, radius, -radius, -radius, cornerRadius);
  context.arcTo(-radius, -radius, radius, -radius, cornerRadius);
  context.closePath();
  context.fillStyle = color;
  context.fill();

  context.restore();
}

function drawCircle(x, y, radius, color) {
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI, false);
  context.fillStyle = color;
  context.fill();
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

function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(X2 - X1, 2) + Math.pow(y2 - y1, 2))
}

function degreeToRadian(degree) {
  return degree * Math.PI / 180;
}

function radianToDegree(radian) {
  return radian * 180 / Math.PI
}

/* #endregion */