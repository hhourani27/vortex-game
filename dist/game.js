"use strict";
const debug = false;

let canvas;
let ctx;

const config = {
  colors: [
    {
      name: 'yellow',
      background: '#FFF2CC',
      fieldBorder: '#FFC000',
      field: '#FFE699',
      centerBorder: '#FFF2CC',
      center: '#FFD966',
      playerBorder: '#BF9000',
      player: '#FFC000',
      trailBorder: '#FFC305',
      trail: '#FFD966',
    },
    {
      name: 'red',
      background: '#FFCECD',
      fieldBorder: '#FF7875',
      field: '#FF9B99',
      centerBorder: '#FFE0DF',
      center: '#FF7875',
      playerBorder: '#E9100B',
      player: '#F74F4B',
      trailBorder: '#F86F6C',
      trail: '#F9827F',
    },
    {
      name: 'blue',
      background: '#DAE3F3',
      fieldBorder: '#4472C4',
      field: '#8FAADC',
      centerBorder: '#DAE3F3',
      center: '#4472C4',
      playerBorder: '#2F5597',
      player: '#4472C4',
      trailBorder: '#5780CB',
      trail: '#658BCF',
    },
    {
      name: 'green',
      background: '#E2F0D9',
      fieldBorder: '#70AD47',
      field: '#A9D18E',
      centerBorder: '#E2F0D9',
      center: '#70AD47',
      playerBorder: '#548235',
      player: '#75B44A',
      trailBorder: '#78B64E',
      trail: '#91C36F',
    }
  ],
  field: {
    radius_pc: 90,
    borderWidth: 3,
  },
  center: {
    radius_pc: 20,
    darker: 25
  },
  player: {
    startingDistance_pc: 50,
    radius: 10,
    velocity: 15,
    degreeIncrease: 0.6,
    degreeDecrease: 0.3
  },
  trail: {
    frequency: 0.35,
  },
  bomb: {
    frequency: 3,
    radius: 5,
    explosionRadius: 100,
    explosionDuration: 0.25
  },
  initialColor: 'green',
  maxTurn: 3
}

const stateInit = {
  status: 'INIT',
  score: 1,
  highScore: null,
  color: '',
  nextColor: '',
  turn: 1,
  player: {
    distanceFromCenter_pc: config.player.startingDistance_pc,
    degree: 0,
  },
  keyPressed: {
    space: false,
    p: false
  },
  collision: false,
  timing: {
    gameTimeStamp: 0,
    lastGameTimeStamp: 0,
    lastTrailTimeStamp: -1000,
    lastBombTimeStamp: 0
  },
  bombs: [],
  trail: [],
}

let state = {};

// Timing variables
let lastLoopTimeStamp = 0;


window.onload = init;

function init() {
  // Get a reference to the canvas 
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  setupEvents();
  initState();

  window.requestAnimationFrame(gameLoop);
}

