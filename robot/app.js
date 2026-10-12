import { parseCommand, isStop } from './parser.js';
import { createFollower } from './follow.js';
import { bleSupported, createBleTransport } from './ble.js';
const $ = id => document.getElementById(id);
const log = (who, t) => { const d = document.createElement('div'); d.textContent = `${who}：${t}`; $('log').prepend(d); };
const cfg = () => JSON.parse(localStorage.llm || '{}');

// ===== 1. 电机传输：默认 BLE，可选 WebSocket =====
// cur: {cmd:'S'} | {cmd,speed} | {l,r}；约 300ms 心跳（固件 800ms 看门狗）
let ws = null, cur = { cmd: 'S' }, moveTimer = null, transport = 'none';
const ble = createBleTransport({
  onStatus: t => { try { const j = JSON.parse(t); if (j.ok) $('st').textContent = '蓝牙已连接'; } catch {} },
  onDisconnect: () => { $('st').textContent = '蓝牙断开'; if (transport === 'ble') { transport = 'none'; stopAll('蓝牙断开，已停车'); } },
});
if (!bleSupported()) {
  const w = $('bleWarn');
  w.style.display = 'block';
  w.textContent = '当前浏览器不支持 Web Bluetooth。请用「安卓手机 + Chrome」打开本页。iPhone / Safari / 微信内置浏览器无法用蓝牙连车（仍可用模拟模式和大模型聊天）。';
  $('bleConn').disabled = true;
}

function tx(o) {
  if (transport === 'ble') return ble.send(o);
  if (transport === 'ws' && ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; }
  return false;
}
const speed = () => +$('spd').value;
function setDrive(o) { cur = o; tx(o); }
function manual(cmd) { setDrive(cmd === 'S' ? { cmd: 'S' } : { cmd, speed: speed() }); }
function stopAll(reason) {
  clearTimeout(moveTimer); setFollow(false, true); manual('S');
  if (reason) log('系统', reason);
}
setInterval(() => tx(cur.cmd === 'S' ? { cmd: 'ping' } : cur), 300);

$('bleConn').onclick = async () => {
  try {
    $('st').textContent = '选择设备…';
    await ble.connect();
    transport = 'ble';
    if (ws) { try { ws.close(); } catch {} ws = null; }
    $('st').textContent = '蓝牙已连接';
    log('系统', '已通过蓝牙连接 PhoneRobot');
  } catch (e) {
    $('st').textContent = '未连接';
    log('系统', '蓝牙连接失败：' + (e.message || e));
  }
};

$('host').value = localStorage.host || '192.168.4.1';
function connectWs() {
  localStorage.host = $('host').value;
  try { ws = new WebSocket(`ws://${$('host').value}:81/`); } catch (e) { $('st').textContent = '地址错误'; return; }
  ws.onopen = () => { transport = 'ws'; $('st').textContent = 'Wi‑Fi 已连接'; log('系统', '已通过 Wi‑Fi 连接（需固件开启 ENABLE_WIFI）'); };
  ws.onclose = () => { if (transport === 'ws') { transport = 'none'; $('st').textContent = '断开'; stopAll(); } };
}
$('conn').onclick = connectWs;
$('spd').oninput = () => $('spdv').textContent = $('spd').value;
document.querySelectorAll('#pad button').forEach(b => {
  const c = b.dataset.c;
  b.addEventListener('pointerdown', e => { e.preventDefault(); if (c === 'S') return stopAll(); setFollow(false, true); clearTimeout(moveTimer); manual(c); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => c !== 'S' && !following && manual('S')));
});
document.addEventListener('visibilitychange', () => document.hidden && stopAll('页面切到后台，已停车'));
function timedMove(dir, ms) { setFollow(false, true); clearTimeout(moveTimer); manual(dir); moveTimer = setTimeout(() => manual('S'), ms); }

// ===== 2. TTS =====
function speak(t) {
  return new Promise(r => {
    if (!('speechSynthesis' in window)) return r();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN';
    u.onend = u.onerror = r; speechSynthesis.cancel(); speechSynthesis.speak(u);
    setTimeout(r, 8000);
  });
}

