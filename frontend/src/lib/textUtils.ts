/**
 * Converts raw markdown string to clean plain text for copying to clipboard.
 * Removes markdown headings (#), bold/italic (*, _), bullet points, blockquotes, code fences, etc.
 */
export function stripMarkdown(markdown: string): string {
    if (!markdown) return '';

    return markdown
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove headers (e.g. ### Header -> Header)
        .replace(/^#{1,6}\s+/gm, '')
        // Remove horizontal rules
        .replace(/^(?:[-*_]\s*){3,}$/gm, '')
        // Remove emphasis (bold, italic, strikethrough)
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')
        // Remove blockquotes (e.g. > Quote -> Quote)
        .replace(/^\s*>\s+/gm, '')
        // Remove unordered list markers (*, -, +)
        .replace(/^\s*[-*+]\s+/gm, '')
        // Remove markdown links [Text](URL) -> Text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown images ![Alt](URL) -> Alt
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Collapse 3 or more empty lines into 2 empty lines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Copies clean text (stripped of markdown characters like #, *, etc.) to clipboard.
 */
export async function copyCleanText(text: string): Promise<boolean> {
    const cleanedText = stripMarkdown(text);
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(cleanedText);
            return true;
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = cleanedText;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (err) {
                console.error('Fallback copy failed', err);
                textArea.remove();
                return false;
            }
        }
    } catch (err) {
        console.error('Failed to copy clean text', err);
        return false;
    }
}
