document.addEventListener("DOMContentLoaded", function () {

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const algoSel = document.getElementById("algo");
  const delayInput = document.getElementById("delay");
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const status = document.getElementById("status");
  const sizeInput = document.getElementById("size");
  const overlay = document.getElementById("overlay");

  const MAX_SCALE = 1.4;
  const MIN_SCALE = 0.6;
  const TARGET_COL_PX = 18;
  const TARGET_ROW_PX = 18;

  let cols = Math.max(5, Math.min(50, parseInt(sizeInput.value) || 30));
  const rows = 30;
  let values = new Array(cols);
  let gen = null;
  let timer = null;
  let highlight = {};

  function getGridParams() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
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
    const idealWidth = cols * TARGET_COL_PX;
    const idealHeight = rows * TARGET_ROW_PX;
    const maxWidth = window.innerWidth - 32;
    const maxHeight = window.innerHeight - 140;
    let scale = Math.min(maxWidth / idealWidth, maxHeight / idealHeight);
    scale = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
    const width = Math.round(idealWidth * scale);
    const height = Math.round(idealHeight * scale);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  window.addEventListener("resize", resizeCanvas);

  function randomize() {
    const temp = [];
    for (let i = 0; i < rows; i++) temp.push(i + 1);
    values = new Array(cols);
    for (let i = 0; i < cols; i++) {
      const index = Math.floor(Math.random() * temp.length);
      values[i] = temp[index];
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { usedColW: colW, usedCell: cell, totalGridHeight: totalHeight, radius } = getGridParams();
    for (let x = 0; x < cols; x++) {
      const val = values[x] || 0;
      const cx = x * colW + Math.floor(colW / 2);
      for (let r = 0; r < rows; r++) {
        const cy = totalHeight - (r * cell + Math.floor(cell / 2));
        ctx.fillStyle = r < val ? valueToColor(r / rows) : "#222";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (highlight.i !== undefined) drawHighlight(highlight.i, "rgba(62,62,62,0.73)");
    if (highlight.j !== undefined) drawHighlight(highlight.j, "rgba(203,64,54,0.55)");
  }

  function drawHighlight(ix, color) {
    const { usedColW: colW, usedCell: cell, totalGridHeight: totalHeight, radius } = getGridParams();
    const cx = ix * colW + Math.floor(colW / 2);
    ctx.fillStyle = color;
    for (let r = 0; r < rows; r++) {
      const cy = totalHeight - (r * cell + Math.floor(cell / 2));
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function valueToColor(t) {
    const start = { r: 46, g: 46, b: 46 };
    const end = { r: 220, g: 60, b: 60 };
    const r = Math.floor(start.r + (end.r - start.r) * t);
    const g = Math.floor(start.g + (end.g - start.g) * t);
    const b = Math.floor(start.b + (end.b - start.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  function* selectionGen(a){
    for (let i=0;i<a.length-1;i++){
      let min=i;
      for (let j=i+1;j<a.length;j++){
        highlight={i,j};
        yield;
        if(a[j]<a[min]) min=j;
      }
      if(min!==i){ [a[i],a[min]]=[a[min],a[i]]; highlight={i,min}; yield; }
    }
    highlight={};
  }

  function* insertionGen(a){
    for(let i=1;i<a.length;i++){
      let key=a[i]; let j=i-1;
      while(j>=0 && a[j]>key){ highlight={i,j}; a[j+1]=a[j]; yield; j--; }
      a[j+1]=key; yield;
    }
    highlight={};
  }

  function* bubbleGen(a){
    let n=a.length; let swapped=true;
    while(swapped){
      swapped=false;
      for(let i=1;i<n;i++){
        highlight={i:i-1,j:i}; yield;
        if(a[i-1]>a[i]){ [a[i-1],a[i]]=[a[i],a[i-1]]; swapped=true; yield; }
      }
      n--;
    }
    highlight={};
  }

  function* mergeGen(a){
    const n=a.length; let width=1; const aux=new Array(n);
    while(width<n){
      for(let i=0;i<n;i+=2*width){
        const left=i, mid=Math.min(i+width,n), right=Math.min(i+2*width,n);
        let l=left, r=mid, k=left;
        while(l<mid||r<right){ highlight={i:left,j:Math.min(n-1,r)};
          if(r>=right || (l<mid && a[l]<=a[r])) aux[k++]=a[l++];
          else aux[k++]=a[r++];
          yield;
        }
        for(let t=left;t<right;t++){ a[t]=aux[t]; yield; }
      }
      width*=2;
    }
    highlight={};
  }

  function* quickGen(a){
    const stack=[{l:0,r:a.length-1}];
    while(stack.length){
      const {l,r}=stack.pop();
      if(l>=r) continue;
      const pivot=a[r]; let i=l;
      for(let j=l;j<r;j++){ highlight={i,j}; yield; if(a[j]<pivot){ [a[i],a[j]]=[a[j],a[i]]; yield; i++; } }
      [a[i],a[r]]=[a[r],a[i]]; yield;
      stack.push({l:i+1,r}); stack.push({l,r:i-1});
    }
    highlight={};
  }

  function* heapGen(a){
    const n=a.length;
    for(let start=Math.floor((n-2)/2);start>=0;start--){
      let root=start;
      while(true){
        const child=2*root+1; if(child>n-1) break;
        let swapIdx=root;
        if(a[swapIdx]<a[child]) swapIdx=child;
        if(child+1<=n-1 && a[swapIdx]<a[child+1]) swapIdx=child+1;
        if(swapIdx===root) break;
        [a[root],a[swapIdx]]=[a[swapIdx],a[root]]; highlight={i:root,j:swapIdx}; yield;
        root=swapIdx;
      }
    }
    for(let end=n-1;end>0;end--){
      [a[0],a[end]]=[a[end],a[0]]; highlight={i:0,j:end}; yield;
      let root=0;
      while(true){
        const child=2*root+1; if(child>end-1) break;
        let swapIdx=root;
        if(a[swapIdx]<a[child]) swapIdx=child;
        if(child+1<=end-1 && a[swapIdx]<a[child+1]) swapIdx=child+1;
        if(swapIdx===root) break;
        [a[root],a[swapIdx]]=[a[swapIdx],a[root]]; highlight={i:root,j:swapIdx}; yield;
        root=swapIdx;
      }
    }
    highlight={};
  }

  function* bogoGen(a){
    function isSorted(arr){ for(let i=1;i<arr.length;i++) if(arr[i-1]>arr[i]) return false; return true; }
    function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
    let attempts=0;
    while(!isSorted(a)){
      shuffle(a); attempts++;
      highlight={}; yield;
      if(attempts>1000000) break;
    }
    highlight={};
  }

  function makeGenerator(name){
    const arr=values;
    if(name==='selection') return selectionGen(arr);
    if(name==='insertion') return insertionGen(arr);
    if(name==='merge') return mergeGen(arr);
    if(name==='bubble') return bubbleGen(arr);
    if(name==='quick') return quickGen(arr);
    if(name==='heap') return heapGen(arr);
    if(name==='bogo') return bogoGen(arr);
    return null;
  }

  function stepOnce(){
    if(!gen) return false;
    const res=gen.next(); draw();
    if(res.done){ gen=null; showOverlay(); status.textContent='Finished'; return false; }
    return true;
  }

  function startRun(){
    const isMobile=window.innerWidth<600;
    cols=Math.max(5, Math.min(isMobile?40:100, parseInt(sizeInput.value)||cols));
    randomize();
    resizeCanvas();
    if(timer) clearInterval(timer);
    let delay=parseInt(delayInput.value)||0;
    if(delay<1){ 
      function runFast(){ if(!stepOnce()){ timer=null; status.textContent='Finished'; } else requestAnimationFrame(runFast); }
      gen=makeGenerator(algoSel.value); hideOverlay(); status.textContent=`Running ${algoSel.value}...`; runFast(); return;
    }
    gen=makeGenerator(algoSel.value);
    if(!gen) return;
    hideOverlay();
    status.textContent=`Running ${algoSel.value}...`;
    timer=setInterval(()=>{ const alive=stepOnce(); if(!alive){ clearInterval(timer); timer=null; } }, delay);
  }

  function stopRun(){
    if(timer) clearInterval(timer);
    timer=null; gen=null; status.textContent='Stopped';
  }

  function showOverlay(){ overlay.classList.remove('hidden'); }
  function hideOverlay(){ overlay.classList.add('hidden'); }

  startBtn.addEventListener('click',()=>startRun());
  stopBtn.addEventListener('click',()=>stopRun());

  randomize();
  resizeCanvas();
  draw();
  status.textContent='Ready';
});