import da from 'zod/v4/locales/da.js';

type freshnessResult = {
  isPeak: boolean;
  dayPostRoast: number;
  peakStart: Date;
  peakEnd: Date;
};
function isPeakFreshness(roastDate: Date): freshnessResult {
  try {
    const now = new Date().getTime();
    const roastDateTime = roastDate.getTime();
    const dayPostRoast = Math.floor(
      (now - roastDateTime) / (1000 * 60 * 60 * 24),
    );
    const peakStart = new Date(roastDateTime + 7 * 24 * 60 * 60 * 1000); // 7 days after roast it is in the past aready startd the peak or staring the peak
    const peakEnd = new Date(roastDateTime + 21 * 24 * 60 * 60 * 1000); // 21 days after roast it is in the past aready end the peak or staring the end of the peak
    if (dayPostRoast >= 7 && dayPostRoast <= 21) {
      return {
        isPeak: true,
        dayPostRoast,
        peakStart,
        peakEnd,
      };
    } else {
      return {
        isPeak: false,
        dayPostRoast,
        peakStart,
        peakEnd,
      };
    }
  } catch (error) {
    console.error('Error calculating freshness:', error);
    return {
      isPeak: false,
      dayPostRoast: -1,
      peakStart: new Date(0),
      peakEnd: new Date(0),
    };
  }
}
