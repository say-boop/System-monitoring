import psutil


def get_metrics_all():
	cpu_percent = psutil.cpu_percent(interval=0.3)
	cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)

	mem = psutil.virtual_memory()
	memory_total = round(mem.total / 1024**3, 2)
	memory_available = round(mem.available / 1024**3, 2)
	memory_percent = mem.percent

	disks = []
	for partition in psutil.disk_partitions():
		try:
			usage = psutil.disk_usage(partition.device)
			disks.append({
				"device": partition.device,
				"total": round(usage.total / 1024**3, 2),
				"used": round(usage.used / 1024**3, 2),
				"free": round(usage.free / 1024**3, 2),
				"percent": usage.percent
			})
		except PermissionError:
			continue

	net = psutil.net_io_counters()
	net_mb_sent = net.bytes_sent / 1024 / 1024
	net_mb_recv = net.bytes_recv / 1024 / 1024

	proc_objects = []
	for proc in psutil.process_iter(["pid", "name"]):
		try:
			proc.cpu_percent(interval=None)
			proc_objects.append(proc)
		except (psutil.NoSuchProcess, psutil.AccessDenied):
			continue

	result = []
	for proc in proc_objects:
		try:
			info = proc.info
			
			if not info["name"]:
				info["name"] = "System"
			
			if info["name"] == "System Idle Process":
				continue
			
			raw_cpu = proc.cpu_percent(interval=None)
			info["cpu_percent"] = round(raw_cpu / psutil.cpu_count(), 1)
			result.append(info)
		except (psutil.NoSuchProcess, psutil.AccessDenied):
			continue

	top_by_cpu = sorted(result, key=lambda x: x.get("cpu_percent", 0) or 0, reverse=True)[:5]

	return {
		"cpu_percent": cpu_percent,
		"cpu_per_core": cpu_per_core,
		"memory_total": memory_total,
		"memory_available": memory_available,
		"memory_percent": memory_percent,
		"disks": disks,
		"net_mb_sent": net_mb_sent,
		"net_mb_recv": net_mb_recv,
		"top_processes": top_by_cpu
	}
