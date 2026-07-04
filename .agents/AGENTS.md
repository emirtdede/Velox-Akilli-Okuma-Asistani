# Agent Rules for Velox Workspace

## Port Cleanup and Process Termination
- **Mandatory Port Cleanup**: Always ensure that any background processes or servers (e.g., Electron, Vite, Node.js) started during a task are cleanly terminated.
- **Port Conflict Resolution**: If ports `3000` or `24678` are left occupied, run `taskkill /f /im node.exe` on Windows to clean up all hanging Node.js processes before attempting to start a new command.
- **Background Processes**: Do not leave orphaned server processes running after completing a task or starting new processes.
