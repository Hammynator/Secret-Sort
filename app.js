document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  if (!canvas) {
    console.error('canvas element not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  const algoSel = document.getElementById('algo');
  const delayInput = document.getElementById('delay');
  const startBtn = document.getElementById('start');
  const stopBtn = document.getElementById('stop');
  const status = document.getElementById('status');
  const sizeInput = document.getElementById('size');

  const MAX_SCALE = 1.4;
  const TARGET_COL_PX = 18;
  const TARGET_ROW_PX = 18;
  const MIN_SCALE = 0.6;

  const required = {algoSel, delayInput, startBtn, stopBtn, status, overlay, sizeInput};
  for (const [k, el] of Object.entries(required)){
    if (!el){
      console.error(`Required element missing: ${k}`);
      return;
    }
  }

let cols = Math.max(5, Math.min(50, parseInt(sizeInput.value) || 30));
const rows = 30;
let values = new Array(cols);
let gen = null;
let timer = null;
let highlight = {};

function getGridParams() {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  const colW = w / cols;
  const cell = h / rows;

  return {
    usedColW: colW,
    usedCell: cell,
    offsetX: 0,
    offsetY: 0,
    totalGridHeight: h,
    radius: Math.min(colW, cell) * 0.38
  };
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;

  const idealWidth  = cols * TARGET_COL_PX;
  const idealHeight = rows * TARGET_ROW_PX;

  const maxWidth  = window.innerWidth - 32;
  const maxHeight = window.innerHeight - 140;

  const scale = Math.min(
    MAX_SCALE,
    Math.max(
      MIN_SCALE,
      Math.min(
        maxWidth / idealWidth,
        maxHeight / idealHeight,
        1
      )
    )
  );

  const width  = Math.round(idealWidth * scale);
  const height = Math.round(idealHeight * scale);

  canvas.width  = width * dpr;
  canvas.height = height * dpr;

  canvas.style.width  = width + 'px';
  canvas.style.height = height + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  draw();
}
window.addEventListener('resize', resizeCanvas);

function randomize() {
  const arr = Array.from({length: rows}, (_,i)=>i+1);
  values = new Array(cols);
  for (let i=0;i<cols;i++){
    values[i] = arr[Math.floor(Math.random()*arr.length)];
  }
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const {usedColW: colW, usedCell: cell, offsetX, offsetY, totalGridHeight, radius} = getGridParams();
  for (let x=0;x<cols;x++){
    const val = values[x] || 0;
    const cx = offsetX + x*colW + Math.floor(colW/2);
    for (let r=0;r<rows;r++){
      const cy = offsetY + totalGridHeight - (r*cell + Math.floor(cell/2));
      if (r < val) {
        const t = r/rows;
        const col = valueToColor(t);
        ctx.fillStyle = col;
      } else {
        ctx.fillStyle = '#222';
      }
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI*2);
      ctx.fill();
    }
  }
  if (highlight.i !== undefined){
    drawHighlight(highlight.i, 'rgba(62, 62, 62, 0.73)');
  }
  if (highlight.j !== undefined){
    drawHighlight(highlight.j, 'rgba(203, 64, 54, 0.55)');
  }
}

function drawHighlight(ix, color){
  const {usedColW: colW, usedCell: cell, offsetX, offsetY, totalGridHeight, radius} = getGridParams();
  const cx = offsetX + ix*colW + Math.floor(colW/2);
  for (let r=0;r<rows;r++){
    const cy = offsetY + totalGridHeight - (r*cell + Math.floor(cell/2));
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(cx, cy, radius, 0, Math.PI*2);
    ctx.fill();
  }
}

function valueToColor(t){
  const start = {r: 46, g: 46, b: 46};
  const end = {r: 220, g: 60, b: 60};
  const r = Math.floor(start.r + (end.r - start.r) * t);
  const g = Math.floor(start.g + (end.g - start.g) * t);
  const b = Math.floor(start.b + (end.b - start.b) * t);
  return `rgb(${r},${g},${b})`;
}

// --- Generators for algorithms ---

function* selectionGen(arr){
  const a = arr;
  const n = a.length;
  for (let i=0;i<n-1;i++){
    let min = i;
    for (let j=i+1;j<n;j++){
      highlight = {i, j};
      yield;
      if (a[j] < a[min]) min = j;
    }
    if (min !== i){
      [a[i], a[min]] = [a[min], a[i]];
      highlight = {i, min};
      yield;
    }
  }
  highlight = {};
}

function* insertionGen(a){
  for (let i=1;i<a.length;i++){
    let key = a[i];
    let j = i-1;
    while (j>=0 && a[j] > key){
      highlight = {i, j};
      a[j+1] = a[j];
      yield;
      j--;
    }
    a[j+1] = key;
    yield;
  }
  highlight = {};
}

function* bubbleGen(a){
  let n = a.length;
  let swapped = true;
  while (swapped){
    swapped = false;
    for (let i=1;i<n;i++){
      highlight = {i: i-1, j: i};
      yield;
      if (a[i-1] > a[i]){
        [a[i-1], a[i]] = [a[i], a[i-1]];
        swapped = true;
        yield;
      }
    }
    n--;
  }
  highlight = {};
    }

    function* mergeGen(a){
  const n = a.length;
  let width = 1;
  const aux = new Array(n);
  while (width < n){
    for (let i=0;i<n;i+= 2*width){
      const left = i;
      const mid = Math.min(i+width, n);
      const right = Math.min(i+2*width, n);
      let l = left, r = mid, k = left;
      while (l < mid || r < right){
        highlight = {i:left, j:Math.min(n-1, r)};
        if (r>=right || (l<mid && a[l] <= a[r])){
          aux[k++] = a[l++];
        } else {
          aux[k++] = a[r++];
        }
        yield;
      }
      for (let t=left;t<right;t++){
        a[t] = aux[t];
        yield;
      }
    }
    width *= 2;
  }
  highlight = {};
}

function* quickGen(a){
  const stack = [{l:0, r:a.length-1}];
  while (stack.length){
    const {l,r} = stack.pop();
    if (l>=r) continue;
    const pivot = a[r];
    let i = l;
    for (let j=l;j<r;j++){
      highlight = {i, j};
      yield;
      if (a[j] < pivot){
        [a[i], a[j]] = [a[j], a[i]];
        yield;
        i++;
      }
    }
    [a[i], a[r]] = [a[r], a[i]];
    yield;
    stack.push({l:i+1, r});
    stack.push({l, r:i-1});
  }
  highlight = {};
}

function* heapGen(a){
  const n = a.length;
  for (let start = Math.floor((n - 2) / 2); start >= 0; start--) {
    let root = start;
    while (true) {
      const child = 2 * root + 1;
      if (child > n - 1) break;
      let swapIdx = root;
      if (a[swapIdx] < a[child]) swapIdx = child;
      if (child + 1 <= n - 1 && a[swapIdx] < a[child + 1]) swapIdx = child + 1;
      if (swapIdx === root) break;
      [a[root], a[swapIdx]] = [a[swapIdx], a[root]];
      highlight = {i: root, j: swapIdx};
      yield;
      root = swapIdx;
    }
  }

  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    highlight = {i: 0, j: end};
    yield;
    let root = 0;
    while (true) {
      const child = 2 * root + 1;
      if (child > end - 1) break;
      let swapIdx = root;
      if (a[swapIdx] < a[child]) swapIdx = child;
      if (child + 1 <= end - 1 && a[swapIdx] < a[child + 1]) swapIdx = child + 1;
      if (swapIdx === root) break;
      [a[root], a[swapIdx]] = [a[swapIdx], a[root]];
      highlight = {i: root, j: swapIdx};
      yield;
      root = swapIdx;
    }
  }
  highlight = {};
}

