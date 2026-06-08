const socket = new WebSocket("ws://localhost:8000/ws/metrics")


socket.onmessage = (event) => {
	const data = JSON.parse(event.data);
	const cpu = document.getElementById("cpu-value");
	const memoryTotal = document.getElementById("memory-total-value");
	const memoryAvailable = document.getElementById("memory-available-value");
	
	cpu.textContent = data.cpu;
	memoryTotal.textContent = data.memory_total;
	memoryAvailable.textContent = data.memory_available;
}

socket.onerror = (error) => {
	console.log(error);
}

socket.onclose = (event) => {
	console.log(`Соединение закрыто. Код: ${event.code}, Причина: ${event.reason}`);
}
