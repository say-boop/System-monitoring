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

  container.prepend(toast)
	
	let isRemoving = false

  const removeToast = () => {
    if (isRemoving) return;
		isRemoving = true;
		
		toast.classList.add("fade-out");
		
		setTimeout(() => {
			toast.remove();
		}, 400)
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
      alert(`Failed to kill process ${pid}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function loadHistory() {
	try {
		const response = await fetch("/api/history");
		const data = await response.json();
		
		data.reverse();
		
		historyChart.data.labels = data.map(row => row.timestamp.slice(11, 16));
		historyChart.data.datasets[0].data = data.map(row => row.cpu_percent);
		historyChart.data.datasets[1].data = data.map(row => row.memory_percent);
		historyChart.data.datasets[2].data = data.map(row => row.disk_percent);
		
		historyChart.update()
	} catch (error) {
		showNotification("Failed to load history", "warning")
	}
}

loadHistory()

let messageCount = 0

const socket = new WebSocket("ws://localhost:8000/ws/metrics");

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
	
	messageCount++;
	if (messageCount % 60 == 0) {
		loadHistory()
	}
	
	let cpuAlertSent = false;
	let memoryAlertSent = false;
	
	if (data.cpu_percent > 90 && !cpuAlertSent) {
		showNotification(`⚠️ High CPU usage: ${data.cpu_percent}%`, "warning");
		cpuAlertSent = true
	} else if (data.cpu_percent < 80) {
		cpuAlertSent = false
	}
	
	if (data.memory_percent > 90 && !memoryAlertSent) {
    showNotification(`⚠️ High memory usage: ${data.memory_percent}%`, "warning");
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
	data.disks.forEach(disk => {
		let statusClass = "";
		if (disk.percent > 95) statusClass = "danger";
		else if (disk.percent > 85) statusClass = "warning";
		
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
      </div>
    `;
	})
	document.getElementById("disk-details").innerHTML =
    `<div class="card-disks-container">${disksHtml}</div>`;

  document.getElementById("net-sent-recv").innerHTML =
    `<br>Sent: ${data.net_mb_sent.toFixed(2)} MB
		<br>Recv: ${data.net_mb_recv.toFixed(2)} MB`;

  let rows = "";
  data.top_processes.forEach((proc) => {
    rows += `<tr>
			<td>${proc.pid}</td>
			<td>${proc.name}</td>
			<td>${proc.cpu_percent}</td>
			<td><span class="kill-btn" onclick="killProcess(${proc.pid})" title="Kill process">🗑️</span></td>
		</tr>`;
  });
  document.getElementById("processes-table").innerHTML = rows;

  cpuHistory.push(data.cpu_percent);
  if (cpuHistory.length > 30) {
    cpuHistory.shift();
  }
  cpuHistoryChart.data.datasets[0].data = cpuHistory;
  cpuHistoryChart.update();

  cpuCoresChart.data.labels = data.cpu_per_core.map((_, i) => `Core ${i}`);
  cpuCoresChart.data.datasets[0].data = data.cpu_per_core;
  cpuCoresChart.update();
};

socket.onerror = (error) => {
  showNotification(`${error}`, "error")
};

socket.onclose = (event) => {
  console.log(
    `Соединение закрыто. Код: ${event.code}, Причина: ${event.reason}`,
  );
};
