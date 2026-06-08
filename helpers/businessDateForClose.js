const BUSINESS_TIMEZONE = "Asia/Kolkata";
const BUSINESS_DAY_CUTOFF_HOUR = 2;

const getCurrentBusinessCloseDate = (input = new Date()) => {
  const hourParts = new Intl.DateTimeFormat("en", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(input);

  const currentHour = parseInt(
    hourParts.find((p) => p.type === "hour").value,
    10
  );

  const adjustedInput = new Date(input);
  if (currentHour < BUSINESS_DAY_CUTOFF_HOUR) {
    adjustedInput.setDate(adjustedInput.getDate() - 1);
  }

  const parts = new Intl.DateTimeFormat("en", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(adjustedInput)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
};

module.exports = getCurrentBusinessCloseDate