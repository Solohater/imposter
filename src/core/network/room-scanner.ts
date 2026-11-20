import { NativeHotspot } from '../network/hotspot-server.native';
import { PublicGameState } from '../store/use-multiplayer-store';

export interface DiscoveredRoom {
  roomCode: string;
  roomKey: string;
  hostName: string;
  hostIp: string;
  playerCount: number;
  phase: string;
}

/**
 * Probes the local network subnet to automatically discover active Imposter rooms.
 * Common hotspot/LAN gateway IPs are checked first in parallel.
 */
export async function scanForLocalRooms(): Promise<DiscoveredRoom[]> {
  const discovered: DiscoveredRoom[] = [];
  const candidateIps: string[] = [];

  // 1. Fast Wi-Fi subnet sweep & UDP broadcast discovery from native module
  try {
    const localHosts = await NativeHotspot.discoverLocalHosts(8080);
    for (const ip of localHosts) {
      if (!candidateIps.includes(ip)) {
        candidateIps.push(ip);
      }
    }
  } catch {}

  // 2. Exact DHCP gateway (the hotspot host or router) from Android WifiManager
  try {
    const gateway = await NativeHotspot.getGatewayIpAddress();
    if (gateway && gateway !== '0.0.0.0' && !candidateIps.includes(gateway)) {
      candidateIps.push(gateway);
    }
  } catch {}

  // 3. High-probability hotspot IPs
  const defaultIps = [
    '192.168.43.1', // Standard Android Portable Hotspot
    '192.168.49.1', // Wi-Fi Direct
    '172.20.10.1',  // iOS Hotspot
    '192.168.1.1',
    '192.168.0.1',
  ];

  for (const ip of defaultIps) {
    if (!candidateIps.includes(ip)) {
      candidateIps.push(ip);
    }
  }

  // 4. Current subnet gateway if different
  try {
    const currentIp = await NativeHotspot.getLocalIpAddress();
    if (currentIp && currentIp !== '0.0.0.0') {
      const parts = currentIp.split('.');
      if (parts.length === 4) {
        const subnetGateway = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
        if (!candidateIps.includes(subnetGateway)) {
          candidateIps.push(subnetGateway);
        }
      }
    }
  } catch {}

  const checkHost = async (ip: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`http://${ip}:8080/api/state`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const state: PublicGameState = JSON.parse(text);
        if (state && state.roomCode) {
          discovered.push({
            roomCode: state.roomCode,
            roomKey: state.roomKey || 'yap',
            hostName: state.hostName || 'Host',
            hostIp: ip,
            playerCount: state.players ? state.players.length : 1,
            phase: state.phase || 'LOBBY',
          });
        }
      }
    } catch {
      // Host not reachable at this IP
    }
  };

  await Promise.allSettled(candidateIps.map((ip) => checkHost(ip)));
  return discovered;
}
