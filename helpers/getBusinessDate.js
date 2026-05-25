const BUSINESS_TIMEZONE = "Asia/Kolkata";

const getBusinessDate = (input = new Date()) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(input)
    .reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
};
module.exports = getBusinessDate;
