export function parseFileUrls(urlField: string | null | undefined): string[] {
    if (!urlField) return [];
    const trimmed = urlField.trim();
    if (trimmed.startsWith("[")) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return [trimmed];
        }
    }
    return [trimmed];
}