function setupEvents() {
  //Prevent space from scrolling
  window.addEventListener('keydown', function (event) {
    if (event.key === ' ') event.preventDefault();
  })

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

function initState() {
  state = JSON.parse(JSON.stringify(stateInit));
  state.color = config.initialColor
  state.nextColor = chooseColorExcluding(state.color);

  if (getHighScore())
    state.highScore = getHighScore();

}

function getHighScore() {
  return window.localStorage.getItem('highScore');
}

function setHighScore(score) {
  window.localStorage.setItem('highScore', score);
}

function gameLoop(timeStamp) {
  // Calculate how much time has passed
  const timePassedSinceLastLoop = (timeStamp - lastLoopTimeStamp);
  lastLoopTimeStamp = timeStamp;

  const gameTimeStamp = updateGameTimeStamp(timePassedSinceLastLoop);
  const timePassedSinceLastGameLoop = gameTimeStamp - state.timing.lastGameTimeStamp
  state.timing.lastGameTimeStamp = gameTimeStamp;

  update(timePassedSinceLastGameLoop, gameTimeStamp);
  draw(gameTimeStamp);
  window.requestAnimationFrame(gameLoop);
}

function updateGameTimeStamp(timePassedSinceLastLoop) {
  if (state.status === 'RUN') {
    state.timing.gameTimeStamp += timePassedSinceLastLoop
  }
  return state.timing.gameTimeStamp;
}

/* #region UPDATE FUNCTIONS */
function update(timePassedSinceLastGameLoop, gameTimeStamp) {
  if (state.status === 'RUN') {
    updateScore(gameTimeStamp);
    updatePlayerPositionAndTurn(timePassedSinceLastGameLoop);
    updateColor();
    updateTrail(gameTimeStamp);
    updateTrailCollision();
    updateBomb(gameTimeStamp);
    updateBombCollision(gameTimeStamp);
  }
  updateStatus();
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
      if (state.highScore)
        setHighScore(Math.max(state.score, state.highScore));
      else
        setHighScore(state.score)
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
  else if (state.status === 'LOST') {
    if (!state.keyPressed.space) {
      state.status = 'LOST_CAN_RESTART';
    }
  }
  else if (state.status === 'LOST_CAN_RESTART') {
    if (state.keyPressed.space) {
      initState();
      state.status = 'RUN';
      state.keyPressed.p = false;
    }
  }
}

function updateScore(gameTimeStamp) {
  state.score = Math.floor(gameTimeStamp * 1.25 / 1000) + 1;
}

function updatePlayerPositionAndTurn(timePassedSinceLastLoop) {
  const secondsPassed = timePassedSinceLastLoop / 1000
  // Move angle and update turn
  const updatedDegree = getUpdatedPlayerAngle(secondsPassed, 'SAME_VELOCITY')
  if (state.player.degree > updatedDegree)
    state.turn += 1
  state.player.degree = updatedDegree

  // Move radius
  state.player.distanceFromCenter_pc -= config.player.degreeDecrease;
  if (state.keyPressed.space) {
    state.player.distanceFromCenter_pc += config.player.degreeIncrease;
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
    return (state.player.degree + ((config.player.velocity * secondsPassed) / (state.player.distanceFromCenter_pc / 100))) % 360
  }
  else if (mode === 'SAME_D_ANGLE') {
    return (state.player.degree + (config.player.velocity * secondsPassed)) % 360
  }
}

function updateColor() {
  if (state.turn > config.maxTurn) {
    state.color = state.nextColor;
    state.nextColor = chooseColorExcluding(state.color);

    state.turn = 1;
  }
}

function updateTrail(timeStamp) {
  // Create a new Trail if the player moved enough distance
  if (timeStamp - state.timing.lastTrailTimeStamp > config.trail.frequency * 1000) {
    state.trail.push({
      distanceFromCenter_pc: state.player.distanceFromCenter_pc,
      degree: state.player.degree,
      color: state.color,
      status: 'NEW'
    })
    state.timing.lastTrailTimeStamp = timeStamp
  }

  // When a player got far enough of a new Trail, it becomes an obstacle
  const newTrails = state.trail.filter(tr => tr.status === 'NEW');
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree);
  newTrails.forEach(tr => {
    const [trX, trY] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
    if (distance(playerX, playerY, trX, trY) > config.player.radius * 2) {
      tr.status = 'OBSTACLE'
    }
  })
}

function updateTrailCollision() {
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree);
  const obstacles = state.trail.filter(tr => tr.status === 'OBSTACLE');
  const obstaclesSameColor = obstacles.filter(tr => tr.color === state.color);
  obstaclesSameColor.some(tr => {
    const [trX, trY] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
    if (distance(playerX, playerY, trX, trY) <= config.player.radius * 2) {
      state.collision = true;
      return true;
    }
  })

}

function updateBomb(timeStamp) {
  if (timeStamp - state.timing.lastBombTimeStamp > config.bomb.frequency * 1000) {
    const fieldRadius = config.field.radius_pc;
    const centerRadius = config.center.radius_pc;
    const bombRadius = config.bomb.radius / (canvas.width / 2) * 100;
    const max = fieldRadius - bombRadius;
    const min = centerRadius + bombRadius

    const bombDistance = Math.random() * (max - min) + min
    const bombDegree = Math.random() * 360

    state.bombs.push({
      distanceFromCenter_pc: bombDistance,
      degree: bombDegree,
      status: 'CHARGED'
    })
    state.timing.lastBombTimeStamp = timeStamp
  }

}

