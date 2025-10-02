"""
Python AST parser for extracting variable dependencies from code cells.
Used to build the dependency graph for reactive execution.
"""

import ast
from typing import Set, Tuple, List
import logging

logger = logging.getLogger(__name__)


class DependencyAnalyzer(ast.NodeVisitor):
    """
    Analyzes Python code to extract:
    - Variables that are read (dependencies)
    - Variables that are written (outputs)
    """

    def __init__(self):
        self.reads: Set[str] = set()
        self.writes: Set[str] = set()
        self.current_scope_writes: Set[str] = set()
        self.in_assignment = False

    def visit_Name(self, node: ast.Name):
        """Visit variable name nodes."""
        if isinstance(node.ctx, ast.Store):
            # Variable is being written
            self.writes.add(node.id)
            self.current_scope_writes.add(node.id)
        elif isinstance(node.ctx, ast.Load):
            # Variable is being read
            # Only count as dependency if not defined in this cell
            if node.id not in self.current_scope_writes:
                self.reads.add(node.id)
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        """Visit function definitions."""
        # Function name is a write
        self.writes.add(node.name)
        self.current_scope_writes.add(node.name)

        # Visit function body but track local scope
        old_scope = self.current_scope_writes.copy()

        # Function parameters are local to function
        for arg in node.args.args:
            self.current_scope_writes.add(arg.arg)

        # Visit function body
        for stmt in node.body:
            self.visit(stmt)

        # Restore outer scope
        self.current_scope_writes = old_scope

    def visit_Import(self, node: ast.Import):
        """Visit import statements."""
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name.split('.')[0]
            self.writes.add(name)
            self.current_scope_writes.add(name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        """Visit from...import statements."""
        for alias in node.names:
            if alias.name == '*':
                # Can't statically determine what's imported
                # Mark as a special dependency
                self.reads.add('__import_star__')
            else:
                name = alias.asname if alias.asname else alias.name
                self.writes.add(name)
                self.current_scope_writes.add(name)
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute):
        """Visit attribute access (e.g., df.column)."""
        # Only track the base variable, not the attribute
        if isinstance(node.value, ast.Name):
            if isinstance(node.ctx, ast.Load):
                if node.value.id not in self.current_scope_writes:
                    self.reads.add(node.value.id)
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        """Visit assignment statements."""
        # Visit RHS first (reads)
        self.visit(node.value)

        # Then visit LHS (writes)
        for target in node.targets:
            self.visit(target)

    def visit_AugAssign(self, node: ast.AugAssign):
        """Visit augmented assignment (+=, -=, etc)."""
        # Augmented assignment both reads and writes
        if isinstance(node.target, ast.Name):
            if node.target.id not in self.current_scope_writes:
                self.reads.add(node.target.id)

        self.visit(node.value)
        self.visit(node.target)


def analyze_dependencies(code: str) -> Tuple[List[str], List[str], str]:
    """
    Analyze Python code to extract variable dependencies.

    Returns:
        (reads, writes, error) tuple
        - reads: List of variable names that are read (dependencies)
        - writes: List of variable names that are written (outputs)
        - error: Error message if parsing failed, None otherwise
    """
    try:
        tree = ast.parse(code)
        analyzer = DependencyAnalyzer()
        analyzer.visit(tree)

        # Filter out built-ins and common libraries
        builtins = {
            'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict',
            'set', 'tuple', 'bool', 'type', 'enumerate', 'zip', 'map', 'filter',
            'sum', 'min', 'max', 'abs', 'round', 'sorted', 'reversed',
            'True', 'False', 'None', '__import_star__'
        }

        reads = sorted([r for r in analyzer.reads if r not in builtins])
        writes = sorted(list(analyzer.writes))

        logger.info(f"Analyzed dependencies - Reads: {reads}, Writes: {writes}")
        return reads, writes, None

    except SyntaxError as e:
        error = f"Syntax error at line {e.lineno}: {e.msg}"
        logger.warning(f"Failed to analyze dependencies: {error}")
        return [], [], error
    except Exception as e:
        error = f"Failed to analyze dependencies: {str(e)}"
        logger.error(error)
        return [], [], error


def test_dependency_analyzer():
    """Test the dependency analyzer with various code samples."""

    test_cases = [
        # Simple variable assignment
        ("x = 5", [], ["x"]),

        # Variable dependency
        ("y = x + 1", ["x"], ["y"]),

        # Multiple dependencies
        ("z = x + y", ["x", "y"], ["z"]),

        # Function definition
        ("def foo(a):\n    return a + 1", [], ["foo"]),

        # Import statement
        ("import pandas as pd", [], ["pd"]),

        # DataFrame operations
        ("df2 = df1.head(10)", ["df1"], ["df2"]),

        # Augmented assignment
        ("x += 5", ["x"], ["x"]),

        # Local variable (no dependency)
        ("x = 5\ny = x + 1", [], ["x", "y"]),

        # Complex case
        ("""
import pandas as pd
df = pd.read_csv('data.csv')
result = df[df['col'] > threshold]
""", ["threshold"], ["df", "pd", "result"]),
    ]

    for code, expected_reads, expected_writes in test_cases:
        reads, writes, error = analyze_dependencies(code)
        assert error is None, f"Unexpected error: {error}"
        assert reads == expected_reads, f"Expected reads {expected_reads}, got {reads}"
        assert writes == expected_writes, f"Expected writes {expected_writes}, got {writes}"
        print(f"✓ Test passed: {code[:50]}")

    print("\n✓ All tests passed!")


if __name__ == "__main__":
    test_dependency_analyzer()
