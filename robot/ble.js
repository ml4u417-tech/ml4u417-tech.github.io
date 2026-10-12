// Web Bluetooth 传输层（Android Chrome）。iOS / 不支持时返回 null。
export const SVC_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CMD_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const STS_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9';

export function bleSupported() {
  return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
}

export function createBleTransport({ onStatus, onDisconnect } = {}) {
  let device = null, server = null, cmdChar = null, reconnecting = false;
  const enc = new TextEncoder();

  async function connect() {
    if (!bleSupported()) throw new Error('此浏览器不支持 Web Bluetooth（请用安卓 Chrome）');
    device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'PhoneRobot' }, { services: [SVC_UUID] }],
      optionalServices: [SVC_UUID],
    });
    device.addEventListener('gattserverdisconnected', onDisc);
    await openGatt();
  }

  async function openGatt() {
    server = await device.gatt.connect();
    const svc = await server.getPrimaryService(SVC_UUID);
    cmdChar = await svc.getCharacteristic(CMD_UUID);
    try {
      const st = await svc.getCharacteristic(STS_UUID);
      await st.startNotifications();
      st.addEventListener('characteristicvaluechanged', e => {
        const t = new TextDecoder().decode(e.target.value);
        onStatus && onStatus(t);
      });
    } catch {}
    onStatus && onStatus('{"ok":1}');
  }

  function onDisc() {
    cmdChar = null;
    onDisconnect && onDisconnect();
    if (!reconnecting && device) {
      reconnecting = true;
      setTimeout(async () => {
        try { await openGatt(); } catch { /* 下次用户点连接 */ }
        reconnecting = false;
      }, 800);
    }
  }

  function send(obj) {
    if (!cmdChar) return false;
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    // writeValueWithoutResponse 更快；不支持时退回 writeValue
    const u8 = enc.encode(s);
    try {
      if (cmdChar.properties.writeWithoutResponse) cmdChar.writeValueWithoutResponse(u8);
      else cmdChar.writeValue(u8);
      return true;
    } catch { return false; }
  }

  function disconnect() {
    reconnecting = false;
    try { device && device.gatt && device.gatt.disconnect(); } catch {}
    device = null; server = null; cmdChar = null;
  }

  return {
    connect, send, disconnect,
    get connected() { return !!(device && device.gatt && device.gatt.connected && cmdChar); },
  };
}
