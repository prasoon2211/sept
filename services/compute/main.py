from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import logging
import sys
from io import StringIO
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sept Compute Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


class ExecuteCodeRequest(BaseModel):
    code: str
    language: str  # "python" or "sql"
    session_id: Optional[str] = None
    connection_id: Optional[str] = None  # For SQL queries


class ExecuteCodeResponse(BaseModel):
    success: bool
    outputs: List[Dict[str, Any]]
    error: Optional[str] = None
    session_id: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "compute"}


def execute_python_code(code: str) -> tuple[bool, List[Dict[str, Any]], Optional[str]]:
    """Execute Python code and capture stdout/stderr."""
    # Create string buffers to capture output
    stdout_buffer = StringIO()
    stderr_buffer = StringIO()

    # Save original stdout/stderr
    old_stdout = sys.stdout
    old_stderr = sys.stderr

    try:
        # Redirect stdout/stderr
        sys.stdout = stdout_buffer
        sys.stderr = stderr_buffer

        # Create a clean namespace for execution
        exec_globals = {"__name__": "__main__"}
        exec_locals = {}

        # Execute the code
        exec(code, exec_globals, exec_locals)

        # Get captured output
        stdout_content = stdout_buffer.getvalue()
        stderr_content = stderr_buffer.getvalue()

        outputs = []
        if stdout_content:
            outputs.append({"type": "text", "data": stdout_content})
        if stderr_content:
            outputs.append({"type": "text", "data": stderr_content})

        # If no output, add success message
        if not outputs:
            outputs.append({"type": "text", "data": "Code executed successfully (no output)"})

        return True, outputs, None

    except Exception as e:
        # Get the full traceback
        tb = traceback.format_exc()
        return False, [], tb

    finally:
        # Restore original stdout/stderr
        sys.stdout = old_stdout
        sys.stderr = old_stderr


@app.post("/execute", response_model=ExecuteCodeResponse)
async def execute_code(request: ExecuteCodeRequest):
    """
    Execute Python or SQL code.
    """
    try:
        if request.language.lower() == "python":
            success, outputs, error = execute_python_code(request.code)
            return ExecuteCodeResponse(
                success=success,
                outputs=outputs,
                error=error,
                session_id=request.session_id or "default"
            )
        elif request.language.lower() == "sql":
            # TODO: Implement SQL execution
            return ExecuteCodeResponse(
                success=True,
                outputs=[{"type": "text", "data": "SQL execution not yet implemented"}],
                session_id=request.session_id or "default"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    except Exception as e:
        logger.error(f"Execution error: {str(e)}")
        return ExecuteCodeResponse(
            success=False,
            outputs=[],
            error=str(e),
            session_id=request.session_id or "default"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8547)
