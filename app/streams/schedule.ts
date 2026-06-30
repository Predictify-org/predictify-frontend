export type MonthlyScheduleConfig = {
  anchorDay: number;
  monthlyAmount: number;
  startDateUtc: Date;
  pauseDateUtc?: Date;
  displayTimeZone?: "utc" | "local";
};

export type MonthlyProration = {
  activeDays: number;
  daysInMonth: number;
  ratio: number;
  proratedAmount: number;
};

export type MonthlyScheduleSummary = {
  label: string;
  proration: MonthlyProration;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DST_NOTE = "Local time may shift with DST; calculations use UTC.";
const UTC_NOTE = "Calculations use UTC.";

const getUtcDateParts = (date: Date) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth(),
  day: date.getUTCDate(),
});

const getDaysInMonthUtc = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const formatUtcDate = (date: Date) => {
  const { year, month, day } = getUtcDateParts(date);
  return `${MONTH_NAMES[month]} ${day}, ${year}`;
};

const formatOrdinalDay = (day: number) => {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

export const validateMonthlyAnchorDay = (anchorDay: number) => {
  if (!Number.isInteger(anchorDay)) {
    return "Monthly anchor day must be an integer.";
  }

  if (anchorDay < 1 || anchorDay > 31) {
    return "Monthly anchor day must be between 1 and 31.";
  }

  return null;
};

export const calculateMonthlyProration = ({
  anchorDay,
  monthlyAmount,
  startDateUtc,
  pauseDateUtc,
}: MonthlyScheduleConfig): MonthlyProration => {
  const anchorError = validateMonthlyAnchorDay(anchorDay);
  if (anchorError) {
    throw new Error(anchorError);
  }

  if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
    throw new Error("Monthly amount must be a non-negative number.");
  }

  const start = getUtcDateParts(startDateUtc);
  const daysInMonth = getDaysInMonthUtc(start.year, start.month);
  const endDate = pauseDateUtc ?? new Date(Date.UTC(start.year, start.month, daysInMonth));
  const end = getUtcDateParts(endDate);

  if (end.year !== start.year || end.month !== start.month) {
    throw new Error("Pause date must be in the same UTC month as start date.");
  }

  if (end.day < start.day) {
    throw new Error("Pause date must be on or after the start date.");
  }

  const activeDays = end.day - start.day + 1;
  const ratio = activeDays / daysInMonth;

  return {
    activeDays,
    daysInMonth,
    ratio,
    proratedAmount: monthlyAmount * ratio,
  };
};

export const formatMonthlyScheduleSummary = (config: MonthlyScheduleConfig): MonthlyScheduleSummary => {
  const { anchorDay, startDateUtc, pauseDateUtc, displayTimeZone = "utc" } = config;
  const proration = calculateMonthlyProration(config);
  const anchorLabel = `Monthly on the ${formatOrdinalDay(anchorDay)}`;
  const startLabel = `Starts ${formatUtcDate(startDateUtc)}`;
  const pauseLabel = pauseDateUtc ? `Paused ${formatUtcDate(pauseDateUtc)}` : null;
  const prorationLabel =
    proration.activeDays === proration.daysInMonth
      ? "Full month (UTC)"
      : `Prorated for ${proration.activeDays} of ${proration.daysInMonth} days (UTC)`;
  const timezoneNote = displayTimeZone === "local" ? DST_NOTE : UTC_NOTE;

  const parts = [startLabel, pauseLabel, anchorLabel, prorationLabel].filter(Boolean);

  return {
    label: `${parts.join("; ")}. ${timezoneNote}`,
    proration,
  };
};
