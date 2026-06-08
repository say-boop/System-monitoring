let cpuHistory = new Array(30).fill(0)

const ctx = document.getElementById("cpu-history-chart").getContext("2d");
const cpuHistoryChart = new Chart(ctx, {
	type: "line",
	data: {
		labels: [...Array(30).keys()].map(i => i + 1),
		datasets: [{
			label: "CPU %",
			data: cpuHistory,
			borderColor: "rgb(75, 192, 192)",
			tension: 0.1
		}]
	},
	options: {
		scales: {
			y: {
				min: 0,
				max: 100
			}
		}
	}
});

const ctxCores = document.getElementById("cpu-cores-chart").getContext("2d");
const cpuCoresChart = new Chart(ctxCores, {
	type: "bar",
	data: {
		labels: [],
		datasets: [{
			label: "CPU %",
			data: [],
			backgroundColor: "rgba(54, 162, 235, 0.5)"
		}]
	}
});

const socket = new WebSocket("ws://localhost:8000/ws/metrics")


socket.onmessage = (event) => {
	const data = JSON.parse(event.data);
	
	document.getElementById("cpu-value").textContent = data.cpu_percent;
	let coresText = data.cpu_per_core
    .map((load, i) => `<br>Core ${i + 1}: ${load}%<br>`)
    .join("-------------------------");
	document.getElementById("cpu-cores").innerHTML = coresText;
	
	document.getElementById("memory-percent").textContent = data.memory_percent;
	document.getElementById("memory-details").innerHTML = 
	`<br>Available: ${data.memory_available}GB
	<br>Total: ${data.memory_total}GB`;
	
	document.getElementById("disk-percent").textContent = data.disk_percent
	document.getElementById("disk-details").innerHTML =
    `<br>Total: ${data.disk_total}GB
		<br>Free: ${data.disk_free}GB
		<br>Used: ${data.disk_used}GB`;
	
	document.getElementById("net-sent-recv").innerHTML =
    `<br>Sent: ${data.net_mb_sent.toFixed(2)}MB
		<br>Recv: ${data.net_mb_recv.toFixed(2)}MB`;
	
	let rows = "";
	data.top_processes.forEach((proc) => {
    rows += `<tr><td>${proc.pid}</td><td>${proc.name}</td><td>${proc.cpu_percent}</td></tr>`;
  });
	document.getElementById("processes-table").innerHTML = rows;
	
	cpuHistory.push(data.cpu_percent);
	if (cpuHistory.length > 30) {
		cpuHistory.shift();
	}
	cpuHistoryChart.data.datasets[0].data = data.cpuHistory
	cpuHistoryChart.update()
	
	cpuCoresChart.data.labels = data.cpu_per_core.map((_, i) => `Core ${i}`);
	cpuCoresChart.data.datasets[0].data = data.cpu_per_core;
	cpuCoresChart.update()
}

socket.onerror = (error) => {
	console.log(error);
}

socket.onclose = (event) => {
	console.log(`Соединение закрыто. Код: ${event.code}, Причина: ${event.reason}`);
}
