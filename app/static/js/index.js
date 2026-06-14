let cpuHistory = new Array(30).fill(0);

const ctx = document.getElementById("cpu-history-chart").getContext("2d");
const cpuHistoryChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [...Array(30).keys()].map((i) => i + 1),
    datasets: [
      {
        label: "CPU %",
        data: cpuHistory,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  },
  options: {
    scales: {
      y: {
        min: 0,
        max: 100,
      },
    },
  },
});

const netSentHistory = new Array(30).fill(0);
const netRecvHistory = new Array(30).fill(0);

const ctxNetwork = document.getElementById("network-chart").getContext("2d");
const networkChart = new Chart(ctxNetwork, {
  type: "line",
  data: {
    labels: [...Array(30).keys()].map((i) => i + 1),
    datasets: [
      {
        label: "Sent KB/s",
        data: netSentHistory,
        borderColor: "rgb(255, 99, 132)",
        tension: 0.1,
      },
      {
        label: "Recv KB/s",
        data: netRecvHistory,
        borderColor: "rgb(54, 162, 235)",
        tension: 0.1,
      },
    ],
  },
  options: {
    scales: {
      y: { min: 0 },
    },
  },
});

const ctxCores = document.getElementById("cpu-cores-chart").getContext("2d");
const cpuCoresChart = new Chart(ctxCores, {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      {
        label: "CPU %",
        data: [],
        backgroundColor: "rgba(54, 162, 235, 0.5)",
      },
    ],
  },
});

const ctxHistory = document.getElementById("history-chart").getContext("2d");
const historyChart = new Chart(ctxHistory, {
  type: "line",
  data: {
    lables: [],
    datasets: [
      {
        label: "CPU %",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
      {
        label: "Memory %",
        data: [],
        borderColor: "rgb(255, 159, 64)",
        tension: 0.1,
      },
      {
        label: "Disk %",
        data: [],
        borderColor: "rgb(153, 102, 255)",
        tension: 0.1,
      },
    ],
  },
  options: {
    scales: {
      y: {
        min: 0,
        max: 100,
      },
    },
  },
});

document.querySelectorAll(".range-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".range-btn").forEach(function (otherBtn) {
      otherBtn.classList.remove("active");
    });
    this.classList.add("active");
    var range = this.getAttribute("data-range");
    loadHistory(range);
  });
});

function showNotification(text, type = "info", duration = 4000) {
  if (type == "access") type = "success";

  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = text;

  container.prepend(toast);

  requestAnimationFrame(() => {
    toast.classList.add("active");
  });

  let isRemoving = false;

  const removeToast = () => {
    if (isRemoving) return;
    isRemoving = true;

    toast.classList.remove("active");
    toast.classList.add("fade-out");

    setTimeout(() => {
      toast.remove();
    }, 400);
  };

  toast.addEventListener("click", removeToast);

  setTimeout(removeToast, duration);
}

