let takenCount = 0;
let missedCount = 0;
let totalCount = 0;
let sideEffectLog = {};
let streak = 0;

window.onload = function () {
  loadMedicines();
  loadEffects();
  loadStreak();
  updateStats();
  scheduleReminders();
};

// --- Add & Render Medicine ---

function addMedicine() {
  const name = document.getElementById("medName").value.trim();
  const time = document.getElementById("medTime").value;
  const dose = document.getElementById("medDose").value.trim() || "—";
  const freq = document.getElementById("medFreq").value;

  if (!name || !time) { showToast("⚠️ Enter medicine name and time."); return; }

  totalCount++;
  const med = { name, time, dose, freq, status: "pending", added: new Date().toLocaleDateString() };
  saveMedicine(med);
  renderMedicine(med, totalCount - 1);

  document.getElementById("medName").value = "";
  document.getElementById("medTime").value = "";
  document.getElementById("medDose").value = "";

  updateStats();
  showToast(`✅ ${name} added to schedule!`);
}

function renderMedicine(med, index) {
  const li = document.createElement("li");
  li.dataset.index = index;
  if (med.status === "taken") li.classList.add("taken");
  if (med.status === "missed") li.classList.add("missed");

  li.innerHTML = `
    <div>
      <strong>${med.name}</strong>
      <span class="badge">${med.dose}</span>
      <span class="badge">${med.freq}</span>
    </div>
    <div style="font-size:0.82rem; color:#555;">🕐 ${med.time} &nbsp;|&nbsp; 📅 ${med.added}</div>
    <div class="med-actions">
      <button onclick="markTaken(this, ${index})">✅ Taken</button>
      <button onclick="markMissed(this, ${index})" style="background: linear-gradient(90deg,#ff6b6b,#cc0000);">❌ Missed</button>
    </div>
  `;

  document.getElementById("medList").appendChild(li);
}

function markTaken(btn, index) {
  const li = btn.closest("li");
  if (li.classList.contains("taken") || li.classList.contains("missed")) return;
  li.classList.add("taken");
  takenCount++;
  updateMedicineStatus(index, "taken");
  updateStats();
  updateStreak();
  showToast("💊 Marked as taken!");
}

function markMissed(btn, index) {
  const li = btn.closest("li");
  if (li.classList.contains("taken") || li.classList.contains("missed")) return;
  li.classList.add("missed");
  missedCount++;
  updateMedicineStatus(index, "missed");
  updateStats();
  showToast("⚠️ Marked as missed.");
}

function clearMedicines() {
  if (!confirm("Clear all medications?")) return;
  localStorage.removeItem("doseguard_meds");
  document.getElementById("medList").innerHTML = "";
  takenCount = 0; missedCount = 0; totalCount = 0;
  updateStats();
  showToast("🗑 Schedule cleared.");
}

// --- Stats ---

function updateStats() {
  const percent = totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);
  document.getElementById("statTaken").textContent = `✅ Taken: ${takenCount}`;
  document.getElementById("statMissed").textContent = `❌ Missed: ${missedCount}`;
  document.getElementById("statAdherence").textContent = `📊 Adherence: ${percent}%`;
  document.getElementById("statStreak").textContent = `🔥 Streak: ${streak} days`;
}

// --- Streak ---

function updateStreak() {
  const today = new Date().toDateString();
  const lastDay = localStorage.getItem("doseguard_lastday");
  if (lastDay !== today) {
    streak++;
    localStorage.setItem("doseguard_streak", streak);
    localStorage.setItem("doseguard_lastday", today);
    updateStats();
  }
}

function loadStreak() {
  streak = parseInt(localStorage.getItem("doseguard_streak") || "0");
}

// --- Side Effects ---

