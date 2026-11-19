#!/usr/bin/env python3
"""Legacy entry point: run the maintained Android patch script."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parent / "scripts" / "patch-android.py"), run_name="__main__")
