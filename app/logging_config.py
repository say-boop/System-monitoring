import logging
import sys


def setup_logging():
	log_format = "%(acstime)s - %(name)s - %(levelname)s - %(message)s"
	date_format = "%Y-%m-%d %H:%M:%S"

	logging.basicConfig(
		level=logging.INFO,
		format=log_format,
		datefmt=date_format,
		handlers=[
			logging.StreamHandler(sys.stdout),
			logging.FileHandler("app/app.log", encoding="utf-8")
		]
	)