function logEffect() {
  const effect = document.getElementById("sideEffect").value;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  sideEffectLog[effect] = (sideEffectLog[effect] || 0) + 1;

  const existing = [...document.querySelectorAll("#effectList li")]
    .find(el => el.dataset.effect === effect);

  if (existing) {
    existing.querySelector(".effect-label").textContent =
      `${effect} (x${sideEffectLog[effect]}) — last at ${now}`;
  } else {
    const li = document.createElement("li");
    li.dataset.effect = effect;
    li.innerHTML = `<span class="effect-label">${effect} (x${sideEffectLog[effect]}) — last at ${now}</span>`;
    document.getElementById("effectList").appendChild(li);
  }

  saveEffects();

  if (sideEffectLog[effect] === 3) {
    showToast(`🚨 "${effect}" logged 3 times — consult a doctor!`);
    if (Notification.permission === "granted") {
      new Notification("DoseGuard Alert", {
        body: `"${effect}" has been reported 3 times. Please consult your doctor.`,
        icon: "https://cdn-icons-png.flaticon.com/512/2913/2913465.png"
      });
    }
  } else {
    showToast(`Logged: ${effect}`);
  }
}

function clearEffects() {
  if (!confirm("Clear all side effect logs?")) return;
  localStorage.removeItem("doseguard_effects");
  document.getElementById("effectList").innerHTML = "";
  sideEffectLog = {};
  showToast("🗑 Side effects cleared.");
}

// --- Reminders ---

function enableReminders() {
  Notification.requestPermission().then(perm => {
    if (perm === "granted") {
      document.getElementById("reminderStatus").textContent = "✅ Notifications enabled!";
      document.getElementById("reminderStatus").style.color = "green";
      showToast("🔔 Reminders enabled!");
      scheduleReminders();
    } else {
      document.getElementById("reminderStatus").textContent = "❌ Permission denied.";
      showToast("Notification permission denied.");
    }
  });
}

function scheduleReminders() {
  if (Notification.permission !== "granted") return;
  const meds = JSON.parse(localStorage.getItem("doseguard_meds") || "[]");
  const now = new Date();

  meds.forEach(med => {
    if (med.status !== "pending") return;
    const [h, m] = med.time.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const diff = target - now;
    if (diff > 0 && diff < 86400000) {
      setTimeout(() => {
        new Notification("💊 DoseGuard Reminder", {
          body: `Time to take ${med.name} (${med.dose})`,
          icon: "https://cdn-icons-png.flaticon.com/512/2913/2913465.png"
        });
      }, diff);

      const li = document.createElement("li");
      li.textContent = `⏰ ${med.name} reminder set for ${med.time}`;
      document.getElementById("reminderList").appendChild(li);
    }
  });
}

// --- Toast ---

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// --- Local Storage ---

function saveMedicine(med) {
  const meds = JSON.parse(localStorage.getItem("doseguard_meds") || "[]");
  meds.push(med);
  localStorage.setItem("doseguard_meds", JSON.stringify(meds));
}

function updateMedicineStatus(index, status) {
  const meds = JSON.parse(localStorage.getItem("doseguard_meds") || "[]");
  if (meds[index]) meds[index].status = status;
  localStorage.setItem("doseguard_meds", JSON.stringify(meds));
}

function loadMedicines() {
  const meds = JSON.parse(localStorage.getItem("doseguard_meds") || "[]");
  totalCount = meds.length;
  takenCount = meds.filter(m => m.status === "taken").length;
  missedCount = meds.filter(m => m.status === "missed").length;
  meds.forEach((med, i) => renderMedicine(med, i));
}

function saveEffects() {
  localStorage.setItem("doseguard_effects", JSON.stringify(sideEffectLog));
}

function loadEffects() {
  sideEffectLog = JSON.parse(localStorage.getItem("doseguard_effects") || "{}");
  Object.entries(sideEffectLog).forEach(([effect, count]) => {
    const li = document.createElement("li");
    li.dataset.effect = effect;
    li.innerHTML = `<span class="effect-label">${effect} (x${count})</span>`;
    document.getElementById("effectList").appendChild(li);
  });
}
