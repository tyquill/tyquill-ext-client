/**
 * Format a date string to relative time (Notion-style)
 * Examples:
 * - "Just now" (< 1 min)
 * - "2 minutes ago" (< 1 hour)
 * - "3 hours ago" (< 24 hours)
 * - "Yesterday at 3:24 PM" (< 48 hours)
 * - "Jan 15 at 2:30 PM" (older)
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Just now (< 1 min)
    if (diffMinutes < 1) {
        return 'Just now';
    }

    // Minutes ago (< 1 hour)
    if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Hours ago (< 24 hours)
    if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Yesterday at time (< 48 hours)
    if (diffDays === 1) {
        const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `Yesterday at ${timeStr}`;
    }

    // Full date with time (older than 48 hours)
    const monthStr = date.toLocaleString('en-US', { month: 'short' });
    const dayStr = date.getDate();
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return `${monthStr} ${dayStr} at ${timeStr}`;
}

/**
 * Calculate character count from content
 */
export function getCharacterCount(content: string | object): number {
    if (typeof content === 'string') {
        // Remove markdown syntax and count actual characters
        return content.replace(/[#*_`~\[\]\(\)]/g, '').trim().length;
    } else {
        // For JSON content, stringify and count
        return JSON.stringify(content).length;
    }
}