// ===== 3. 指令/聊天入口（语音、打字都走这里）=====
async function handleText(text) {
  if (!text) return;
  const c = parseCommand(text, { wakeWord: cfg().wake || '' });
  if (!c) return chat(text);
  log('你(指令)', text);
  switch (c.type) {
    case 'stop': stopAll(); break;
    case 'unfollow': setFollow(false); break;
    case 'follow': setFollow(true); break;
    case 'speed': $('spd').value = Math.max(80, Math.min(255, speed() + c.delta)); $('spdv').textContent = $('spd').value;
      if (cur.cmd && cur.cmd !== 'S') manual(cur.cmd); break;
    case 'move': timedMove(c.dir, c.ms); break;
  }
  speak(c.say);
}
$('send').onclick = () => { handleText($('txt').value.trim()); $('txt').value = ''; };
$('txt').onkeydown = e => e.key === 'Enter' && $('send').onclick();

// ===== 4. 语音识别：按一下说 / 持续听 =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, contOn = false;
function startRec(continuous) {
  if (!SR) { log('系统', '此浏览器不支持语音识别，请用输入框'); $('txt').focus(); return; }
  if (rec) try { rec.abort(); } catch {}
  rec = new SR(); rec.lang = 'zh-CN'; rec.continuous = continuous; rec.interimResults = true;
  let stoppedThisUtt = false;
  rec.onresult = e => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (!e.results[i].isFinal) {
        if (!stoppedThisUtt && isStop(t)) { stoppedThisUtt = true; stopAll('听到“停”，立即停车'); }  // 中间结果里的“停”立即生效
      } else { if (!(stoppedThisUtt && isStop(t))) handleText(t); stoppedThisUtt = false; }
    }
  };
  rec.onerror = e => e.error !== 'no-speech' && e.error !== 'aborted' && log('系统', '识别：' + e.error);
  rec.onend = () => { if (contOn) setTimeout(() => contOn && startRec(true), 300); };
  try { rec.start(); } catch {}
}
$('talk').onclick = () => { if (!SR) return $('txt').focus(); log('系统', '正在听…'); startRec(false); };
$('cont').onclick = () => {
  contOn = !contOn; $('cont').textContent = '持续听：' + (contOn ? '开' : '关'); $('cont').classList.toggle('on', contOn);
  if (contOn) startRec(true); else rec && rec.abort();
};

// ===== 5. 大模型 =====
let busy = false;
const history = [{ role: 'system', content: '你是一个四轮小机器人，用简短口语化的中文回答（不超过50字）。' }];
async function chat(text) {
  busy = true; log('你', text); history.push({ role: 'user', content: text });
  let reply; const c = cfg();
  try {
    if (!c.key) reply = '（演示模式）我听到你说：' + text + '。请在设置里填写 API Key。';
    else {
      const res = await fetch(c.base.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.key },
        body: JSON.stringify({ model: c.model, messages: history.slice(-11), max_tokens: 200 }) });
      const j = await res.json();
      reply = j.choices?.[0]?.message?.content || ('接口错误：' + JSON.stringify(j).slice(0, 120));
    }
  } catch (e) { reply = '网络出错了：' + e.message; }
  history.push({ role: 'assistant', content: reply });
  log('机器人', reply); await speak(reply); busy = false;
}

// ===== 6. 视觉：检测 + 打招呼 + 跟随（本地运行，不录像不上传）=====
let detector = null, stream = null, following = false, present = false, lastGreet = 0;
const follower = createFollower();
const ov = $('ov'), ctx = ov.getContext('2d');
function setFollow(on, silent) {
  if (following === on) return;
  following = on; follower.reset();
  $('follow').textContent = '跟随：' + (on ? '开' : '关'); $('follow').classList.toggle('on', on);
  $('mode').textContent = on ? '跟随模式' : '手动';
  if (!on) manual('S');
  if (on && !stream && !$('mock').checked) log('系统', '跟随需要先开启摄像头或打开模拟模式');
  if (!silent) speak(on ? '好的，我跟着你' : '好的，不跟了');
}
$('follow').onclick = () => setFollow(!following);

