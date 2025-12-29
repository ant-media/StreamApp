export function generateRandomString(n: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < n; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

export function getWebSocketURL(location: Location, rtmpForward?: string): string {
  const appName = location.pathname.substring(1, location.pathname.indexOf("/", 1) + 1);
  let path = `${location.hostname}:${location.port}/${appName}websocket`;
  if (typeof rtmpForward !== "undefined") {
    path += `?rtmpForward=${rtmpForward}`;
  }
  let websocketURL = `ws://${path}`;
  if (location.protocol.startsWith("https")) {
    websocketURL = `wss://${path}`;
  }
  return websocketURL;
}
