"""Compatibility entry point for the event cleaning utility."""
from pathlib import Path
import runpy
if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).parent / "scripts/clean_events.py"), run_name="__main__")
