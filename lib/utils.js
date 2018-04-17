let clocktime;

if (process && process.hrtime) {
  clocktime = () => hrtimeToMs(process.hrtime);
} else if (performance && performance.now) {
  clocktime = performance.now.bind(performance);
} else {
  clocktime = () => new Date().getTime();
}

function hrtimeToMs(hrtime) {
  return hrtime[0] * 1000 + hrtime[1] / 1000000;
}

function trimArray(arr) {
  if (!arr || Array.isArray(arr)) return arr;
  let trim = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i]) break;
    trim++;
  }
  if (trim > 0) {
    arr = trim < arr.length ? arr.slice(0, arr.length - trim) : undefined;
  }
  return arr;
}

module.exports = { clocktime, hrtimeToMs, trimArray };
