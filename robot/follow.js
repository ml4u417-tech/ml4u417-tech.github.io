// 跟随控制器：纯函数，浏览器和 node 通用。box 坐标均为 0..1 归一化 {x,y,w,h}
export const FOLLOW_CFG = {
  maxSpeed: 150,      // 跟随时轮速上限（0-255）
  turnGain: 220,      // 水平偏差 → 转向
  deadband: 0.08,     // 中心偏差小于此值不转
  fwdGain: 400,       // 距离偏差 → 前进
  targetMin: 0.55, targetMax: 0.75, // 人框高度占画面比例：目标区间
  tooClose: 0.9,      // 超过就慢慢后退
  backSpeed: 70,
  lostMs: 1000, minIoU: 0.2,
};
export function iou(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const u = a.w * a.h + b.w * b.h - inter;
  return u > 0 ? inter / u : 0;
}
// 初次选人：面积大 + 靠中间
function pick(boxes) {
  let best = null, bs = -1;
  for (const b of boxes) { const s = b.w * b.h * (1 - Math.abs(b.x + b.w / 2 - 0.5)); if (s > bs) { bs = s; best = b; } }
  return best;
}
const clamp = (v, m) => Math.max(-m, Math.min(m, v));
export function createFollower(cfg = {}) {
  const c = { ...FOLLOW_CFG, ...cfg };
  let target = null, lastSeen = 0, lostAnnounced = false;
  return {
    reset() { target = null; lastSeen = 0; lostAnnounced = false; },
    get target() { return target; },
    // 返回 {l, r, target, lost(新丢失事件), status}
    step(boxes, now, mirror = false) {
      let match = null;
      if (target) {
        let bi = c.minIoU;
        for (const b of boxes) { const v = iou(target, b); if (v >= bi) { bi = v; match = b; } }
      }
      if (!match && (!target || now - lastSeen > 300)) match = pick(boxes); // 短暂丢失后允许重新选人
      if (match) { target = match; lastSeen = now; lostAnnounced = false; }
      if (!match) {
        if (target && now - lastSeen > c.lostMs) {
          const lost = !lostAnnounced; lostAnnounced = true; target = null;
          return { l: 0, r: 0, target: null, lost, status: '丢失目标' };
        }
        return { l: 0, r: 0, target, lost: false, status: target ? '短暂丢失' : '寻找中' };
      }
      let off = target.x + target.w / 2 - 0.5;           // >0 人在右边
      if (mirror) off = -off;
      const turn = Math.abs(off) < c.deadband ? 0 : c.turnGain * (off - Math.sign(off) * c.deadband);
      const h = target.h;
      let fwd = 0, status = '保持距离';
      if (h < c.targetMin) { fwd = c.fwdGain * (c.targetMin - h) + 60; status = '靠近'; }
      else if (h > c.tooClose) { fwd = -c.backSpeed; status = '太近 后退'; }
      fwd = clamp(fwd, c.maxSpeed);
      return { l: Math.round(clamp(fwd + turn, c.maxSpeed)), r: Math.round(clamp(fwd - turn, c.maxSpeed)), target, lost: false, status };
    },
  };
}
