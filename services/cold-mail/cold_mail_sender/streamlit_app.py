import os
import sys

# Ensure the root directory is in the Python path
root_dir = os.path.dirname(os.path.abspath(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Import and execute the UI application
import ui.app
