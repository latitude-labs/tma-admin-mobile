/**
 * AST Parser utility using ts-morph
 * Provides simplified API for TypeScript/TSX file analysis
 */

import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import * as path from 'path';

/**
 * AST Parser for TypeScript/TSX files
 */
export class ASTParser {
  private project: Project;

  constructor(tsConfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        jsx: 1, // React JSX
        target: 99, // ESNext
        module: 99, // ESNext
      },
    });
  }

  /**
   * Load a source file for analysis
   */
  loadFile(filePath: string): SourceFile | undefined {
    try {
      const absolutePath = path.resolve(filePath);
      return this.project.addSourceFileAtPath(absolutePath);
    } catch (error) {
      console.error(`Error loading file ${filePath}:`, error);
      return undefined;
    }
  }

  /**
   * Get all descendant nodes of a specific kind
   */
  getNodesOfKind<T extends Node>(sourceFile: SourceFile, kind: SyntaxKind): T[] {
    return sourceFile.getDescendantsOfKind(kind) as T[];
  }

  /**
   * Find all function calls by name
   */
  findFunctionCalls(sourceFile: SourceFile, functionName: string): Node[] {
    const calls: Node[] = [];
    sourceFile.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        if (Node.isIdentifier(expression) && expression.getText() === functionName) {
          calls.push(node);
        }
      }
    });
    return calls;
  }

  /**
   * Find all React hooks usage (functions starting with 'use')
   */
  findHookCalls(sourceFile: SourceFile): Node[] {
    const hooks: Node[] = [];
    sourceFile.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        if (Node.isIdentifier(expression)) {
          const name = expression.getText();
          if (name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase()) {
            hooks.push(node);
          }
        }
      }
    });
    return hooks;
  }

  /**
   * Find all import declarations
   */
  findImports(sourceFile: SourceFile): Node[] {
    return this.getNodesOfKind(sourceFile, SyntaxKind.ImportDeclaration);
  }

  /**
   * Find all JSX elements
   */
  findJSXElements(sourceFile: SourceFile): Node[] {
    return this.getNodesOfKind(sourceFile, SyntaxKind.JsxElement);
  }

  /**
   * Find all variable declarations
   */
  findVariableDeclarations(sourceFile: SourceFile): Node[] {
    return this.getNodesOfKind(sourceFile, SyntaxKind.VariableDeclaration);
  }

  /**
   * Find all function declarations (including arrow functions)
   */
  findFunctionDeclarations(sourceFile: SourceFile): Node[] {
    const functions: Node[] = [];
    functions.push(...this.getNodesOfKind(sourceFile, SyntaxKind.FunctionDeclaration));
    functions.push(...this.getNodesOfKind(sourceFile, SyntaxKind.ArrowFunction));
    functions.push(...this.getNodesOfKind(sourceFile, SyntaxKind.FunctionExpression));
    return functions;
  }

  /**
   * Find all string literals matching a pattern (e.g., hex colors)
   */
  findStringLiterals(sourceFile: SourceFile, pattern?: RegExp): Node[] {
    const literals = this.getNodesOfKind(sourceFile, SyntaxKind.StringLiteral);
    if (pattern) {
      return literals.filter((node) => pattern.test(node.getText()));
    }
    return literals;
  }

  /**
   * Get line number for a node
   */
  getLineNumber(node: Node): number {
    return node.getStartLineNumber();
  }

  /**
   * Get line and column for a node
   */
  getPosition(node: Node): { line: number; column: number } {
    const sourceFile = node.getSourceFile();
    const start = node.getStart();
    const { line, column } = sourceFile.getLineAndColumnAtPos(start);
    return { line, column };
  }

  /**
   * Get code snippet around a node (for context)
   */
  getCodeSnippet(node: Node, linesBefore = 2, linesAfter = 2): string {
    const sourceFile = node.getSourceFile();
    const startLine = Math.max(1, node.getStartLineNumber() - linesBefore);
    const endLine = node.getEndLineNumber() + linesAfter;

    const fullText = sourceFile.getFullText();
    const lines = fullText.split('\n');

    return lines.slice(startLine - 1, endLine).join('\n');
  }

  /**
   * Check if a node is inside a specific parent type
   */
  isInsideNodeType(node: Node, parentKind: SyntaxKind): boolean {
    let current = node.getParent();
    while (current) {
      if (current.getKind() === parentKind) {
        return true;
      }
      current = current.getParent();
    }
    return false;
  }

  /**
   * Check if node is inside a loop (for, while, map, etc.)
   */
  isInsideLoop(node: Node): boolean {
    return (
      this.isInsideNodeType(node, SyntaxKind.ForStatement) ||
      this.isInsideNodeType(node, SyntaxKind.ForInStatement) ||
      this.isInsideNodeType(node, SyntaxKind.ForOfStatement) ||
      this.isInsideNodeType(node, SyntaxKind.WhileStatement) ||
      this.isInsideNodeType(node, SyntaxKind.DoStatement) ||
      this.isInsideMapCall(node)
    );
  }

  /**
   * Check if node is inside a .map() call
   */
  private isInsideMapCall(node: Node): boolean {
    let current = node.getParent();
    while (current) {
      if (Node.isCallExpression(current)) {
        const expression = current.getExpression();
        if (Node.isPropertyAccessExpression(expression)) {
          const methodName = expression.getName();
          if (methodName === 'map' || methodName === 'forEach' || methodName === 'filter') {
            return true;
          }
        }
      }
      current = current.getParent();
    }
    return false;
  }

  /**
   * Get total line count of a file
   */
  getLineCount(sourceFile: SourceFile): number {
    return sourceFile.getEndLineNumber();
  }

  /**
   * Remove file from project (cleanup)
   */
  removeFile(sourceFile: SourceFile): void {
    this.project.removeSourceFile(sourceFile);
  }
}