async function killProcess(pid) {
  try {
    const response = await fetch(`/api/process/${pid}`, {
      method: "DELETE",
    });
    if (response.ok) {
      showNotification("Process killed", "access");
    } else {
      showNotification(`Failed to kill process ${pid}`, "warning");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function showProcessInfo(pid) {
  try {
    const response = await fetch(`/api/process/${pid}/info`);
    if (!response.ok) {
      showNotification("Failed to get process info", "warning");
      return;
    }
    const info = await response.json();

    const content = document.getElementById("process-detail-content");
    content.innerHTML = `
    	<div class="detail-row">
        <span class="detail-label">Name:</span>
        <span class="detail-value process-name">${info.name}</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">PID:</span>
        <span class="detail-value">${info.pid}</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">Status:</span>
        <span class="detail-value">${info.status}</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">CPU:</span>
        <span class="detail-value">${info.cpu_percent}%</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">Memory:</span>
        <span class="detail-value">${info.memory_mb || info.memory}%</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">Threads:</span>
        <span class="detail-value">${info.threads}</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">User:</span>
        <span class="detail-value">${info.username}</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">Created:</span>
        <span class="detail-value">${info.create_time}</span>
    	</div>
    	<div class="detail-row">
        <span class="detail-label">Path:</span>
        <span class="detail-value process-path">${info.exe}</span>
    	</div>
		`;

    document.getElementById("process-detail").style.display = "block";
  } catch (error) {
    console.error("Error:", error);
  }
}

async function loadHistory(range = "hour") {
  console.log("Loading history for range:", range);
  try {
    const response = await fetch("/api/history");
    const data = await response.json();

    data.reverse();

    historyChart.data.labels = data.map((row) => {
      const d = new Date(row.timestamp);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      if (range === "day") {
        const dd = String(d.getDate()).padStart(2, "0");
        const mon = String(d.getMonth() + 1).padStart(2, "0");
        return `${dd}.${mon} ${hh}:${mm}`;
      }
      return `${hh}:${mm}`;
    });
    historyChart.data.datasets[0].data = data.map((row) => row.cpu_percent);
    historyChart.data.datasets[1].data = data.map((row) => row.memory_percent);
    historyChart.data.datasets[2].data = data.map((row) => row.disk_percent);

    historyChart.update();

    const title = document.getElementById("history-title");
    if (range === "day") {
      title.textContent = "History (last 24 hours)";
    } else {
      title.textContent = "History (last 60 minutes)";
    }
  } catch (error) {
    showNotification("Failed to load history", "warning");
  }
}

function exportReport() {
  window.open("/api/export", "_blank");
}

loadHistory();

let messageCount = 0;
let prevNetSent = 0;
let prevNetRecv = 0;

const socket = new WebSocket("ws://localhost:8000/ws/metrics");

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  messageCount++;
  if (messageCount % 60 == 0) {
    const activeRange =
      document.querySelector(".range-btn.active").dataset.range;
    loadHistory(activeRange);
  }

  let cpuAlertSent = false;
  let memoryAlertSent = false;

  if (data.cpu_percent > 90 && !cpuAlertSent) {
    showNotification(`⚠️ High CPU usage: ${data.cpu_percent}%`, "warning");
    cpuAlertSent = true;
  } else if (data.cpu_percent < 80) {
    cpuAlertSent = false;
  }

  if (data.memory_percent > 90 && !memoryAlertSent) {
    showNotification(
      `⚠️ High memory usage: ${data.memory_percent}%`,
      "warning",
    );
    memoryAlertSent = true;
  } else if (data.memory_percent < 80) {
    memoryAlertSent = false;
  }

  document.getElementById("cpu-value").textContent = data.cpu_percent;
  let coresText = data.cpu_per_core
    .map((load, i) => `<br>Core ${i + 1}: ${load}%<br>`)
    .join("");
  document.getElementById("cpu-cores").innerHTML = coresText;

  document.getElementById("memory-percent").textContent = data.memory_percent;
  document.getElementById("memory-details").innerHTML =
    `<br>Available: ${data.memory_available}GB
		<br>Total: ${data.memory_total}GB`;

  let disksHtml = "";
  data.disks.forEach((disk) => {
    let statusClass = "";
    if (disk.percent > 95) statusClass = "danger";
    else if (disk.percent > 85) statusClass = "warning";

    let readSpeed =
      typeof disk.disk_io_read_mb !== "undefined" ? disk.disk_io_read_mb : 0;
    let writeSpeed =
      typeof disk.disk_io_write_mb !== "undefined" ? disk.disk_io_write_mb : 0;

    disksHtml += `
      <div class="disk-item ${statusClass}">
        <div class="disk-item-header">
          <span>${disk.device}</span>
          <span class="disk-item-percent">${disk.percent}%</span>
        </div>
        <div class="disk-progress-bar">
          <div class="disk-progress-fill" style="width: ${disk.percent}%"></div>
        </div>
        <div class="disk-item-meta">
          <div>Free: ${disk.free} GB</div>
          <div>Total: ${disk.total} GB</div>
        </div>
				<div class="disk-io-box">
					<span>Read:</span>
					<span class="disk-io-val read">${Number(readSpeed).toFixed(1)} MB/s</span>
				</div>
				<div class="disk-io-box">
					<span>Write:</span>
					<span class="disk-io-val write">${Number(writeSpeed).toFixed(1)} MB/s</span>
				</div>
      </div>
    `;
  });
  document.getElementById("disk-details").innerHTML =
    `<div class="card-disks-container">${disksHtml}</div>`;

  document.getElementById("net-sent-recv").innerHTML =
    `<br>Sent: ${data.net_mb_sent.toFixed(2)} MB
		<br>Recv: ${data.net_mb_recv.toFixed(2)} MB`;

  document.getElementById("cpu-uptime").textContent = data.uptime;

  if (data.swap) {
    document.getElementById("pagefile-percent").textContent = data.swap.percent;
    document.getElementById("pagefile-details").innerHTML = `
			<br>Available: ${data.swap.free_gb} GB<br>
			Total: ${data.swap.total_gb} GB
		`;
  }

  const usersTable = document.getElementById("active-users-table");
  if (usersTable && data.active_users) {
    let usersHtml = "";

    data.active_users.forEach((user) => {
      const name = user.name || "Unknown";
      const terminal = user.terminal || "N/A";
      const started = user.started || "-";

      usersHtml += `<tr>
				<td><span class="user-name-badge">👤 ${user.name}</span></td>
				<td><span class="user-terminal-badge">${terminal}</span></td>
				<td>${user.started}</td>
			</tr>`;
    });
    usersTable.innerHTML = usersHtml;
  }

  const gpuContainer = document.getElementById("gpu-info");
  if (gpuContainer) {
    if (data.gpus && data.gpus.length > 0) {
      let gpusHtml = "";

      data.gpus.forEach((gpu) => {
        const vramPercent = (
          (gpu.memory_gpu_used_mb / gpu.memory_gpu_total_mb) *
          100
        ).toFixed(1);

        gpusHtml += `
					<div class="gpu-name">${gpu.name}</div>
      		<div class="gpu-meta">
        		Temp: ${gpu.temp}°C | Load: ${gpu.load}%
      		</div>
      		<div class="gpu-vram-container">
        		<div class="gpu-vram-header">
         	  	<span>VRAM Usage</span>
          		<span>${gpu.memory_gpu_used_mb} / ${gpu.memory_gpu_total_mb} MB (${vramPercent}%)</span>
        		</div>
        		<div class="gpu-progress-bar">
          		<div class="gpu-progress-fill" style="width: ${vramPercent}%"></div>
        		</div>
      		</div>
				`;
      });
      gpuContainer.innerHTML = gpusHtml;
    }
  }

  const batteryContainer = document.getElementById("battery-header-container");
  if (batteryContainer) {
    if (data.battery) {
      batteryContainer.classList = "🔋";

      let icon = "🔋";
      if (data.battery.percent < 20) icon = "🪫";
      if (data.battery.plugged) icon = "⚡";

      let text = `${icon} ${data.battery.percent}`;

      if (data.battery.plugged) {
        batteryContainer.classList.add("battery-plugged");
        text += " (Charging)";
      } else if (data.battery.time_left) {
        let hours = Math.floor(data.battery.time_left / 60);
        let min = Math.round(data.battery.time_left % 60);
        text += ` (${hours}h ${min}m left)`;
      }

      batteryContainer.innerText = text;
    } else {
      batteryContainer.className = "battery-hidden";
    }
  }

  const healthContainer = document.getElementById("disks-health-info");
  if (healthContainer && data.disks_health) {
    let healthHtml = "";

    data.disks_health.forEach((disk) => {
      let statusClass = "ok";
      let currentStatus = disk.status ? disk.status.toLowerCase() : "";

      if (
        currentStatus.includes("warning") ||
        currentStatus.includes("caution")
      ) {
        statusClass = "warning";
      } else if (
        currentStatus.includes("bad") ||
        currentStatus.includes("critical") ||
        currentStatus.includes("error")
      ) {
        statusClass = "critical";
      }

      healthHtml += `
        <div class="health-item">
          <div class="health-model-block">
            <span class="health-model">${disk.model}</span>
            <span class="health-size">Size: ${disk.size_gb} GB</span>
          </div>
          <div class="health-status-badge ${statusClass}">
            ${disk.status}
          </div>
        </div>
      `;
    });
    healthContainer.innerHTML = healthHtml;
  }

  const portsTable = document.getElementById("ports-table");
  if (portsTable && data.listening_ports) {
    let portsHtml = "";

    data.listening_ports.forEach((conn) => {
      const port = conn.port || "-";
      const ip = conn.ip || "*.*.*.*";
      const pid = conn.pid || "-";
      const processName = conn.name || "Unknown";

      portsHtml += `<tr>
				<td><span class="net-port-badge">${conn.port}</span></td>
				<td><span class="net-ip-style">${conn.ip}</span></td>
				<td>${conn.pid}</td>
				<td><div class="net-process-name" title="${conn.name}">${conn.name}</div></td>
			<tr>`;
    });
    portsTable.innerHTML = portsHtml;
  }

  const eventsTable = document.getElementById("events-table");
  if (eventsTable && data.event_logs) {
    let eventsHtml = "";

    data.event_logs.forEach((evt) => {
      const time = evt.time || "-";
      const source = evt.source || "Unknown";
      const id = evt.event_id || "0";
      const type = (evt.type || "Warning").toLowerCase();
      const message = evt.message || "";

      let badgeClass = "warning";
      let rowClass = "row-warning";

      if (type.includes("error") || type.includes("critical")) {
        badgeClass = "error";
        rowClass = "row-error";
      }

      eventsHtml += `<tr class="${rowClass}">
				<td>${time}</td>
				<td title="${source}">${source}</td>
				<td>${id}</td>
				<td><span class="event-badge ${badgeClass}">${type}</span></td>
				<td><div class="event-msg-truncated" title="${message}">${message}</div></td>
			</tr>`;
    });

    eventsTable.innerHTML = eventsHtml;
  }

  if (data.alert_cpu) {
    showNotification(
      `⚠️ CPU: ${data.cpu_percent}% threshold: ${data.cpu_threshold}`,
      "danger",
    );
  }

  if (data.alert_memory) {
    showNotification(
      `⚠️ Memory: ${data.memory_percent}% threshold: ${data.memory_threshold}`,
      "danger",
    );
  }

  let rows = "";
  data.top_processes.forEach((proc) => {
    rows += `<tr>
			<td>${proc.pid}</td>
			<td style="cursor:pointer; color:#3498db;" onclick="showProcessInfo(${proc.pid})">${proc.name}</td>
			<td>${proc.cpu_percent}</td>
			<td>${proc.threads}</td>
			<td><span class="kill-btn" onclick="killProcess(${proc.pid})" title="Kill process">🗑️</span></td>
		</tr>`;
  });
  document.getElementById("processes-table").innerHTML = rows;

  let connRows = "";
  data.connections.forEach((conn) => {
    connRows += `<tr>
			<td>${conn.local}</td>
			<td>${conn.remote}</td>
			<td>${conn.status}</td>
			<td>${conn.pid}</td>
		</tr>`;
  });
  document.getElementById("connections-table").innerHTML = connRows;

  let startupRows = "";
  data.startup_programs.forEach((prog) => {
    startupRows += `<tr>
      <td>${prog.name}</td>
      <td>${prog.source}</td>
      <td style="font-size:12px; word-break:break-all;">${prog.path}</td>
    </tr>`;
  });
  document.getElementById("startup-table").innerHTML = startupRows;

  cpuHistory.push(data.cpu_percent);
  if (cpuHistory.length > 30) {
    cpuHistory.shift();
  }
  cpuHistoryChart.data.datasets[0].data = cpuHistory;
  cpuHistoryChart.update();

  const netSentSpeed =
    prevNetSent === 0 ? 0 : data.net_mb_sent * 1024 - prevNetSent;
  const netRecvSpeed =
    prevNetRecv === 0 ? 0 : data.net_mb_recv * 1024 - prevNetRecv;
  prevNetSent = data.net_mb_sent * 1024;
  prevNetRecv = data.net_mb_recv * 1024;

  netSentHistory.push(netSentSpeed);
  netRecvHistory.push(netRecvSpeed);
  if (netSentHistory.length > 30) {
    netSentHistory.shift();
    netRecvHistory.shift();
  }

  networkChart.data.datasets[0].data = netSentHistory;
  networkChart.data.datasets[1].data = netRecvHistory;
  networkChart.update();

  cpuCoresChart.data.labels = data.cpu_per_core.map((_, i) => `Core ${i}`);
  cpuCoresChart.data.datasets[0].data = data.cpu_per_core;
  cpuCoresChart.update();
};

socket.onerror = (error) => {
  showNotification(`${error}`, "error");
};

socket.onclose = (event) => {
  console.log(
    `Соединение закрыто. Код: ${event.code}, Причина: ${event.reason}`,
  );
};

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("triggers-modal");
  const btnOpen = document.getElementById("btn-open-triggers");
  const btnCloseCross = document.getElementById("modal-close-cross");
  const btnCancel = document.getElementById("btn-cancel-triggers");
  const btnSave = document.getElementById("btn-save-triggers");

  const cpuSlider = document.getElementById("trigger-cpu");
  const cpuDisplay = document.getElementById("cpu-val-display");
  const memSlider = document.getElementById("trigger-memory");
  const memDisplay = document.getElementById("memory-val-display");
  const triggerEnabled = document.getElementById("trigger-enabled");

  if (!modal) return;

  const widgetKeys = [
    "cpu",
    "memory",
    "disks",
    "network",
    "gpu",
    "disks_health",
    "disk_io",
    "battery",
    "swap",
    "processes",
    "connections",
    "startup",
    "ports",
    "users",
    "events",
  ];

  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => {
        b.classList.remove("active");
        b.style.backgroundColor = "transparent";
        b.style.color = "#8E8E93";
      });

      btn.classList.add("active");
      btn.style.backgroundColor = "rgba(10, 132, 255, 0.1)";
      btn.style.color = "#0A84FF";

      const targetTab = btn.getAttribute("data-tab");
      const tabTriggers = document.getElementById("tab-triggers");
      const tabWidgets = document.getElementById("tab-widgets");

      if (targetTab === "tab-triggers") {
        if (tabTriggers) tabTriggers.style.display = "flex";
        if (tabWidgets) tabWidgets.style.display = "none";
      } else {
        if (tabTriggers) tabTriggers.style.display = "none";
        if (tabWidgets) tabWidgets.style.display = "grid";
      }
    });
  });

  if (btnOpen)
    btnOpen.addEventListener("click", () => modal.classList.add("active"));

  const closeModal = () => modal.classList.remove("active");
  if (btnCloseCross) btnCloseCross.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  if (cpuSlider && cpuDisplay) {
    cpuSlider.addEventListener("input", (e) => {
      cpuDisplay.textContent = `${e.target.value}%`;
    });
  }
  if (memSlider && memDisplay) {
    memSlider.addEventListener("input", (e) => {
      memDisplay.textContent = `${e.target.value}%`;
    });
  }

  function applyWidgetsVisibility(widgetsState) {
    widgetKeys.forEach((key) => {
      const cardElement = document.getElementById(`card-${key}`);
      if (cardElement) {
        if (widgetsState[key] === false) {
          cardElement.classList.add("widget-hidden-state");
        } else {
          cardElement.classList.remove("widget-hidden-state");
        }
      }
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const triggersPayload = {
        cpu: cpuSlider ? parseInt(cpuSlider.value) : 90,
        memory: memSlider ? parseInt(memSlider.value) : 90,
        enabled: triggerEnabled ? triggerEnabled.checked : true,
      };

      const widgetsPayload = {};
      widgetKeys.forEach((key) => {
        const checkbox = document.getElementById(`widget-${key}`);
        widgetsPayload[key] = checkbox ? checkbox.checked : true;
      });

      try {
        const [resTriggers, resWidgets] = await Promise.all([
          fetch("/api/triggers", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(triggersPayload),
          }),
          fetch("/api/widgets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(widgetsPayload),
          }),
        ]);

        if (resTriggers.ok && resWidgets.ok) {
          applyWidgetsVisibility(widgetsPayload);
          closeModal();
          showNotification("All settings updated successfully!", "access");
        } else {
          showNotification(
            `Failed to save settings. Triggers: ${resTriggers.status}, Widgets: ${resWidgets.status}`,
            "error",
          );
        }
      } catch (error) {
        console.error("Error saving settings via API:", error);
        showNotification("Network error while saving settings.", "error");
      }
    });
  }

  async function loadInitialSettings() {
    try {
      const [resTriggers, resWidgets] = await Promise.all([
        fetch("/api/triggers").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/widgets").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (resTriggers) {
        if (triggerEnabled)
          triggerEnabled.checked = resTriggers.enabled ?? true;
        if (cpuSlider && cpuDisplay) {
          cpuSlider.value = resTriggers.cpu ?? 90;
          cpuDisplay.textContent = `${resTriggers.cpu ?? 90}%`;
        }
        if (memSlider && memDisplay) {
          memSlider.value = resTriggers.memory ?? 90;
          memDisplay.textContent = `${resTriggers.memory ?? 90}%`;
        }
      }

      if (resWidgets) {
        widgetKeys.forEach((key) => {
          const checkbox = document.getElementById(`widget-${key}`);
          if (checkbox && resWidgets[key] !== undefined) {
            checkbox.checked = resWidgets[key];
          }
        });
        applyWidgetsVisibility(resWidgets);
      }
    } catch (error) {
      console.error("Error loading settings from API:", error);
    }
  }

  loadInitialSettings();
});
