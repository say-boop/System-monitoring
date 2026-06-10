import psutil
import time
import winreg


def get_startup_programs():
	programs = []

	paths = [
		(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run"),
		(winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Run")
	]

	for hive, subkey in paths:
		try:
			key = winreg.OpenKey(hive, subkey)
			for i in range(winreg.QueryInfoKey(key)[1]):
				name, value, _ = winreg.EnumValue(key, 1)
				programs.append({
					"name": name,
					"path": value,
					"source": "HKCU" if hive == winreg.HKEY_CURRENT_USER else "HKLM"
				})
				winreg.CloseKey(key)
		except OSError:
			continue

	return programs


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

	uptime_seconds = int(time.time() - psutil.boot_time())
	days = uptime_seconds // 86400
	hours = (uptime_seconds % 86400) // 3600
	minutes = (uptime_seconds % 3600) // 60

	connections = []
	try:
		for conn in psutil.net_connections(kind="inet"):
			if len(connections) >= 20:
				break
			connections.append({
				"local": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "-",
				"remote": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "-",
				"status": conn.status,
				"pid": conn.pid or "-"
			})
	except psutil.AccessDenied:
		pass

	startup_programs = get_startup_programs()

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

			try:
				proc_obj = psutil.Process(info["pid"])
				info["threads"] = proc_obj.num_threads()
			except(psutil.NoSuchProcess, psutil.AccessDenied):
				info["threads"] = 0
			
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
		"uptime": f"{days}d {hours}h {minutes}m",
		"top_processes": top_by_cpu,
		"connections": connections,
		"startup_programs": startup_programs
	}
