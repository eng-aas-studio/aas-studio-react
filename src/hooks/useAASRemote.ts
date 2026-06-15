import { useApiWrapper } from '@/api/apiWrapper';

// ── Types ──────────────────────────────────────────────────────────────────

export type RemoteAuth =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apiKey'; header: string; value: string };

export interface RemoteShellSummary {
  id: string;
  idShort?: string;
  assetInformation?: { assetKind?: string; globalAssetId?: string };
  submodels?: unknown[];
}

export interface PingResult {
  reachable: boolean;
  baseUrl: string;
  profiles: string[];
  statusCode?: number;
}

export interface PullResult {
  shell: Record<string, unknown>;
  submodels: unknown[];
  failed: { id: string; statusCode: number }[];
}

// ── Hook ───────────────────────────────────────────────────────────────────

export const useAASRemote = () => {
  const api = useApiWrapper();
  const BASE = '/v1/aas-remote';

  /** Check reachability and read the server's supported profiles. */
  const ping = (baseUrl: string, auth?: RemoteAuth) =>
    api.post<PingResult>(`${BASE}/ping`, { baseUrl, auth });

  /** List shells available on the remote repository (one page). */
  const listShells = (baseUrl: string, auth?: RemoteAuth, cursor?: string, limit = 100) =>
    api.post<{ shells: RemoteShellSummary[]; paging: { cursor?: string } | null }>(
      `${BASE}/shells`,
      { baseUrl, auth, cursor, limit },
    );

  /** Fetch a shell and its submodels (raw standard AAS JSON). */
  const pull = (baseUrl: string, auth?: RemoteAuth, shellId?: string) =>
    api.post<PullResult>(`${BASE}/pull`, { baseUrl, auth, shellId });

  return { ping, listShells, pull };
};
