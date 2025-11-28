(() => {
  const armBtn = document.getElementById('armBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusEl = document.getElementById('status');
  const accuracyEl = document.getElementById('accuracy');
  const distanceDisplay = document.getElementById('distanceDisplay');
  const timeEl = document.getElementById('time');
  const avgSpeedEl = document.getElementById('avgSpeed');
  const peakSpeedEl = document.getElementById('peakSpeed');
  const logArea = document.getElementById('logArea');
  const distanceSelect = document.getElementById('distance');

  let watchId = null;
  let armed = false;
  let running = false;
  let startPos = null;
  let lastPos = null;
  let cumulative = 0;
  let target = Number(distanceSelect.value);
  let startTime = null;
  let peakSpeed = 0;
  let log = [];

  // Fungsi Haversine untuk jarak GPS
  function hav(a, b) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * rad;
    const dLon = (b.longitude - a.longitude) * rad;
    const la = a.latitude * rad, lb = b.latitude * rad;
    const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
    const h = s1 * s1 + Math.cos(la) * Math.cos(lb) * s2 * s2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function logMsg(msg) {
    log.unshift(msg);
    logArea.textContent = log.slice(0, 50).join("\n");
  }

  function update() {
    if (!running) return;
    const s = (performance.now() - startTime) / 1000;
    timeEl.textContent = s.toFixed(3) + " s";
    avgSpeedEl.textContent = ((cumulative / s) * 3.6).toFixed(2) + " km/h";
    peakSpeedEl.textContent = (peakSpeed * 3.6).toFixed(2) + " km/h";
  }

  function onPos(p) {
    const c = p.coords;
    accuracyEl.textContent = (c.accuracy || 0).toFixed(1) + " m";
    const cur = { latitude: c.latitude, longitude: c.longitude, speed: c.speed || 0 };

    if (!armed) return;

    if (!startPos) {
      if (c.accuracy <= 50) {
        startPos = cur;
        lastPos = cur;
        logMsg("GPS fix OK.");
        statusEl.textContent = "armed (menunggu gerak)";
      } else {
        logMsg("Akurasi kurang baik: " + c.accuracy.toFixed(1) + " m");
      }
      return;
    }

    const d = hav(lastPos, cur);
    lastPos = cur;

    if (!running) {
      const moved = hav(startPos, cur);
      if ((c.speed > 1) || (moved > 1.5)) {
        running = true;
        startTime = performance.now();
        cumulative = 0;
        peakSpeed = c.speed;
        logMsg("START!");
        statusEl.textContent = "running";
      }
    } else {
      cumulative += d;
      distanceDisplay.textContent = cumulative.toFixed(2) + " m";
      if (c.speed > peakSpeed) peakSpeed = c.speed;

      if (cumulative >= target) {
        running = false;
        armed = false;
        const t = (performance.now() - startTime) / 1000;
        logMsg("FINISH! Waktu: " + t.toFixed(3) + " s");
        statusEl.textContent = "finish";
      }
      update();
    }
  }

  function arm() {
    armed = true;
    running = false;
    startPos = null; lastPos = null; cumulative = 0; peakSpeed = 0;
    statusEl.textContent = "arming...";
    logMsg("Menunggu GPS...");

    if (watchId !== null) return;

    watchId = navigator.geolocation.watchPosition(
      onPos,
      e => { logMsg("ERROR: " + e.message); },
      { enableHighAccuracy: true }
    );
  }

  function reset() {
    armed = false; running = false;
    startPos = null; lastPos = null; cumulative = 0;
    statusEl.textContent = "idle";
    distanceDisplay.textContent = "0.00 m";
    timeEl.textContent = "0.000 s";
    avgSpeedEl.textContent = "—";
    peakSpeedEl.textContent = "—";
    logMsg("Reset.");
    if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  }

  armBtn.onclick = () => { if (!armed) arm(); else reset(); };
  resetBtn.onclick = reset;
  distanceSelect.onchange = () => target = Number(distanceSelect.value);

  setInterval(update, 50);
})();
