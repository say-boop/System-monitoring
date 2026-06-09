from datetime import datetime
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
			disk_percent REAL
		)
	''')

	conn.commit()
	conn.close()


def save_metrics(data: dict):
	conn = sqlite3.connect(DB_PATH)
	cursor = conn.cursor()

	timestamp = datetime.now().isoformat()
	disk_percent = data["disks"][0]["percent"] if data.get("disks") else 0
	
	cursor.execute('''
		INSERT INTO metrics (timestamp, cpu_percent, memory_percent, disk_percent) VALUES (?, ?, ?, ?)
	''', (timestamp, data["cpu_percent"], data["memory_percent"], disk_percent))

	conn.commit()
	conn.close()


def get_history(limit: int = 60) -> list:
	conn = sqlite3.connect(DB_PATH)
	conn.row_factory = sqlite3.Row
	cursor = conn.cursor()
	
	cursor.execute("SELECT timestamp, cpu_percent, memory_percent, disk_percent FROM metrics ORDER BY id DESC LIMIT ?", (limit,))

	rows = cursor.fetchall()

	conn.close()

	return [dict(row) for row in rows]


init_db()
