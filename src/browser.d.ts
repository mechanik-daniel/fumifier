/*
Copyright (c) 2025 Outburn Ltd.
Project: Fumifier (part of the FUME open-source initiative)

License: See the LICENSE file included with this package for the terms that apply to this distribution.
*/

/**
 * Browser-friendly FUME parser entry point type definitions
 */

/**
 * Token information for syntax highlighting and editor features
 */
export interface TokenInfo {
  type: string;
  value: string | number;
  start: number;
  end: number;
  line: number;
}

/**
 * Parse error information
 */
export interface ParseError {
  code: string;
  message?: string;
  position: number;
  start: number;
  line: number;
  token?: string;
  value?: string;
  remaining?: any[];
  type?: string;
  stack?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ParseError[];
}

/**
 * Abstract Syntax Tree node (simplified interface)
 */
export interface ASTNode {
  type: string;
  value?: any;
  position?: number;
  start?: number;
  line?: number;
  errors?: ParseError[];
  [key: string]: any;
}

/**
 * Parse a FUME expression into an Abstract Syntax Tree (AST)
 * @param expression - The FUME expression string to parse
 * @param recover - Whether to attempt error recovery during parsing (default: false)
 * @returns The parsed AST with syntax structure and error information
 * @throws Syntax errors when recover=false, or returns error info in AST when recover=true
 */
export function parse(expression: string, recover?: boolean): ASTNode;

/**
 * Validate a FUME expression for syntax correctness
 * @param expression - The FUME expression string to validate
 * @returns Validation result with isValid flag and errors array
 */
export function validate(expression: string): ValidationResult;

/**
 * Get information about token positions and types in an expression
 * Useful for syntax highlighting and editor features
 * @param expression - The FUME expression string to tokenize
 * @returns Array of token information objects
 */
export function tokenize(expression: string): TokenInfo[];

/**
 * Core parser function - advanced usage
 * @param source - Source expression to parse
 * @param recover - Whether to use recovery mode
 * @returns Parsed AST
 */
export function parser(source: string, recover?: boolean): ASTNode;

/**
 * Populate error messages for error codes
 * @param error - Error object to populate
 */
export function populateMessage(error: ParseError): void;

/**
 * Default export containing all functions
 */
declare const _default: {
  parse: typeof parse;
  validate: typeof validate;
  tokenize: typeof tokenize;
  parser: typeof parser;
  populateMessage: typeof populateMessage;
};

export default _default;