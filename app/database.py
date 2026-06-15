from datetime import datetime, timedelta
import sqlite3


DB_PATH = "metrics.db"


def init_db():
	conn = sqlite3.connect(DB_PATH)
	cursor = conn.cursor()

	cursor.execute('''
		CREATE TABLE IF NOT EXISTS metrics (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			timestamp TEXT,
			cpu_percent REAL,
			memory_percent REAL,
			disk_percent REAL,
			swap_percent REAL
		)
	''')

	conn.commit()
	conn.close()


def save_metrics(data: dict):
	conn = sqlite3.connect(DB_PATH)
	cursor = conn.cursor()

	timestamp = datetime.now().isoformat()
	disk_percent = data["disks"][0]["percent"] if data.get("disks") else 0
	swap_percent = data.get("swap", {}).get("percent", 0)
	
	cursor.execute('''
		INSERT INTO metrics (timestamp, cpu_percent, memory_percent, disk_percent, swap_percent) VALUES (?, ?, ?, ?, ?)
	''', (timestamp, data["cpu_percent"], data["memory_percent"], disk_percent, swap_percent))

	conn.commit()
	conn.close()


def get_history(limit: int = 60) -> list:
	conn = sqlite3.connect(DB_PATH)
	conn.row_factory = sqlite3.Row
	cursor = conn.cursor()
	
	cursor.execute("SELECT timestamp, cpu_percent, memory_percent, disk_percent, swap_percent FROM metrics ORDER BY id DESC LIMIT ?", (limit,))

	rows = cursor.fetchall()

	conn.close()

	return [dict(row) for row in rows]


def cleanup_old_records():
	try:
		conn = sqlite3.connect(DB_PATH)
		cursor = conn.cursor()
		cutoff = (datetime.now() - timedelta(days=7)).isoformat()
		cursor.execute("DELETE FROM metrics WHERE timestamp < ?", (cutoff,))
		deleted = cursor.rowcount
		conn.commit()
		conn.close()
		if deleted > 0:
			print(f"Cleaned up {deleted} old records")
	except Exception as e:
		print("Cleanup error:", e)


def get_stats(range: str = "hour"):
	conn = sqlite3.connect(DB_PATH)
	cursor = conn.cursor()
	now = datetime.now()

	if range == "day":
		cutoff = now - timedelta(days=1)
	else:
		cutoff = now - timedelta(hours=1)

	cutoff_str = cutoff.isoformat()

	cursor.execute("""
		SELECT 
  		AVG(cpu_percent), MAX(cpu_percent), MIN(cpu_percent),
  		AVG(memory_percent), MAX(memory_percent), MIN(memory_percent),
  		AVG(disk_percent), MAX(disk_percent), MIN(disk_percent),
  		AVG(swap_percent), MAX(swap_percent), MIN(swap_percent)
		FROM metrics WHERE timestamp >= ?
	""", (cutoff_str,))

	row = cursor.fetchone()
	conn.close()

	if not row or row[0] is None:
		return {}

	return {
		"cpu": {
			"avg": round(row[0], 1),
			"max": round(row[1], 1),
			"min": round(row[2], 1)
		},
		"memory": {
			"avg": round(row[3], 1),
			"max": round(row[4], 1),
			"min": round(row[5], 1)
		},
		"disk": {
			"avg": round(row[6], 1),
			"max": round(row[7], 1),
			"min": round(row[8], 1)
		},
		"swap": {
			"avg": round(row[9], 1) if row[9] else 0,
			"max": round(row[10], 1) if row[10] else 0,
			"min": round(row[11], 1) if row[11] else 0
		}
	}


init_db()
