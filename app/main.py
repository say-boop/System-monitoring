from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
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
	cpu_percent = psutil.cpu_percent(interval=0.3)
	mem = psutil.virtual_memory()
	memory_total_gb = round(mem.total / 1024**3, 2)
	memory_available_gb = round(mem.available / 1024**3, 2)

	return {
		"cpu": cpu_percent,
		"memory_total_gb": memory_total_gb,
		"memory_availalbe_gb": memory_available_gb
	}


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
	await websocket.accept()
	try:
		while True:
			cpu_percent = psutil.cpu_percent(interval=0.3)
			mem = psutil.virtual_memory()
			memory_total_gb = round(mem.total / 1024**3, 2)
			memory_available_gb = round(mem.available / 1024**3, 2)
		
			content = {
				"cpu": cpu_percent,
				"memory_total": memory_total_gb,
				"memory_available": memory_available_gb
			}
		
			await websocket.send_json(content)
		
			await asyncio.sleep(1)
	except WebSocketDisconnect as e:
		logger.info("Пользователь отключился.")
