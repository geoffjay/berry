import { describe, expect, test } from "bun:test";
import {
  handleRemember,
  handleRecall,
  handleForget,
  handleSearch,
  type RememberInput,
  type RecallInput,
  type ForgetInput,
  type SearchInput,
} from "./index";

describe("Tools index exports", () => {
  test("exports handleRemember function", () => {
    expect(typeof handleRemember).toBe("function");
  });

  test("exports handleRecall function", () => {
    expect(typeof handleRecall).toBe("function");
  });

  test("exports handleForget function", () => {
    expect(typeof handleForget).toBe("function");
  });

  test("exports handleSearch function", () => {
    expect(typeof handleSearch).toBe("function");
  });
});

describe("Type exports", () => {
  test("RememberInput type works", () => {
    const input: RememberInput = {
      content: "Test content",
      type: "information",
      tags: ["test"],
      createdBy: "user",
    };

    expect(input.content).toBe("Test content");
  });

  test("RecallInput type works", () => {
    const input: RecallInput = {
      id: "mem_123",
    };

    expect(input.id).toBe("mem_123");
  });

  test("ForgetInput type works", () => {
    const input: ForgetInput = {
      id: "mem_123",
    };

    expect(input.id).toBe("mem_123");
  });

  test("SearchInput type works", () => {
    const input: SearchInput = {
      query: "test query",
      type: "question",
      tags: ["important"],
      limit: 10,
      from: "2024-01-01",
      to: "2024-12-31",
    };

    expect(input.query).toBe("test query");
    expect(input.type).toBe("question");
  });
});
