#!/usr/bin/env tsx
/**
 * CSV export escaping tests (quoting + formula-injection guard). DB-free.
 *
 *   npm run test:csv-export
 */
import { escapeCsvCell, rowsToCsv } from "@/lib/export/csv";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function eq(actual: string, expected: string, label: string) {
  assert(actual === expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function testPlainAndQuoting() {
  eq(escapeCsvCell(null), "", "null");
  eq(escapeCsvCell(undefined), "", "undefined");
  eq(escapeCsvCell("Alice"), "Alice", "plain text");
  eq(escapeCsvCell(42), "42", "number");
  eq(escapeCsvCell("a,b"), '"a,b"', "comma quoted");
  eq(escapeCsvCell('say "hi"'), '"say ""hi"""', "quotes doubled");
  eq(escapeCsvCell("line1\nline2"), '"line1\nline2"', "newline quoted");
  eq(escapeCsvCell("a@example.com"), "a@example.com", "mid-string @ untouched");
  console.log("PASS plain values and quoting");
}

function testFormulaInjection() {
  eq(escapeCsvCell("=1+1"), "'=1+1", "= prefixed");
  eq(escapeCsvCell("+15555550100"), "'+15555550100", "+ prefixed");
  eq(escapeCsvCell("-2+3"), "'-2+3", "- prefixed");
  eq(escapeCsvCell("@SUM(A1:A2)"), "'@SUM(A1:A2)", "@ prefixed");
  eq(escapeCsvCell("\tcmd"), "'\tcmd", "tab prefixed");
  eq(escapeCsvCell("\rcmd"), "\"'\rcmd\"", "CR prefixed then quoted");
  eq(
    escapeCsvCell('=HYPERLINK("http://evil.example","x")'),
    `"'=HYPERLINK(""http://evil.example"",""x"")"`,
    "prefix applied before quoting",
  );
  eq(escapeCsvCell(-25), "-25", "negative number stays numeric");
  console.log("PASS formula-injection guard");
}

function testRowsToCsv() {
  const csv = rowsToCsv(["name", "note"], [["Bob", "=cmd|' /C calc'!A0"], ["Eve", null]]);
  eq(csv, "name,note\nBob,'=cmd|' /C calc'!A0\nEve,\n", "rowsToCsv");
  console.log("PASS rowsToCsv");
}

function main() {
  testPlainAndQuoting();
  testFormulaInjection();
  testRowsToCsv();
  console.log("CSV export checks passed");
}

main();
