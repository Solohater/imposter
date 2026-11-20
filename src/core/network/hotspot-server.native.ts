import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { HotspotServer } = NativeModules;

export interface HotspotServerInterface {
  startServer: (port: number) => Promise<boolean>;
  stopServer: () => Promise<boolean>;
  getLocalIpAddress: () => Promise<string>;
  getGatewayIpAddress: () => Promise<string>;
  discoverLocalHosts: (port: number) => Promise<string[]>;
  updatePublicState: (stateJson: string) => void;
  setPlayerRole: (playerId: string, roleJson: string) => void;
  clearPlayerRoles: () => void;
}

const isNativeAvailable = Platform.OS === 'android' && !!HotspotServer;

export const NativeHotspot = isNativeAvailable
  ? (HotspotServer as HotspotServerInterface)
  : {
      startServer: async () => false,
      stopServer: async () => true,
      getLocalIpAddress: async () => '192.168.43.1',
      getGatewayIpAddress: async () => '192.168.43.1',
      discoverLocalHosts: async () => [],
      updatePublicState: () => {},
      setPlayerRole: () => {},
      clearPlayerRoles: () => {},
    };

export const hotspotEventEmitter = isNativeAvailable
  ? new NativeEventEmitter(HotspotServer)
  : null;
