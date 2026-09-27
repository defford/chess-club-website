export const CURRENT_SEASON = {
  KEY: '2026-27',
  LABEL: '2026–27',
  START_DATE: '2026-10-06',
} as const;

export const LADDER_CONFIG = {
  // Games before the current season start date are excluded from ladder calculations.
  CURRENT_SEASON_START_DATE: CURRENT_SEASON.START_DATE,
};
