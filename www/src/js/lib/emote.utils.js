/**
 * Detects if a message contains only emotes (emojis and/or custom emotes).
 * @param {string} message - The message to check
 * @param {string[]} acceptedEmoteWords - List of accepted words for custom emotes (e.g., ['test', 'smile'])
 * @returns {boolean} True if the message contains only emotes, false otherwise
 */
export function containsOnlyEmotes(message, acceptedEmoteWords = []) {
  const trimmed = message.trim();

  if (trimmed.length === 0) return false;

  const emojiPattern = /[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]/gu;

  const customEmotePattern = acceptedEmoteWords.length > 0
      ? new RegExp(`:(?:${acceptedEmoteWords.join('|')}):`, 'g')
      : null;

  let remaining = trimmed.replaceAll(emojiPattern, '');

  if (customEmotePattern) {
    remaining = remaining.replace(customEmotePattern, '');
  }

  remaining = remaining.replaceAll(/\s+/g, '');

  return remaining.length === 0;
}