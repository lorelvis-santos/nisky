import { DateTime } from "luxon";
import { UASD_TIME_ZONE } from "../../../../scripts/uasd/types";

export function latestUasdPeriod(now = DateTime.now().setZone(UASD_TIME_ZONE)): string {
  return `${now.year}${now.month >= 7 ? "20" : "10"}`;
}
