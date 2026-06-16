from pydantic import BaseModel


class TriggerSettings(BaseModel):
	cpu: int = 90
	memory: int = 90
	enabled: bool = True


class PriorityRequest(BaseModel):
	priority: str


class RunPrograms(BaseModel):
	command: str
