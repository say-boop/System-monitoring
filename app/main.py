from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import logging
import asyncio
import psutil


from app.database import save_metrics, get_history
from app.metrics import get_metrics_all


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


@app.get("/api/history")
def history():
	return get_history()
	

@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
	await websocket.accept()
	last_save_time = datetime.now()
	
	try:
		while True:
			content = get_metrics()

			if (datetime.now() - last_save_time).seconds >= 60:
				save_metrics(content)
				last_save_time = datetime.now()
		
			await websocket.send_json(content)
		
			await asyncio.sleep(1)
	except WebSocketDisconnect as e:
		logger.info("Пользователь отключился.")
