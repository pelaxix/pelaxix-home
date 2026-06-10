dateHeading = function dateHeadingWithoutWeekday(date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: userTimeZone,
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
};

render();
