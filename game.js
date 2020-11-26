"use strict";
let canvas;
let context;

const settings = {
  colors: [
    {
      name: 'yellow',
      color: '#FFBD71'
    }
  ],
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
    velocity: 20,
    degreeIncrease: 0.5,
    degreeDecrease: 0.3
  },
  trail: {
    frequency: 0.25,
  },
  bomb: {
    frequency: 1,
    radius: 5,
    explosionRadius: 100
  },
  maxTurn: 3
}

const state = {
  status: 'INIT',
  initialColor: 'yellow',
  turn: 1,
  player: {
    distanceFromCenter_pc: settings.player.startingDistance_pc,
    degree: settings.player.starting_degree,
  },
  keyPressed: {
    space: false,
    p: false
  },
  collision: false,
  bombs: [],
  trail: [],
}

let secondsPassed = 0;
let oldTimeStamp = 0;
let lastTrailTimeStamp = 0;
let lastBombTimeStamp = 0;


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
      case 'p':
      case 'P':
        state.keyPressed.p = true;
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
  updateStatus();
  if (state.status === 'RUN') {
    updatePlayerPositionAndTurn(secondsPassed);
    updateTrail(timeStamp);
    updateTrailCollision();
    updateBomb(timeStamp);
    updateBombCollision();
  }
}

function updateStatus() {
  if (state.status === 'INIT') {
    if (state.keyPressed.space) {
      state.status = 'RUN'
    }
  }
  else if (state.status === 'RUN') {
    if (state.keyPressed.p) {
      state.status = 'PAUSE';
      state.keyPressed.p = false;
    }
    if (state.collision) {
      state.status = 'LOST';
    }
  }
  else if (state.status === 'PAUSE') {
    if (state.keyPressed.p) {
      state.status = 'RUN';
      state.keyPressed.p = false;
    }
    else if (state.keyPressed.space) {
      state.status = 'RUN';
    }
  }
}

function updatePlayerPositionAndTurn(secondsPassed) {
  // Move angle and update turn
  const updatedDegree = getUpdatedPlayerAngle(secondsPassed, 'SAME_VELOCITY')
  if (state.player.degree > updatedDegree)
    state.turn += 1
  state.player.degree = updatedDegree

  // Move radius
  state.player.distanceFromCenter_pc -= settings.player.degreeDecrease;
  if (state.keyPressed.space) {
    state.player.distanceFromCenter_pc += settings.player.degreeIncrease;
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

function updateTrail(timeStamp) {
  if (timeStamp - lastTrailTimeStamp > settings.trail.frequency * 1000) {
    state.trail.push({
      distanceFromCenter_pc: state.player.distanceFromCenter_pc,
      degree: state.player.degree,
      status: 'NEW'
    })
    lastTrailTimeStamp = timeStamp
  }

  const newTrails = state.trail.filter(tr => tr.status === 'NEW');
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree);
  newTrails.forEach(tr => {
    const [trX, trY] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
    if (distance(playerX, playerY, trX, trY) > settings.player.radius * 2) {
      tr.status = 'OBSTACLE'
    }
  })
}

function updateTrailCollision() {
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree);
  const obstacles = state.trail.filter(tr => tr.status === 'OBSTACLE');
  obstacles.some(tr => {
    const [trX, trY] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
    if (distance(playerX, playerY, trX, trY) <= settings.player.radius * 2) {
      state.collision = true;
      return true;
    }
  })

}

function updateBomb(timeStamp) {
  if (timeStamp - lastBombTimeStamp > settings.bomb.frequency * 1000) {
    const fieldRadius = settings.field.radius_pc;
    const centerRadius = settings.center.radius_pc;
    const bombRadius = settings.bomb.radius / (canvas.width / 2);
    const max = fieldRadius - bombRadius;
    const min = centerRadius + bombRadius

    const bombDistance = Math.random() * (max - min) + min
    const bombDegree = Math.random() * 360
    state.bombs.push({
      distanceFromCenter_pc: bombDistance,
      degree: bombDegree,
      state: 'NEW'
    })
    lastBombTimeStamp = timeStamp
  }

}

function updateBombCollision() {
  // Detect bomb collisions
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree);
  state.bombs.some(bomb => {
    const [bombX, bombY] = polarPercentToCartesian(bomb.distanceFromCenter_pc, bomb.degree);
    if (distance(playerX, playerY, bombX, bombY) <= settings.player.radius + settings.bomb.radius) {
      bomb.status = 'EXPLODED';

      //Destroy trails
      state.trail.forEach(tr => {
        const [trX, trY] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
        if (distance(trX, trY, bombX, bombY) <= settings.bomb.explosionRadius) {
          tr.status = 'DESTROYED'
        }
      })
    }
  })

  //Remove destroyed trails
  state.trail = state.trail.filter(tr => tr.status != 'DESTROYED');

  //Remove bomb
  state.bombs = state.bombs.filter(bomb => bomb.status != 'EXPLODED');
}


/* #endregion */

/* #region DRAWING FUNCTIONS */

function draw() {
  drawBackground();
  drawFieldCircle();
  drawCenterCircle();
  drawTrail();
  drawBombs();
  drawPlayer();
  drawState();
}

function drawBackground() {
  const initialColor = getCurrentColor()
  const color = tinycolor(initialColor).lighten(settings.center.darker).toHexString()

  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height)
}

function drawFieldCircle() {
  const [x, y] = getCenter()
  const radius = percentCanvasToPixelSize(settings.field.radius_pc);
  const color = getCurrentColor()

  drawCircle(x, y, radius, color)
}

function drawCenterCircle() {
  const [x, y] = getCenter()
  const radius = percentCanvasToPixelSize(settings.center.radius_pc);
  const initialColor = getCurrentColor()
  const color = tinycolor(initialColor).darken(settings.center.darker).toHexString()

  drawCircle(x, y, radius, color)

  //Draw text
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '48px sans-serif';
  context.fillStyle = 'white';
  context.fillText(state.turn, x, y);

}

function drawPlayer() {
  const radius = settings.player.radius;
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree)
  const degree = state.player.degree;
  const initialColor = getCurrentColor()
  const color = tinycolor(initialColor).lighten(10).toHexString()
  drawSquare(playerX, playerY, radius, degree, color);

}

function drawTrail() {
  const initialColor = getCurrentColor()
  const color = tinycolor(initialColor).lighten(20).toHexString()
  state.trail.forEach(tr => {
    const [x, y] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
    const radius = settings.player.radius;
    drawSquare(x, y, radius, tr.degree, color)
  })
}

function drawBombs() {
  const color = 'white';
  state.bombs.forEach(bomb => {
    const [x, y] = polarPercentToCartesian(bomb.distanceFromCenter_pc, bomb.degree);
    const radius = settings.bomb.radius;
    drawCircle(x, y, radius, color);
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

function drawState() {
  context.fillStyle = 'black'
  context.font = '10px serif';
  const s = JSON.stringify(state, null, 2);
  document.getElementById('state').innerHTML = s
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
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

function degreeToRadian(degree) {
  return degree * Math.PI / 180;
}

function radianToDegree(radian) {
  return radian * 180 / Math.PI
}

function getCurrentColor() {
  const initialColorName = state.initialColor;
  const color = settings.colors.filter(c => c.name === initialColorName)[0];
  return color.color;
}

/* #endregion */