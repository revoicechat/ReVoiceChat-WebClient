import {describe, expect, test} from "vitest";
import {containsOnlyEmotes} from "./emote.utils.js";

describe('containsOnlyEmotes', () => {
  const acceptedWords = ['test', 'smile', 'heart', 'fire'];

  test('only UTF-8 emojis', () => {
    expect(containsOnlyEmotes('😁✅🥜', acceptedWords)).toBe(true);
  });

  test('only custom emote', () => {
    expect(containsOnlyEmotes(':test: :smile:', acceptedWords)).toBe(true);
  });

  test('UTF-8 emojis and custom emote', () => {
    expect(containsOnlyEmotes('😁 :test: ✅', acceptedWords)).toBe(true);
  });

  test('whitespace is trimmed', () => {
    expect(containsOnlyEmotes('   😁   ', acceptedWords)).toBe(true);
  });

  test('empty', () => {
    expect(containsOnlyEmotes('', acceptedWords)).toBe(false);
  });

  test('sentence with emoji', () => {
    expect(containsOnlyEmotes('Hello 😁', acceptedWords)).toBe(false);
  });

  test('sentence with custom emote', () => {
    expect(containsOnlyEmotes(':test: hello', acceptedWords)).toBe(false);
  });

  test('invalid custom emote', () => {
    expect(containsOnlyEmotes(':invalid:', acceptedWords)).toBe(false);
  });

})
