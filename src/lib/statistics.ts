/** Only opted-in visits on the configured public site are eligible for collection. */
export function mayRecordVisit(consent: boolean, enabled: boolean, origin: string, officialOrigin: string, pathname: string): boolean {
  return consent && enabled && !!officialOrigin && origin === officialOrigin && !/\/(?:auth|account)(?:\/|$)/.test(pathname);
}
