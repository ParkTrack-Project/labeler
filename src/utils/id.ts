export const genZoneId = () => `zone_${crypto.randomUUID().slice(0,8)}`;
export const genLotId  = (zoneId: string) => `${zoneId}_lot_${crypto.randomUUID().slice(0,6)}`;