async function startCam() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: $('facing').value, width: 640, height: 480 }, audio: false });
  $('v').srcObject = stream;
  if (detector) return;
  try {
    const V = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    const vision = await import(V + '/vision_bundle.mjs');
    const fs = await vision.FilesetResolver.forVisionTasks(V + '/wasm');
    detector = await vision.ObjectDetector.createFromOptions(fs, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite', delegate: 'GPU' },
      runningMode: 'VIDEO', scoreThreshold: 0.45, categoryAllowlist: ['person'] });
    log('系统', '人体检测模型已加载（本地运行）');
  } catch (e) { log('系统', '检测模型加载失败（可用模拟模式测试）：' + e.message); }
}
$('cam').onclick = () => startCam().catch(e => log('系统', '摄像头打开失败：' + e.message + '（需允许摄像头权限；本页已是 https）'));
$('facing').onchange = () => stream && $('cam').onclick();

// 模拟人：可拖动的框
const mock = { x: 0.4, y: 0.3, w: 0.2 };
$('mock').onchange = () => document.body.classList.toggle('mockon', $('mock').checked);
let drag = null;
ov.addEventListener('pointerdown', e => { if ($('mock').checked) drag = e; });
ov.addEventListener('pointermove', e => {
  if (!drag) return; const r = ov.getBoundingClientRect();
  mock.x = Math.min(1 - mock.w, Math.max(0, (e.clientX - r.left) / r.width - mock.w / 2));
});
addEventListener('pointerup', () => drag = null);
function mockBoxes() {
  if (!$('mockVis').checked) return [];
  const h = $('mockH').value / 100; mock.w = h * 0.45;
  return [{ x: mock.x, y: Math.max(0, 1 - h) / 2, w: mock.w, h }];
}

function detect() {
  if ($('mock').checked) return mockBoxes();
  const v = $('v');
  if (!detector || v.readyState < 2) return [];
  const r = detector.detectForVideo(v, performance.now());
  const W = v.videoWidth, H = v.videoHeight;
  return r.detections.map(d => ({ x: d.boundingBox.originX / W, y: d.boundingBox.originY / H, w: d.boundingBox.width / W, h: d.boundingBox.height / H }));
}
function draw(boxes, target, status) {
  ov.width = ov.clientWidth; ov.height = ov.clientHeight;
  const mirror = $('facing').value === 'user' && !$('mock').checked;
  ctx.save(); if (mirror) { ctx.translate(ov.width, 0); ctx.scale(-1, 1); }
  for (const b of boxes) {
    ctx.strokeStyle = b === target ? '#0f0' : '#ff0'; ctx.lineWidth = b === target ? 4 : 2;
    ctx.strokeRect(b.x * ov.width, b.y * ov.height, b.w * ov.width, b.h * ov.height);
  }
  ctx.restore();
  $('mode').textContent = following ? '跟随模式 · ' + status : '手动';
}
$('v').style.transform = 'none';
$('facing').addEventListener('change', () => $('v').style.transform = $('facing').value === 'user' ? 'scaleX(-1)' : 'none');

function loop() {
  const t0 = performance.now();
  let boxes = [];
  try { boxes = detect(); } catch (e) { console.warn(e); }
  const seen = boxes.length > 0;
  $('det').textContent = seen ? `看到 ${boxes.length} 人` : '无人';
  let status = '';
  if (following) {
    const o = follower.step(boxes, Date.now(), false);
    status = o.status;
    setDrive({ l: o.l, r: o.r });
    if (o.lost) { manual('S'); speak('我找不到你了'); log('机器人', '我找不到你了'); }
    draw(boxes, o.target, status);
  } else draw(boxes, null, status);
  if (seen && !present && !following && !busy && Date.now() - lastGreet > 30000) {
    lastGreet = Date.now();
    const g = '你好呀！我是小机器人，想和我聊天吗？'; log('机器人', g); speak(g);
  }
  present = seen;
  setTimeout(loop, Math.max(0, 100 - (performance.now() - t0)));  // 目标 10fps
}
loop();

// ===== 7. 设置 =====
$('cfgBtn').onclick = () => {
  const c = cfg(); const [b, m] = $('preset').value.split('|');
  $('base').value = c.base || b; $('model').value = c.model || m; $('key').value = c.key || ''; $('wake').value = c.wake || '';
  $('cfg').showModal();
};
$('preset').onchange = () => { const [b, m] = $('preset').value.split('|'); $('base').value = b; $('model').value = m; };
$('save').onclick = () => localStorage.llm = JSON.stringify({ base: $('base').value, model: $('model').value, key: $('key').value, wake: $('wake').value.trim() });
// 调试用
window.robot = { handleText, setFollow, stopAll, get cur() { return cur; }, get transport() { return transport; } };