function updateBombCollision(timeStamp) {
  // Detect bomb collisions
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree);
  const chargedBombs = state.bombs.filter(b => b.status === 'CHARGED');

  //Detect collision with bombs
  chargedBombs.forEach(bomb => {
    const [bombX, bombY] = polarPercentToCartesian(bomb.distanceFromCenter_pc, bomb.degree);
    if (distance(playerX, playerY, bombX, bombY) <= config.player.radius + config.bomb.radius) {
      bomb.status = 'EXPLODED';
      bomb.collisionTimestamp = timeStamp;

      //Destroy trails
      state.trail.forEach(tr => {
        const [trX, trY] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
        if (distance(trX, trY, bombX, bombY) <= config.bomb.explosionRadius) {
          tr.status = 'DESTROYED'
        }
      })
    }
  })

  //Remove destroyed trails
  state.trail = state.trail.filter(tr => tr.status != 'DESTROYED');

  //Remove bomb
  state.bombs = state.bombs.filter(bomb => {
    if (bomb.status === 'EXPLODED' && (timeStamp - bomb.collisionTimestamp) / 1000 > config.bomb.explosionDuration)
      return false;
    return true;
  });
}


/* #endregion */

/* #region DRAWING FUNCTIONS */

function draw(timeStamp) {
  drawOutsideCanvas();
  drawHeader();
  drawFieldCircle();
  drawCenterCircle();
  drawTrail();
  drawBombs(timeStamp);
  drawPlayer();
  if (debug) drawState();
}

function drawOutsideCanvas() {
  const backgroundColor = getColorHexValue('background', state.color)

  document.body.style.backgroundColor = backgroundColor;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const textColor = getColorHexValue('player', state.color);
  document.body.style.color = textColor;
}

function drawHeader() {

  ctx.fillStyle = getColorHexValue('player', state.color);
  ctx.textBaseline = 'middle';
  // Draw Score
  ctx.font = '400 20px "Open Sans"';
  ctx.textAlign = 'left';
  const scoreText = 'Score : ' + state.score;
  ctx.fillText(scoreText, 10, 30);

  // Draw Highscore
  if (state.highScore) {
    ctx.font = '400 16px "Open Sans"';
    const highScoreText = '👑 ' + state.highScore;
    ctx.fillText(highScoreText, 10, 60)
  }
  // Draw command text
  ctx.font = '400 15px "Open Sans"';
  ctx.textAlign = 'right';

  let commandText = '';
  switch (state.status) {
    case 'INIT':
      commandText = 'Press Space to start';
      break;
    case 'RUN':
      commandText = 'Press P to pause';
      break;
    case 'PAUSE':
      commandText = 'Press Space to run';
      break;
    case 'LOST':
    case 'LOST_CAN_RESTART':
      commandText = 'Press Space to restart';
      break;
  }
  ctx.fillText(commandText, canvas.width - 10, 30);
}

function drawFieldCircle() {
  const [x, y] = getCenter()
  const radius = percentCanvasToPixelSize(config.field.radius_pc);
  const fillColor = getColorHexValue('field', state.color)
  const strokeColor = getColorHexValue('fieldBorder', state.color);

  drawCircle(x, y, radius, fillColor, strokeColor, config.field.borderWidth)
}

function drawCenterCircle() {
  const [x, y] = getCenter()
  const centerRadius = percentCanvasToPixelSize(config.center.radius_pc);
  const centerFillColor = getColorHexValue('center', state.color);

  drawCircle(x, y, centerRadius, centerFillColor)

  //Draw text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '400 60px "Open Sans"';
  ctx.fillStyle = getColorHexValue('trail', state.nextColor);
  const remainingTurn = config.maxTurn - state.turn + 1
  ctx.fillText(remainingTurn, x, y);

}

function drawPlayer() {
  const radius = config.player.radius;
  const [playerX, playerY] = polarPercentToCartesian(state.player.distanceFromCenter_pc, state.player.degree)
  const degree = state.player.degree;
  const fillColor = getColorHexValue('player', state.color);
  const strokeColor = getColorHexValue('playerBorder', state.color);
  drawSquare(playerX, playerY, radius, degree, fillColor, strokeColor);

}

