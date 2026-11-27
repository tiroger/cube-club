/* Solve my cube: six-face review, manual painting, and the solver request. */
'use strict';
const scanOrder = ['F', 'R', 'B', 'L', 'U', 'D'];
function newScan() {
  if (busy) {
    toast('Let this little turn finish, then open the scanner.');
    return;
  }
  cancelPlayback();
  if (session && session.type !== 'play')
    updateSequence();
  scan = { autoCapture: progress.preferences.autoCapture, method: 'beginner', index: 0, faces: Object.fromEntries(FACES.map(f => [f, Array.from({ length: 9 }, (_, i) => i === 4 ? f : '?')])), confirmed: new Set(), color: 'F', camera: false, solving: false };
  renderScan();
}
function scanOrientation(f) {
  return f === 'U' ? 'Point the yellow center at the camera. Keep the blue center at the TOP edge.' : f === 'D' ? 'Point the white center at the camera. Keep the green center at the TOP edge.' : `Point the ${COLOR_NAMES[f]} center at the camera. Keep the yellow center at the TOP edge.`;
}
function renderScan() {
  if (!scan)
    return;
  if (scan.mode === 'check') {
    renderMoveCheck();
    return;
  }
  const f = scanOrder[scan.index];
  showModal(`<div class="modal-title"><div><div class="eyebrow">BRING YOUR REAL CUBE ALONG</div><h2>Six sides. One little adventure.</h2><p>Turn the whole cube for each picture. Keep its layers still until all six faces are checked. You can also paint the colors by hand.</p></div><button class="icon-button" data-action="closeModal" aria-label="Close scanner">${icon('close')}</button></div><div class="scan-steps">${scanOrder.map((face, i) => `<button class="scan-step ${scan.index === i ? 'active' : ''} ${scan.confirmed.has(face) ? 'done' : ''}" data-scan-face="${i}">${COLOR_NAMES[face]}</button>`).join('')}</div>${scanMethodPicker()}<div class="scan-columns"><div>${cameraPanel()}<p class="small-note">Standard color layout: yellow top, green front, orange right.<br>The preview is not mirrored. Check every suggested color.</p></div><div class="scan-side"><h3>Face ${scan.index + 1}: ${COLOR_NAMES[f]} center</h3>${scanOrientationGuide(f)}<div class="scan-grid">${scan.faces[f].map((c, i) => `<button class="scan-sticker ${i === 4 ? 'center' : ''}" data-sticker="${i}" style="background:${COLORS[c] || '#e4e7dc'}" aria-label="Row ${Math.floor(i / 3) + 1}, column ${i % 3 + 1}: ${COLOR_NAMES[c] || 'unknown'}${i === 4 ? ', fixed center' : ''}" ${i === 4 ? 'disabled' : ''}>${c === '?' ? '?' : i === 4 ? '•' : ''}</button>`).join('')}</div><div class="palette" aria-label="Paint color">${FACES.map(c => `<button class="swatch ${c === scan.color ? 'selected' : ''}" style="background:${COLORS[c]}" data-color="${c}" aria-label="Paint ${COLOR_NAMES[c]}" aria-pressed="${c === scan.color}"></button>`).join('')}</div><p style="text-align:center;margin-top:13px">Pick a color, then tap a square to fix it.</p><div class="mode-row"><button class="text-button" data-action="rotateScan">↻ Rotate this face</button><button class="text-button" data-action="clearScanFace">Clear face</button></div></div></div><div id="scan-error" class="scan-error" role="status"></div><div class="scan-footer"><p>${scan.confirmed.size} of 6 faces checked.<br>Review the colors before moving on.</p><div style="display:flex;gap:10px"><button class="button secondary" data-action="confirmFace">${icon('check')}Colors look right</button><button class="button primary" data-action="solveScan" ${scan.confirmed.size === 6 ? '' : 'disabled'}>${scan.method === 'general' ? 'Show me the moves' : 'Teach me to solve'} ${icon('arrow')}</button></div></div>`);
  refreshCameraPanel();
}
async function solveFacelets(facelets, method = 'general') {
  // The iPad shell sets cubeClubSolverInPage: iPadOS gives JavaScriptCore no JIT inside apps,
  // but WebKit's own process has one, so the worker is far faster there than a native solve.
  if (native && !window.cubeClubSolverInPage)
    return bridge('solve', { facelets, method });
  if (!worker)
    worker = new Worker('solver-worker.js');
  return new Promise(resolve => {
    const id = ++requestID;
    clearTimeout(workerTimer);
    workerTimer = setTimeout(() => {
      worker?.terminate();
      worker = null;
      resolve({ error: 'The solver timed out. Please try again.' });
    }, 90000);
    worker.onmessage = e => {
      if (e.data.id === id) {
        clearTimeout(workerTimer);
        resolve(e.data);
      }
    };
    worker.onerror = () => {
      clearTimeout(workerTimer);
      worker.terminate();
      worker = null;
      resolve({ error: window.cubeClubPad ? 'Could not start the solver. Please try again.' : 'Could not start the solver. Try the native Mac app.' });
    };
    worker.postMessage({ id, facelets, method });
  });
}
async function solveScan() {
  if (!scan || scan.solving)
    return;
  const facelets = FACES.map(f => scan.faces[f].join('')).join(''), check = validate(facelets);
  if (!check.ok) {
    $('#scan-error').textContent = check.error;
    return;
  }
  if (check.cube.isSolved()) {
    $('#scan-error').textContent = 'Your cube is already solved! Try a sample cube, or celebrate and explore a lesson.';
    return;
  }
  scan.solving = true;
  const current = scan;
  $('#scan-error').innerHTML = '<span class="solving-status"><span class="spinner"></span>Finding your cube’s path home. The first solve can take a few seconds…</span>';
  document.querySelectorAll('.modal button:not(.close)').forEach(b => b.disabled = true);
  $('[data-action="closeModal"]').disabled = false;
  const result = await solveFacelets(facelets, current.method || 'beginner');
  if (scan !== current)
    return;
  if (result.error) {
    scan.solving = false;
    renderScan();
    $('#scan-error').textContent = result.error;
    return;
  }
  const cube = Cube.fromString(facelets), algorithm = moves(result.algorithm || '');
  if (!cube.clone().move(algorithm.join(' ')).isSolved()) {
    scan.solving = false;
    renderScan();
    $('#scan-error').textContent = 'The solution did not check out. Please review the scan.';
    return;
  }
  rememberSession();
  closeModal();
  cancelPlayback();
  view?.destroy();
  busy = false;
  route = 'solve';
  session = { type: 'solve', cube, initial: cube.clone(), algorithm, index: 0, mode: 'guide', teaching: result.method === 'beginner' ? result : null, checkpoints: new Set() };
  render();
  rememberSession();
  autoSpeak('Keep yellow on top and green facing you. Let’s take it one move at a time.');
}
function editScan(action) {
  if (!scan || scan.solving)
    return;
  action();
  renderScan();
}
// Scanner, camera, and move-check controls.
async function scanClick(d, button) {
  if (d.scanFace !== undefined) {
    editScan(() => scan.index = Number(d.scanFace));
    return true;
  }
  if (d.color) {
    editScan(() => scan.color = d.color);
    return true;
  }
  if (d.sticker !== undefined) {
    lockCameraFace();
    editScan(() => {
      const f = scanOrder[scan.index];
      scan.faces[f][Number(d.sticker)] = scan.color;
      scan.confirmed.delete(f);
    });
    return true;
  }
  switch (d.action) {
    case 'scan':
      newScan();
      break;
    case 'checkMove':
      startMoveCheck();
      break;
    case 'checkAnotherFace':
      if (scan?.mode === 'check') {
        const f = checkReport().nextFace;
        if (f) {
          scan.index = scanOrder.indexOf(f);
          renderScan();
        }
      }
      break;
    case 'restartCheck':
      startMoveCheck();
      break;
    case 'rescanAfterCheck':
      closeModal();
      newScan();
      break;
    case 'stopCamera':
      stopCubeCamera();
      break;
    case 'teachCenter':
      await teachCameraCenter();
      break;
    case 'startCamera':
      await startCubeCamera(button);
      break;
    case 'captureFace':
      captureFace(false);
      break;
    case 'confirmFace':
      if (scan && !scan.solving) {
        const f = scanOrder[scan.index];
        if (scan.faces[f].includes('?')) {
          $('#scan-error').textContent = 'Fill in every square on this face first.';
          break;
        }
        scan.confirmed.add(f);
        if (scan.mode === 'check') {
          creditMoveCheck();
          renderScan();
          break;
        }
        const next = scanOrder.findIndex((f, i) => i > scan.index && !scan.confirmed.has(f));
        scan.index = next >= 0 ? next : scanOrder.findIndex(f => !scan.confirmed.has(f));
        if (scan.index < 0)
          scan.index = 5;
        renderScan();
      }
      break;
    case 'demoScan':
      editScan(() => {
        const s = new Cube().move("R U F2 L' D B R2 U' F D2").asString();
        FACES.forEach((f, i) => scan.faces[f] = s.slice(i * 9, i * 9 + 9).split(''));
        scan.confirmed = new Set(FACES);
        scan.index = 0;
      });
      toast('Sample cube loaded. All six faces are ready.');
      break;
    case 'solveScan':
      await solveScan();
      break;
    case 'rotateScan':
      lockCameraFace();
      editScan(() => {
        const f = scanOrder[scan.index], a = scan.faces[f];
        scan.faces[f] = [a[6], a[3], a[0], a[7], a[4], a[1], a[8], a[5], a[2]];
        scan.confirmed.delete(f);
      });
      break;
    case 'clearScanFace':
      lockCameraFace();
      editScan(() => {
        const f = scanOrder[scan.index];
        scan.faces[f] = Array.from({ length: 9 }, (_, i) => i === 4 ? f : '?');
        scan.confirmed.delete(f);
      });
      break;
    default: return false;
  }
  return true;
}