function makeGenerator(name){
  const arr = values;
  if (name === 'selection') return selectionGen(arr);
  if (name === 'insertion') return insertionGen(arr);
  if (name === 'merge') return mergeGen(arr);
  if (name === 'bubble') return bubbleGen(arr);
  if (name === 'quick') return quickGen(arr);
  if (name === 'heap') return heapGen(arr);
  return null;
}

function stepOnce(){
  if (!gen) return false;
  const res = gen.next();
  draw();
  if (res.done){
    gen = null;
    showOverlay();
    status.textContent = 'Finished';
    return false;
  }
  return true;
}

function startRun(){
  const isMobile = window.innerWidth < 600;

  cols = Math.max(
    5,
    Math.min(isMobile ? 40 : 100, parseInt(sizeInput.value) || cols)
  );

  randomize();

  resizeCanvas();

  if (timer) clearInterval(timer);

  const delay = Math.max(5, parseInt(delayInput.value) || 100);

  try {
    gen = makeGenerator(algoSel.value);
    if (!gen) {
      console.error('Could not create generator for', algoSel.value);
      return;
    }

    status.textContent = `Running ${algoSel.value}...`;

    timer = setInterval(() => {
      try {
        const alive = stepOnce();
        if (!alive) {
          clearInterval(timer);
          timer = null;
        }
      } catch (err) {
        console.error('Error during stepOnce:', err);
        clearInterval(timer);
        timer = null;
      }
    }, delay);

  } catch (err) {
    console.error('Error starting run:', err);
  }
}

function stopRun(){
  if (timer) clearInterval(timer);
  timer = null;
  gen = null;
  status.textContent = 'Stopped';
}

function showOverlay(){
  overlay.classList.remove('hidden');
}
function hideOverlay(){
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', (e)=>{ console.log('start clicked', e); hideOverlay(); cols = Math.max(5, Math.min(100, parseInt(sizeInput.value) || cols)); randomize(); resizeCanvas(); draw(); startRun(); });
stopBtn.addEventListener('click', (e)=>{ console.log('stop clicked', e); stopRun(); });

  randomize();
  resizeCanvas();
  draw();
  status.textContent='Ready';
});