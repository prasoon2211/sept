import asyncio
import logging
from typing import Dict, Any, List, Optional
from jupyter_client import KernelManager
from queue import Empty
import uuid

logger = logging.getLogger(__name__)


class NotebookKernelManager:
    """Manages Jupyter kernels for notebook sessions."""

    def __init__(self):
        self.kernels: Dict[str, KernelManager] = {}
        self.kernel_sessions: Dict[str, str] = {}  # session_id -> kernel_id mapping

    def get_or_create_kernel(self, session_id: str) -> KernelManager:
        """Get existing kernel for session or create a new one."""
        if session_id in self.kernel_sessions:
            kernel_id = self.kernel_sessions[session_id]
            if kernel_id in self.kernels:
                km = self.kernels[kernel_id]
                # Check if kernel is still alive
                if km.is_alive():
                    logger.info(f"Reusing existing kernel for session {session_id}")
                    return km
                else:
                    # Kernel died, clean up and create new one
                    logger.warning(f"Kernel for session {session_id} died, creating new one")
                    self._cleanup_kernel(kernel_id, session_id)

        # Create new kernel
        return self._create_kernel(session_id)

    def _create_kernel(self, session_id: str) -> KernelManager:
        """Create a new Jupyter kernel."""
        kernel_id = str(uuid.uuid4())
        logger.info(f"Creating new kernel {kernel_id} for session {session_id}")

        km = KernelManager()
        km.start_kernel()

        self.kernels[kernel_id] = km
        self.kernel_sessions[session_id] = kernel_id

        return km

    def _cleanup_kernel(self, kernel_id: str, session_id: str):
        """Clean up a dead kernel."""
        if kernel_id in self.kernels:
            del self.kernels[kernel_id]
        if session_id in self.kernel_sessions:
            del self.kernel_sessions[session_id]

    async def execute_code(self, session_id: str, code: str) -> tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """Execute code in a kernel and return results."""
        km = self.get_or_create_kernel(session_id)
        kc = km.client()

        if not kc.is_alive():
            kc.start_channels()
            # Wait for kernel to be ready
            await asyncio.sleep(0.1)

        try:
            # Execute the code
            msg_id = kc.execute(code)

            outputs = []
            error_message = None

            # Collect outputs with timeout
            timeout = 30  # 30 seconds timeout
            start_time = asyncio.get_event_loop().time()

            while True:
                if asyncio.get_event_loop().time() - start_time > timeout:
                    error_message = "Execution timeout (30s)"
                    break

                try:
                    # Get messages from IOPub channel
                    msg = kc.get_iopub_msg(timeout=0.1)

                    if msg['parent_header'].get('msg_id') != msg_id:
                        continue

                    msg_type = msg['header']['msg_type']
                    content = msg['content']

                    if msg_type == 'stream':
                        # stdout or stderr
                        stream_name = content['name']
                        text = content['text']
                        outputs.append({
                            'type': 'stream',
                            'data': text,
                        })

                    elif msg_type == 'execute_result':
                        # Result of expression
                        data = content.get('data', {})
                        if 'text/plain' in data:
                            outputs.append({
                                'type': 'execute_result',
                                'data': data['text/plain'],
                            })

                    elif msg_type == 'display_data':
                        # Display output (plots, images, etc)
                        data = content.get('data', {})
                        if 'text/plain' in data:
                            outputs.append({
                                'type': 'display_data',
                                'data': data['text/plain'],
                            })

                    elif msg_type == 'error':
                        # Error occurred
                        traceback = content.get('traceback', [])
                        error_message = '\n'.join(traceback)
                        outputs.append({
                            'type': 'error',
                            'data': error_message,
                        })

                    elif msg_type == 'status':
                        # Execution status
                        if content['execution_state'] == 'idle':
                            # Execution complete
                            break

                except Empty:
                    # No message available, continue waiting
                    await asyncio.sleep(0.01)
                    continue

            # If no outputs and no error, add success message
            if not outputs and not error_message:
                outputs.append({
                    'type': 'text',
                    'data': 'Code executed successfully (no output)',
                })

            success = error_message is None
            return success, outputs, error_message

        except Exception as e:
            logger.error(f"Error executing code: {str(e)}")
            return False, [], str(e)

    def shutdown_kernel(self, session_id: str):
        """Shutdown a kernel for a session."""
        if session_id in self.kernel_sessions:
            kernel_id = self.kernel_sessions[session_id]
            if kernel_id in self.kernels:
                km = self.kernels[kernel_id]
                logger.info(f"Shutting down kernel {kernel_id} for session {session_id}")
                km.shutdown_kernel()
                del self.kernels[kernel_id]
            del self.kernel_sessions[session_id]

    def restart_kernel(self, session_id: str):
        """Restart a kernel for a session."""
        logger.info(f"Restarting kernel for session {session_id}")
        self.shutdown_kernel(session_id)
        # Next execute will create a new kernel

    def shutdown_all(self):
        """Shutdown all kernels."""
        logger.info("Shutting down all kernels")
        for kernel_id, km in list(self.kernels.items()):
            try:
                km.shutdown_kernel()
            except Exception as e:
                logger.error(f"Error shutting down kernel {kernel_id}: {e}")
        self.kernels.clear()
        self.kernel_sessions.clear()


# Global kernel manager instance
kernel_manager = NotebookKernelManager()
