const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const metricName = entry.name;
    const startTime = entry.startTime;
    const duration = entry.duration;
    const time = Math.round(startTime + duration);

    window.__emberUserPerf = window.__emberUserPerf || {};

    if (!window.__emberUserPerf[metricName]) {
      window.__emberUserPerf[metricName] = [];
    }

    window.__emberUserPerf[metricName].push({
      time,
      duration,
      startTime
    });
  }
});
