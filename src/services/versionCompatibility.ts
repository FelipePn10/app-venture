export const CLIENT_UPGRADE_REQUIRED_EVENT = 'venture:client-upgrade-required';

export interface ClientUpgradeRequiredDetail {
  clientVersion?: string;
  minClient?: string;
  client_version?: string;
  min_client?: string;
  message?: string;
}

export function notifyClientUpgradeRequired(detail: ClientUpgradeRequiredDetail): void {
  window.dispatchEvent(new CustomEvent<ClientUpgradeRequiredDetail>(CLIENT_UPGRADE_REQUIRED_EVENT, { detail }));
}
