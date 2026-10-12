// 本地语音指令解析（不依赖大模型）。浏览器和 node 通用的 ES 模块。
// 返回 null 表示不是指令（交给大模型），否则返回 {type, ...,say}
const CN = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };
export const DEFAULTS = { moveMs: 1500, turnMs: 600, smallMoveMs: 500, smallTurnMs: 300, maxMs: 10000 };

function cnNum(s) {
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  if (s === '十') return 10;
  let m = s.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
  if (m) return (m[1] ? CN[m[1]] : 1) * 10 + (m[2] ? CN[m[2]] : 0);
  m = s.match(/^([一二两三四五六七八九])个?半$/);
  if (m) return CN[m[1]] + 0.5;
  return CN[s] ?? null;
}
function clean(t) { return (t || '').replace(/[\s，。！？,.!?、~～]/g, ''); }

const STOP_FOLLOW = /(停止跟随|别跟了|不要跟了?|不用跟了?|取消跟随|退出跟随)/;
const STOP = /(停|别动|不要动|站住|刹车|stop)/i;
export const isStop = t => { const c = clean(t); return STOP.test(c) && !STOP_FOLLOW.test(c); };

export function parseCommand(text, opts = {}) {
  const o = { ...DEFAULTS, wakeWord: '', ...opts };
  let t = clean(text);
  if (!t) return null;
  // 安全最高优先级：停止跟随 / 停 永远不需要唤醒词
  if (STOP_FOLLOW.test(t)) return { type: 'unfollow', say: '好的，不跟了' };
  if (STOP.test(t)) return { type: 'stop', say: '停' };
  if (o.wakeWord) {
    const i = t.indexOf(clean(o.wakeWord));
    if (i < 0) return null;
    t = t.slice(i + clean(o.wakeWord).length);
    if (!t) return null;
  }
  if (/(跟着我|跟随|跟我走|跟我来|过来跟)/.test(t)) return { type: 'follow', say: '好的，我跟着你' };
  if (/(快一点|快点|加速|开快)/.test(t)) return { type: 'speed', delta: +40, say: '加速' };
  if (/(慢一点|慢点|减速|开慢)/.test(t)) return { type: 'speed', delta: -40, say: '减速' };

  const dirs = [
    ['F', /(前进|往前|向前|朝前|直走|走前面)/, '前进'],
    ['B', /(后退|倒退|往后|向后|倒车)/, '后退'],
    ['L', /(左转|向左|往左|左拐)/, '左转'],
    ['R', /(右转|向右|往右|右拐)/, '右转'],
  ];
  for (const [dir, re, name] of dirs) {
    const m = t.match(re);
    if (!m) continue;
    const turn = dir === 'L' || dir === 'R';
    let ms = turn ? o.turnMs : o.moveMs;
    const rest = t.slice(m.index + m[0].length);
    const sec = rest.match(/^(?:走|开|转)?(\d+(?:\.\d+)?|[一二两三四五六七八九十半]+|[一二两三四五六七八九]个?半)(?:个)?秒/);
    if (sec) { const n = cnNum(sec[1]); if (n != null) ms = Math.min(n * 1000, o.maxMs); }
    else if (/^(一点|一下|一些|点)/.test(rest)) ms = turn ? o.smallTurnMs : o.smallMoveMs;
    return { type: 'move', dir, ms, say: name };
  }
  return null;
}
