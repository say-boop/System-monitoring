from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import logging
import asyncio
import psutil


app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")

logger = logging.getLogger(__name__)


@app.get("/")
def root(request: Request):
	cpu_percent = psutil.cpu_percent(interval=0.3)
	mem = psutil.virtual_memory()
	memory_total_gb = round(mem.total / 1024**3, 2)
	memory_available_gb = round(mem.available / 1024**3, 2)

	context = {
		"request": request,
		"cpu_percent": cpu_percent,
		"memory_total": memory_total_gb,
		"memory_available": memory_available_gb
	}
	
	return templates.TemplateResponse(
		request=request,
		name="index.html",
		context=context
	)


@app.get("/api/health")
def get_metrics():
	return get_metrics_all()


@app.delete("/api/process/{pid}")
def kill_process(pid: int):
	try:
		process = psutil.Process(pid)
		process.terminate()
		
		return {
			"status": "terminated",
			"pid": pid
		}
	
	except psutil.NoSuchProcess:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Процесс не найден")
	except psutil.AccessDenied:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет прав на завершение процесса")


def get_metrics_all():
	cpu_percent = psutil.cpu_percent(interval=0.3)
	cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)

	mem = psutil.virtual_memory()
	memory_total = round(mem.total / 1024**3, 2)
	memory_available = round(mem.available / 1024**3, 2)
	memory_percent = mem.percent

	disk = psutil.disk_usage("/")
	disk_total = round(disk.total / 1024**3, 2)
	disk_used = round(disk.used / 1024**3, 2)
	disk_free = round(disk.free / 1024**3, 2)
	disk_percent = disk.percent

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
		"disk_total": disk_total,
		"disk_used": disk_used,
		"disk_free": disk_free,
		"disk_percent": disk_percent,
		"net_mb_sent": net_mb_sent,
		"net_mb_recv": net_mb_recv,
		"top_processes": top_by_cpu
	}
		


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
	await websocket.accept()
	try:
		while True:
			content = get_metrics()
		
			await websocket.send_json(content)
		
			await asyncio.sleep(1)
	except WebSocketDisconnect as e:
		logger.info("Пользователь отключился.")
