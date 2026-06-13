import psutil
import time
import subprocess
import winreg
import wmi
import os
import ctypes
import string


_disk_io_cache = {}


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


def get_gpu_info():
  result = []
  try:
    output = subprocess.check_output(
      [r"C:\Windows\System32\nvidia-smi.exe",
       "--query-gpu=name,temperature.gpu,utilization.gpu,memory.total,memory.used,memory.free",
       "--format=csv,noheader"],
       encoding="utf-8"
    )
    for line in output.strip().split("\n"):
      parts = [p.strip() for p in line.split(",")]
      if len(parts) >= 6 and "name" not in line.lower():
        result.append({
          "name": parts[0],
          "temp": int(parts[1]),
          "load": int(parts[2].replace(" %", "")),
          "memory_gpu_total_mb": int(parts[3].replace(" MiB", "")),
          "memory_gpu_used_mb": int(parts[4].replace(" MiB", "")),
          "memory_gpu_free_mb": int(parts[5].replace(" MiB", "")),
        })
  except Exception as e:
    print("GPU Error:", e)
  return result


def get_disk_health():
	disks_health = []

	try:
		w = wmi.WMI()
		for disk in w.Win32_DiskDrive():
			health = {
				"model": disk.Model.strip() if disk.Model else "Unknown",
				"size_gb": round(int(disk.Size) / 1024**3, 2) if disk.Size else 0,
				"status": disk.Status if disk.Status else "OK"
			}
			disks_health.append(health)
	except Exception as e:
		print("Disk Health Error:", e)
	return disks_health


def get_disk_io():
	global _disk_io_cache

	current = psutil.disk_io_counters(perdisk=True)
	current_time = time.time()

	result = {}

	for disk_name, counters in current.items():
		read_speed = 0.0
		write_speed = 0.0

		if disk_name in _disk_io_cache:
			prev_counters, prev_time = _disk_io_cache[disk_name]
			delta_time = current_time - prev_time
			if delta_time > 0:
				read_spead = round((counters.read_bytes - prev_counters.read_bytes) / delta_time / 1024 / 1024, 2)
				write_spead = round((counters.write_bytes - prev_counters.write_bytes) / delta_time / 1024 / 1024, 2)

		_disk_io_cache[disk_name] = (counters, current_time)
		result[disk_name] = {"read_mb_s": read_speed, "write_mb_s": write_speed}

	return result


if '_disk_io_global_cache' not in globals():
  global _disk_io_global_cache
  _disk_io_global_cache = {}

def get_disks():
	global _disk_io_global_cache
	
	current_io = psutil.disk_io_counters(perdisk=True)
	current_time = time.time()
	
	read_speed = 0.0
	write_speed = 0.0
	
	if "total" in _disk_io_global_cache:
		prev_io, prev_time = _disk_io_global_cache["total"]
		delta_time = current_time - prev_time
		if delta_time > 0:
			curr_all = psutil.disk_io_counters(perdisk=False)
			read_speed = round((curr_all.read_bytes - prev_io.read_bytes) / delta_time / 1024 / 1024, 2)
			write_speed = round((curr_all.write_bytes - prev_io.write_bytes) / delta_time / 1024 / 1024, 2)
			
			if read_speed < 0: read_speed = 0.0
			if write_speed < 0: write_speed = 0.0
			
	_disk_io_global_cache["total"] = (psutil.disk_io_counters(perdisk=False), current_time)
	
	disks_list = []
	
	if os.name == "nt":
		import string
		bitmask = ctypes.windll.kernel32.GetLogicalDrives()
		
		for letter in string.ascii_uppercase:
			if bitmask & 1:
				drive = f"{letter}:"
				drive_type = ctypes.windll.kernel32.GetDriveTypeW(drive)
				if drive_type not in (2, 3):
					bitmask >>= 1
					continue
				
				try:
					usage = psutil.disk_usage(drive)
					disks_list.append({
						"device": drive,
						"total": round(usage.total / 1024**3, 2),
						"used": round(usage.used / 1024**3, 2),
						"free": round(usage.free / 1024**3, 2),
						"percent": usage.percent,
						"disk_io_read_mb": read_speed if "C:" in drive else 0.0,
						"disk_io_write_mb": write_speed if "C:" in drive else 0.0
					})
				except:
					pass
			bitmask >>= 1
	else:
		for partition in psutil.disk_partitions(all=False):
			if not partition.fstype:
				continue
			try:
				usage = psutil.disk_usage(partition.mountpoint)
				disks_list.append({
					"device": partition.mountpoint,
					"total": round(usage.total / 1024**3, 2),
					"used": round(usage.used / 1024**3, 2),
					"free": round(usage.free / 1024**3, 2),
					"percent": usage.percent,
					"disk_io_read_mb": read_speed,
					"disk_io_write_mb": write_speed
				})
			except:
				continue
	return disks_list


def get_battery():
	battery = psutil.sensors_battery()
	if battery:
		return {
			"percent": battery.percent,
			"plugged": battery.power_plugged,
			"time_left": round(battery.secsleft / 60, 1) if battery.secsleft != -1 else None
		}
	else:
		return None


def get_pagefile():
	swap = psutil.swap_memory()
	return {
		"total_gb": round(swap.total / 1024**3, 2),
		"used_gb": round(swap.used / 1024**3, 2),
		"free_gb": round(swap.free / 1024**3, 2),
		"percent": swap.percent
	}


def get_listening_ports():
	result_conn_list = []
	try:
		conn_list = psutil.net_connections(kind="inet")

		for conn in conn_list:
			if len(result_conn_list) > 50:
				break
			
			if conn.status and "LISTEN" in conn.status:
				pid = conn.pid
				name = "N/A"
				
				if pid:
					try:
						name = psutil.Process(pid).name()
					except (psutil.NoSuchProcess, psutil.AccessDenied):
						name = "N/A"

				result_conn_list.append({
					"port": conn.laddr.port if conn.laddr else "-",
					"ip": conn.laddr.ip if conn.laddr else "-",
					"pid": pid or "N/A",
					"name": name
				})
	except psutil.AccessDenied:
		pass

	return result_conn_list
			

def get_metrics_all():
	cpu_percent = psutil.cpu_percent(interval=0.3)
	cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)

	mem = psutil.virtual_memory()
	memory_total = round(mem.total / 1024**3, 2)
	memory_available = round(mem.available / 1024**3, 2)
	memory_percent = mem.percent

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
		"disks": get_disks(),
		"net_mb_sent": net_mb_sent,
		"net_mb_recv": net_mb_recv,
		"uptime": f"{days}d {hours}h {minutes}m",
		"top_processes": top_by_cpu,
		"connections": connections,
		"startup_programs": startup_programs,
		"gpus": get_gpu_info(),
		"disks_health": get_disk_health(),
		"battery": get_battery(),
		"swap": get_pagefile(),
		"listening_ports": get_listening_ports()
	}