function drawTrail() {
  const radius = config.player.radius;

  const hiddenTrail = state.trail.filter(tr => tr.color != state.color);
  hiddenTrail.forEach(tr => {
    const [x, y] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
    const fillColor = getColorHexValue('hiddenTrail', tr.color, getColorHexValue('field', state.color))

    drawSquare(x, y, radius, tr.degree, fillColor)
  })

  const obstacleTrail = state.trail.filter(tr => tr.color === state.color);
  obstacleTrail.forEach(tr => {
    const [x, y] = polarPercentToCartesian(tr.distanceFromCenter_pc, tr.degree);
    const fillColor = getColorHexValue('trail', tr.color);
    const strokeColor = getColorHexValue('trailBorder', tr.color);

    drawSquare(x, y, radius, tr.degree, fillColor, strokeColor)
  })

}

function drawBombs(timeStamp) {
  const color = 'white';

  const chargedBombs = state.bombs.filter(b => b.status === 'CHARGED');
  chargedBombs.forEach(bomb => {
    const [x, y] = polarPercentToCartesian(bomb.distanceFromCenter_pc, bomb.degree);
    const radius = config.bomb.radius;
    drawCircle(x, y, radius, color);
  })

  const explodedBombs = state.bombs.filter(b => b.status === 'EXPLODED');
  explodedBombs.forEach(bomb => {
    const [x, y] = polarPercentToCartesian(bomb.distanceFromCenter_pc, bomb.degree);
    const durationSinceExplosion = (timeStamp - bomb.collisionTimestamp) / 1000
    const explosionProgress = durationSinceExplosion / config.bomb.explosionDuration;
    const explostionProgressEasing = Math.sin((explosionProgress * Math.PI) / 2)
    const radius = config.bomb.explosionRadius * explostionProgressEasing;
    drawCircle(x, y, radius, null, 'white', 2)
  })
}

function drawSquare(x, y, radius, rotation, fillColor, strokeColor) {
  const cornerRadius = 2;

  ctx.save();

  ctx.translate(x, y)
  ctx.rotate(degreeToRadian(rotation))

  ctx.beginPath();
  ctx.arcTo(radius, -radius, radius, radius, cornerRadius);
  ctx.arcTo(radius, radius, -radius, radius, cornerRadius);
  ctx.arcTo(-radius, radius, -radius, -radius, cornerRadius);
  ctx.arcTo(-radius, -radius, radius, -radius, cornerRadius);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawCircle(x, y, radius, fillColor, strokeColor, lineWidth) {

  ctx.save();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  ctx.restore();
}

function drawState() {
  ctx.fillStyle = 'black'
  ctx.font = '10px serif';
  const stateToPrint = JSON.stringify(state, null, 2);
  const s = stateToPrint
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
  return config.center.radius_pc + (config.player.radius / (canvas.width / 2) * 100)
}

function getHighestPlayerDistanceFromCenter_pc() {
  const fieldWidth_pc = config.field.borderWidth / (canvas.width / 2) * 100
  const player_radius_pc = config.player.radius / (canvas.width / 2) * 100
  return config.field.radius_pc - fieldWidth_pc - player_radius_pc;

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

function getColorHexValue(appliedTo, colorName, overlayColor) {
  if (appliedTo === 'hiddenTrail') {
    const trailColor = getColorHexValue('player', colorName);

    const trailColorRGB = tinycolor(trailColor).saturate(50).toRgb();
    const overlayColorRGB = tinycolor(overlayColor).toRgb();

    const opacity = 0.80
    const hiddenTrailColorRGB = {};
    hiddenTrailColorRGB.r = Math.floor(opacity * overlayColorRGB.r + (1 - opacity) * trailColorRGB.r);
    hiddenTrailColorRGB.g = Math.floor(opacity * overlayColorRGB.g + (1 - opacity) * trailColorRGB.g);
    hiddenTrailColorRGB.b = Math.floor(opacity * overlayColorRGB.b + (1 - opacity) * trailColorRGB.b);
    return tinycolor(hiddenTrailColorRGB).toHexString();

  }
  else {
    const color = config.colors.filter(c => c.name === colorName)[0];
    return color[appliedTo];
  }
}

function chooseColorExcluding(colorToExclude) {
  const availableColor = config.colors.filter(c => c.name != colorToExclude);
  return availableColor[Math.floor(Math.random() * availableColor.length)].name;
}

/* #endregion */